'use strict';
const User     = require('./User');
const AppError = require('./AppError');
const logger   = require('./logger');

// Tokens por sessão de 10 min por plano
const PLAN_TOKENS = { none:2, starter:2.5, pro:3.5, elite:6 };
const EARN_COOLDOWN_MS = 55 * 1000; // 55s de cooldown entre ganhos

// ─── POST /tokens/earn — ganha tokens assistindo ─────────────────────────────
async function earn(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    // Cooldown anti-cheat
    const now = Date.now();
    if (user._lastEarnAt && (now - user._lastEarnAt.getTime()) < EARN_COOLDOWN_MS) {
      return next(new AppError('Aguarde antes de ganhar tokens novamente.', 429));
    }

    const plan   = user.activePlan || 'none';
    const earned = PLAN_TOKENS[plan] || 2;

    const updated = await User.findByIdAndUpdate(
      user._id,
      {
        $inc: { tokens: earned, totalTokensEarned: earned, minutesWatched: 10 },
        _lastEarnAt: new Date(),
      },
      { new:true }
    );

    logger.info(`[Token] +${earned} para ${user.nickname} (plano: ${plan})`);
    return res.json({ success:true, earned, newBalance: updated.tokens, plan });
  } catch(err) { next(err); }
}

// ─── POST /tokens/spend — gasta tokens para boostar live ─────────────────────
async function spend(req, res, next) {
  try {
    const { amount = 2 } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    if (user.tokens < amount) {
      return next(new AppError(
        `Saldo insuficiente. Você tem ${user.tokens} tokens e precisa de ${amount}. ` +
        'Assista a outras lives para ganhar mais tokens.',
        402
      ));
    }

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $inc: { tokens: -amount, totalTokensSpent: amount, viewersReceived: 1 } },
      { new:true }
    );

    return res.json({ success:true, spent: amount, newBalance: updated.tokens });
  } catch(err) { next(err); }
}

// ─── GET /tokens/balance ──────────────────────────────────────────────────────
async function balance(req, res, next) {
  try {
    const user = await User.findById(req.user._id)
      .select('tokens totalTokensEarned totalTokensSpent activePlan minutesWatched viewersReceived');
    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    const plan   = user.activePlan || 'none';
    const planNames = { none:'Sem plano', starter:'⚡ Starter', pro:'🚀 Pro', elite:'👑 Elite' };

    return res.json({
      success: true,
      balance:       user.tokens,
      totalEarned:   user.totalTokensEarned,
      totalSpent:    user.totalTokensSpent,
      activePlan:    plan,
      planName:      planNames[plan],
      tokensPerSession: PLAN_TOKENS[plan] || 2,
      minutesWatched:   user.minutesWatched || 0,
      viewersReceived:  user.viewersReceived || 0,
    });
  } catch(err) { next(err); }
}

module.exports = { earn, spend, balance };
