'use strict';

const crypto   = require('crypto');
const User     = require('./User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('./jwt');
const AppError = require('./AppError');
const logger   = require('./logger');
const {
  sendWelcomeEmail,
  sendAdminNewUserNotification,
  sendPasswordResetEmail,
  sendAccountLockedEmail,
} = require('./email.service');

// ─── Helper: monta resposta com tokens ───────────────────────────────────────
function sendTokens(res, user, statusCode = 200) {
  const accessToken  = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge:   30 * 24 * 60 * 60 * 1000,
  });

  return res.status(statusCode).json({
    success: true,
    accessToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    user: {
      id:       user._id,
      nickname: user.nickname,
      email:    user.email,
      platform: user.platform,
      role:     user.role,
      tokens:   user.tokens,
      liveNick: user.liveNick,
      activePlan: user.activePlan,
    },
  });
}

// ─── POST /auth/register ──────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const { nickname, email, password, platform, channelUrl, liveNick } = req.body;

    const user = await User.create({
      nickname, email, password, platform,
      channelUrl: channelUrl || undefined,
      liveNick:   liveNick   || undefined,
    });

    // E-mail de boas-vindas ao usuário (async — não bloqueia)
    sendWelcomeEmail({ to: user.email, nickname: user.nickname, platform: user.platform })
      .catch(err => logger.error('[Email] Boas-vindas falhou:', err.message));

    // Notificação ao admin — SEMPRE envia para blowexposed@gmail.com
    sendAdminNewUserNotification({ nickname: user.nickname, email: user.email, platform: user.platform })
      .catch(err => logger.error('[Email] Notificação admin falhou:', err.message));

    logger.info(`Novo usuário: ${user.email} [${user.platform}]`);

    return sendTokens(res, user, 201);
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User
      .findOne({ email })
      .select('+password +loginAttempts +lockUntil +isActive');

    const INVALID_MSG = 'E-mail ou senha inválidos.';
    if (!user)          return next(new AppError(INVALID_MSG, 401));
    if (!user.isActive) return next(new AppError('Conta suspensa.', 403));
    if (user.isLocked)  return next(new AppError('Conta bloqueada por muitas tentativas. Aguarde 30 min.', 423));

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      await user.incrementLoginAttempts();
      // Notifica se atingiu o limite
      if ((user.loginAttempts + 1) >= 5) {
        sendAccountLockedEmail({ to: user.email, nickname: user.nickname }).catch(()=>{});
      }
      logger.warn(`Login falhou: ${email} IP:${req.ip}`);
      return next(new AppError(INVALID_MSG, 401));
    }

    await user.resetLoginAttempts();
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date(), lastLoginIp: req.ip });

    logger.info(`Login OK: ${user.email}`);
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
    try { decoded = verifyRefreshToken(token); }
    catch { return next(new AppError('Refresh token inválido ou expirado.', 401)); }

    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) return next(new AppError('Usuário não encontrado.', 401));

    return res.json({
      success:     true,
      accessToken: generateAccessToken(user._id, user.role),
      expiresIn:   process.env.JWT_EXPIRES_IN || '7d',
    });
  } catch(err) { next(err); }
}

// ─── POST /auth/logout ────────────────────────────────────────────────────────
function logout(req, res) {
  res.clearCookie('refreshToken', { httpOnly:true, secure: process.env.NODE_ENV==='production', sameSite:'Strict' });
  return res.json({ success:true, message:'Logout realizado.' });
}

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const SUCCESS = 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.';
    const user = await User.findOne({ email });
    if (!user) return res.json({ success:true, message: SUCCESS });

    const resetToken  = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken:   hashedToken,
      passwordResetExpires: Date.now() + 10 * 60 * 1000,
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'https://comunidadeviewers.vercel.app'}/reset-password/${resetToken}`;
    sendPasswordResetEmail({ to: user.email, nickname: user.nickname, resetUrl })
      .catch(err => logger.error('[Email] Reset senha falhou:', err.message));

    return res.json({ success:true, message: SUCCESS });
  } catch(err) { next(err); }
}

// ─── POST /auth/reset-password/:token ────────────────────────────────────────
async function resetPassword(req, res, next) {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) return next(new AppError('Token inválido ou expirado.', 400));

    user.password             = req.body.password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`Senha redefinida: ${user.email}`);
    return sendTokens(res, user);
  } catch(err) { next(err); }
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword };
