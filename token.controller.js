'use strict';

const User     = require('./User');
const AppError = require('./AppError');
const logger   = require('./logger');
const { checkMilestones } = require('./scheduler');

const MIN_EARN = 3;
const MAX_EARN = 8;
const SPEND_COST = 10;
const EARN_COOLDOWN_MS = 60_000;

// ─── POST /tokens/earn ────────────────────────────────────────────────────────
// Chamado quando o usuário assiste uma live
async function earn(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    // Anti-cheat: valida que passaram ao menos 60s desde o último ganho
    const now = Date.now();
    if (user._lastTokenEarn && now - user._lastTokenEarn < EARN_COOLDOWN_MS) {
      return next(new AppError('Aguarde antes de ganhar tokens novamente.', 429));
    }

    const earned = Math.floor(Math.random() * (MAX_EARN - MIN_EARN + 1)) + MIN_EARN;
    const prevTokens = user.tokens;

    await User.findByIdAndUpdate(user._id, {
      $inc: { tokens: earned, totalTokensEarned: earned },
    });

    // Verifica conquistas de tokens
    checkMilestones(user._id, prevTokens + earned, prevTokens)
      .catch((err) => logger.error('Erro ao checar milestones:', err));

    // Emite atualização de ranking via WebSocket
    const io = req.app.get('io');
    if (io) {
      const { emitRankingUpdate } = require('./socket');
      emitRankingUpdate(io).catch(() => {});
    }

    // Notificação pessoal via WebSocket
    if (io) {
      const { emitToUser } = require('./socket');
      emitToUser(io, user._id, 'tokens:earned', { earned, newBalance: prevTokens + earned });
    }

    logger.info(`Tokens ganhos: userId=${user._id} amount=${earned}`);

    return res.json({
      success: true,
      earned,
      newBalance: user.tokens + earned,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /tokens/spend ───────────────────────────────────────────────────────
// Gasta tokens para boostar a própria live
async function spend(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    if (user.tokens < SPEND_COST) {
      return next(new AppError(`Tokens insuficientes. Necessário: ${SPEND_COST}.`, 400));
    }

    await User.findByIdAndUpdate(user._id, {
      $inc: { tokens: -SPEND_COST, totalTokensSpent: SPEND_COST, viewersReceived: 1 },
    });

    logger.info(`Tokens gastos: userId=${user._id} amount=${SPEND_COST}`);

    return res.json({
      success: true,
      spent: SPEND_COST,
      newBalance: user.tokens - SPEND_COST,
      message: 'Live boostada! Viewers a caminho.',
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /tokens/balance ──────────────────────────────────────────────────────
async function balance(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('tokens totalTokensEarned totalTokensSpent');
    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    return res.json({
      success: true,
      balance: user.tokens,
      totalEarned: user.totalTokensEarned,
      totalSpent: user.totalTokensSpent,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { earn, spend, balance };
