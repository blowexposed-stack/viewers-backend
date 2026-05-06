'use strict';

const crypto = require('crypto');
const User = require('./User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('./jwt');
const AppError = require('./AppError');
const logger = require('./logger');
const {
  sendWelcomeEmail,
  sendAdminNewUserNotification,
  sendPasswordResetEmail,
  sendAccountLockedEmail,
} = require('./email.service');

const WELCOME_TOKENS = 350;

/**
 * Filtra os dados do usuário para não enviar lixo ou dados sensíveis ao front
 */
const formatUserResponse = (user) => ({
  id: user._id,
  nickname: user.nickname,
  email: user.email,
  platform: user.platform,
  role: user.role,
  tokens: user.tokens,
  liveNick: user.liveNick,
  activePlan: user.activePlan,
});

const sendTokens = (res, user, statusCode = 200) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Configuração estratégica de Cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true, 
    sameSite: 'None',
    path: '/', // Garante que o cookie esteja disponível em todas as rotas
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
  });

  return res.status(statusCode).json({
    success: true,
    accessToken,
    // Opcional: enviar o tempo de expiração real do AccessToken
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '1h',
    user: formatUserResponse(user),
  });
};

const authController = {
  async register(req, res, next) {
    try {
      const { nickname, email, password, platform, channelUrl, liveNick } = req.body;

      // Verificação preventiva (opcional, o DB já faz, mas poupa esforço do banco)
      const existingUser = await User.findOne({ $or: [{ email }, { nickname }] });
      if (existingUser) {
        return next(new AppError('E-mail ou Nickname já cadastrados.', 400));
      }

      const user = await User.create({
        nickname, email, password, platform,
        channelUrl: channelUrl || undefined,
        liveNick: liveNick || undefined,
        tokens: WELCOME_TOKENS,
        totalTokensEarned: WELCOME_TOKENS,
      });

      // Background tasks
      sendWelcomeEmail({ to: user.email, nickname: user.nickname, platform: user.platform, welcomeTokens: WELCOME_TOKENS }).catch(logger.error);
      sendAdminNewUserNotification({ nickname: user.nickname, email: user.email, platform: user.platform }).catch(logger.error);

      logger.info(`[Auth] Novo registro: ${user.email}`);
      return sendTokens(res, user, 201);
    } catch (err) { next(err); }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil +isActive');
      
      if (!user || !(await user.comparePassword(password))) {
        if (user) {
          await user.incrementLoginAttempts();
          if (user.loginAttempts >= 5) {
            sendAccountLockedEmail({ to: user.email, nickname: user.nickname }).catch(() => {});
          }
        }
        return next(new AppError('E-mail ou senha inválidos.', 401));
      }

      if (!user.isActive) return next(new AppError('Conta suspensa.', 403));
      if (user.isLocked) return next(new AppError('Conta bloqueada temporariamente.', 423));

      // Atualizações de login em background para não travar a resposta
      user.resetLoginAttempts().catch(logger.error);
      User.findByIdAndUpdate(user._id, { lastLogin: new Date(), lastLoginIp: req.ip }).catch(logger.error);

      return sendTokens(res, user);
    } catch (err) { next(err); }
  },

  async refresh(req, res, next) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) return next(new AppError('Sessão expirada.', 401));

      const decoded = verifyRefreshToken(token);
      const user = await User.findById(decoded.sub);

      if (!user || !user.isActive) return next(new AppError('Acesso negado.', 401));

      // Retorna apenas o novo AccessToken
      return res.json({ 
        success: true, 
        accessToken: generateAccessToken(user._id, user.role),
        user: formatUserResponse(user) // Útil para atualizar dados no Front-end
      });
    } catch (err) { 
      res.clearCookie('refreshToken'); // Limpa cookie se o refresh for inválido
      return next(new AppError('Sessão inválida. Faça login novamente.', 401)); 
    }
  },

  logout(req, res) {
    res.clearCookie('refreshToken', { 
      httpOnly: true, 
      secure: true, 
      sameSite: 'None',
      path: '/' 
    });
    return res.json({ success: true, message: 'Até logo!' });
  },

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      
      // Resposta genérica por segurança (evita enumeração de usuários)
      const successMsg = 'Instruções enviadas para o e-mail cadastrado.';
      if (!user) return res.json({ success: true, message: successMsg });

      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      await User.findByIdAndUpdate(user._id, {
        passwordResetToken: hashedToken,
        passwordResetExpires: Date.now() + 15 * 60 * 1000, // 15 min
      });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      sendPasswordResetEmail({ to: user.email, nickname: user.nickname, resetUrl }).catch(logger.error);
      
      return res.json({ success: true, message: successMsg });
    } catch (err) { next(err); }
  },

  async resetPassword(req, res, next) {
    try {
      const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
      const user = await User.findOne({ 
        passwordResetToken: hashed, 
        passwordResetExpires: { $gt: Date.now() } 
      });

      if (!user) return next(new AppError('Token inválido ou expirado.', 400));

      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      logger.info(`[Auth] Senha resetada: ${user.email}`);
      return sendTokens(res, user);
    } catch (err) { next(err); }
  }
};

module.exports = authController;
