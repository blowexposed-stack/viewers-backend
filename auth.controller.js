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

const WELCOME_TOKENS = 350; // tokens de boas-vindas

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
    success: true, accessToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    user: {
      id: user._id, nickname: user.nickname, email: user.email,
      platform: user.platform, role: user.role, tokens: user.tokens,
      liveNick: user.liveNick, activePlan: user.activePlan,
    },
  });
}

async function register(req, res, next) {
  try {
    const { nickname, email, password, platform, channelUrl, liveNick } = req.body;

    // Cria usuário JÁ com 350 tokens de boas-vindas
    const user = await User.create({
      nickname, email, password, platform,
      channelUrl: channelUrl || undefined,
      liveNick:   liveNick   || undefined,
      tokens:           WELCOME_TOKENS,
      totalTokensEarned: WELCOME_TOKENS,
    });

    // Emails async
    sendWelcomeEmail({ to: user.email, nickname: user.nickname, platform: user.platform, welcomeTokens: WELCOME_TOKENS })
      .catch(err => logger.error('[Email] Boas-vindas:', err.message));
    sendAdminNewUserNotification({ nickname: user.nickname, email: user.email, platform: user.platform })
      .catch(err => logger.error('[Email] Admin notif:', err.message));

    logger.info(`Novo usuário: ${user.email} [${user.platform}] +${WELCOME_TOKENS} tokens`);
    return sendTokens(res, user, 201);
  } catch(err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email })
      .select('+password +loginAttempts +lockUntil +isActive');
    const INVALID = 'E-mail ou senha inválidos.';
    if (!user)          return next(new AppError(INVALID, 401));
    if (!user.isActive) return next(new AppError('Conta suspensa.', 403));
    if (user.isLocked)  return next(new AppError('Conta bloqueada. Aguarde 30 min.', 423));
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      await user.incrementLoginAttempts();
      if ((user.loginAttempts + 1) >= 5)
        sendAccountLockedEmail({ to: user.email, nickname: user.nickname }).catch(()=>{});
      return next(new AppError(INVALID, 401));
    }
    await user.resetLoginAttempts();
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date(), lastLoginIp: req.ip });
    return sendTokens(res, user);
  } catch(err) { next(err); }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return next(new AppError('Refresh token não fornecido.', 401));
    let decoded;
    try { decoded = verifyRefreshToken(token); }
    catch { return next(new AppError('Token inválido.', 401)); }
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) return next(new AppError('Usuário não encontrado.', 401));
    return res.json({ success: true, accessToken: generateAccessToken(user._id, user.role), expiresIn: '7d' });
  } catch(err) { next(err); }
}

function logout(req, res) {
  res.clearCookie('refreshToken', { httpOnly:true, secure: process.env.NODE_ENV==='production', sameSite:'Strict' });
  return res.json({ success:true });
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const MSG = 'Se este e-mail estiver cadastrado, você receberá as instruções.';
    const user = await User.findOne({ email });
    if (!user) return res.json({ success:true, message: MSG });
    const resetToken = crypto.randomBytes(32).toString('hex');
    await User.findByIdAndUpdate(user._id, {
      passwordResetToken:   crypto.createHash('sha256').update(resetToken).digest('hex'),
      passwordResetExpires: Date.now() + 10 * 60 * 1000,
    });
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    sendPasswordResetEmail({ to: user.email, nickname: user.nickname, resetUrl }).catch(()=>{});
    return res.json({ success:true, message: MSG });
  } catch(err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashed, passwordResetExpires: { $gt: Date.now() } })
      .select('+passwordResetToken +passwordResetExpires');
    if (!user) return next(new AppError('Token inválido ou expirado.', 400));
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    return sendTokens(res, user);
  } catch(err) { next(err); }
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword };
