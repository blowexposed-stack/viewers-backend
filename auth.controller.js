'use strict';

const crypto = require('crypto');
const User   = require('./User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('./jwt');
const AppError = require('./AppError');
const logger   = require('./logger');
const {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAccountLockedEmail,
} = require('./email.service');

// ─── Helper: monta resposta com tokens ───────────────────────────────────────
function sendTokens(res, user, statusCode = 200) {
  const accessToken  = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Refresh token em cookie httpOnly (mais seguro que localStorage)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
  });

  return res.status(statusCode).json({
    success: true,
    accessToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    user: {
      id: user._id,
      nickname: user.nickname,
      email: user.email,
      platform: user.platform,
      role: user.role,
      tokens: user.tokens,
    },
  });
}

// ─── POST /auth/register ──────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const { nickname, email, password, platform, channelUrl } = req.body;

    const user = await User.create({ nickname, email, password, platform, channelUrl });

    // E-mail de boas-vindas (assíncrono, não bloqueia a resposta)
    sendWelcomeEmail({ to: user.email, nickname: user.nickname })
      .catch((err) => logger.error('Falha ao enviar e-mail de boas-vindas:', err));

    logger.info(`Novo usuário registrado: ${user.email} [${user.platform}]`);

    return sendTokens(res, user, 201);
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Busca usuário com senha (select: false por padrão no model)
    const user = await User
      .findOne({ email })
      .select('+password +loginAttempts +lockUntil +isActive');

    // Resposta genérica — nunca revele se o e-mail existe
    const INVALID_MSG = 'E-mail ou senha inválidos.';

    if (!user) return next(new AppError(INVALID_MSG, 401));
    if (!user.isActive) return next(new AppError('Conta suspensa.', 403));

    // Conta bloqueada?
    if (user.isLocked) {
      return next(new AppError('Conta temporariamente bloqueada por muitas tentativas. Tente em 30 minutos.', 423));
    }

    // Verifica senha
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      await user.incrementLoginAttempts();

      // Avisa por e-mail se a conta acabou de ser bloqueada
      const refreshed = await User.findById(user._id).select('+lockUntil +loginAttempts');
      if (refreshed?.isLocked) {
        sendAccountLockedEmail({ to: user.email, nickname: user.nickname, ip: req.ip })
          .catch((err) => logger.error('Falha ao enviar e-mail de bloqueio:', err));
      }

      logger.warn(`Tentativa de login falhou: ${email} IP:${req.ip}`);
      return next(new AppError(INVALID_MSG, 401));
    }

    // Login OK — reseta tentativas e atualiza auditoria
    await user.resetLoginAttempts();
    await User.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      lastLoginIp: req.ip,
    });

    logger.info(`Login bem-sucedido: ${user.email}`);

    return sendTokens(res, user);
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return next(new AppError('Refresh token não fornecido.', 401));

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return next(new AppError('Refresh token inválido ou expirado.', 401));
    }

    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) return next(new AppError('Usuário não encontrado.', 401));

    const accessToken = generateAccessToken(user._id, user.role);

    return res.json({
      success: true,
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/logout ────────────────────────────────────────────────────────
function logout(req, res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });

  return res.json({ success: true, message: 'Logout realizado com sucesso.' });
}

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Responde sempre com sucesso — não revela se o e-mail existe
    const SUCCESS_MSG = 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.';

    if (!user) return res.json({ success: true, message: SUCCESS_MSG });

    // Gera token seguro
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: Date.now() + 10 * 60 * 1000, // 10 min
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'https://comunidadeviewrs.com.br'}/reset-password/${resetToken}`;

    sendPasswordResetEmail({ to: user.email, nickname: user.nickname, resetUrl })
      .catch((err) => logger.error('Falha ao enviar e-mail de reset:', err));

    logger.info(`Token de reset gerado para: ${email}`);

    return res.json({ success: true, message: SUCCESS_MSG });
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/reset-password/:token ────────────────────────────────────────
async function resetPassword(req, res, next) {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) return next(new AppError('Token inválido ou expirado.', 400));

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`Senha redefinida para usuário: ${user.email}`);

    return sendTokens(res, user);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword };
