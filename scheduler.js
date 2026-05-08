'use strict';

const User     = require('./User');
const Streamer = require('./Streamer');
const { sendMilestoneEmail } = require('./email.service');
const logger   = require('./logger');

const MILESTONES = [100, 500, 1000, 5000, 10000];
const DRAIN_AMOUNT = 2;
const DRAIN_INTERVAL_MS = 10 * 60 * 1000;
const PLAN_SLOTS = { none: 1, starter: 2, pro: 3, elite: 5 };
const PLAN_PRIORITY = { none: 1, starter: 2, pro: 3, elite: 4 };

// ─── Job: verifica e envia e-mail de milestone ────────────────────────────────
async function checkMilestones(userId, currentTokens, previousTokens) {
  for (const milestone of MILESTONES) {
    if (previousTokens < milestone && currentTokens >= milestone) {
      const user = await User.findById(userId).select('email nickname');
      if (!user) return;

      sendMilestoneEmail({
        to: user.email,
        nickname: user.nickname,
        milestone,
      }).catch((err) => logger.error('Erro ao enviar e-mail de milestone:', err));

      logger.info(`Milestone ${milestone} atingido: userId=${userId}`);
      break; // processa só 1 milestone por vez
    }
  }
}

// ─── Job: atualiza viewers em tempo real (roda a cada 30s via setInterval) ────
async function updateLiveViewerCounts(io) {
  try {
    const liveStreamers = await Streamer.find({ isLive: true }).lean();

    for (const streamer of liveStreamers) {
      // Simula variação de viewers (substituir por integração real com APIs de streaming)
      const delta = Math.floor(Math.random() * 5) - 2; // -2 a +2
      const newCount = Math.max(0, (streamer.currentViewers || 0) + delta);

      await Streamer.findByIdAndUpdate(streamer._id, {
        currentViewers: newCount,
        $max: { peakViewers: newCount },
      });

      // Emite para sala do streamer via WebSocket
      if (io) {
        const { emitViewerCount } = require('./socket');
        emitViewerCount(io, streamer._id, newCount);
      }
    }
  } catch (err) {
    logger.error('Erro no job de viewer counts:', err);
  }
}

// ─── Job: marca streamers inativos como offline (roda a cada 5 min) ──────────
async function cleanupOfflineStreamers() {
  try {
    const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos sem atualização = offline
    const cutoff = new Date(Date.now() - TIMEOUT_MS);

    const result = await Streamer.updateMany(
      { isLive: true, updatedAt: { $lt: cutoff } },
      { isLive: false, currentViewers: 0 }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Streamers marcados como offline: ${result.modifiedCount}`);
    }
  } catch (err) {
    logger.error('Erro no job de cleanup de streamers:', err);
  }
}

// ─── Job: desconta tokens de quem está recebendo viewers ─────────────────────
async function drainLiveTokens() {
  try {
    const cutoff = new Date(Date.now() - DRAIN_INTERVAL_MS);
    const liveStreamers = await Streamer.find({
      isLive: true,
      $or: [{ lastDrainAt: { $exists: false } }, { lastDrainAt: { $lte: cutoff } }],
    }).lean();

    for (const streamer of liveStreamers) {
      const user = await User.findOneAndUpdate(
        { _id: streamer.user, tokens: { $gte: DRAIN_AMOUNT } },
        { $inc: { tokens: -DRAIN_AMOUNT, totalTokensSpent: DRAIN_AMOUNT, viewersReceived: 1 } },
        { new: true }
      );

      if (!user) {
        await Streamer.findByIdAndUpdate(streamer._id, { isLive: false, currentViewers: 0 });
        logger.info(`Streamer offline por saldo insuficiente: ${streamer._id}`);
        continue;
      }

      await Streamer.findByIdAndUpdate(streamer._id, {
        lastDrainAt: new Date(),
        $inc: { totalViewers: 1, todayViewers: 1, monthViewers: 1 },
      });
    }
  } catch (err) {
    logger.error('Erro no job de desconto de tokens:', err);
  }
}

// ─── Job: expira planos mensais e aplica limites prometidos ─────────────────
async function expirePlansAndEnforceSlots() {
  try {
    const expiredUsers = await User.find({
      activePlan: { $ne: 'none' },
      planExpiresAt: { $lte: new Date() },
    }).select('_id activePlan');

    for (const user of expiredUsers) {
      await User.findByIdAndUpdate(user._id, { activePlan: 'none', planExpiresAt: null });
      const streamers = await Streamer.find({ user: user._id }).sort({ createdAt: 1 });
      const allowed = PLAN_SLOTS.none;

      for (let i = 0; i < streamers.length; i++) {
        streamers[i].planPriority = PLAN_PRIORITY.none;
        if (i >= allowed) {
          streamers[i].isLive = false;
          streamers[i].currentViewers = 0;
        }
        await streamers[i].save();
      }

      logger.info(`Plano expirado e slots ajustados: userId=${user._id}`);
    }
  } catch (err) {
    logger.error('Erro ao expirar planos:', err);
  }
}

// ─── Inicializa todos os jobs ─────────────────────────────────────────────────
function startJobs(io) {
  logger.info('Iniciando background jobs...');

  // Viewer counts a cada 30s
  setInterval(() => updateLiveViewerCounts(io), 30_000);

  // Cleanup de streamers a cada 5 min
  setInterval(cleanupOfflineStreamers, 5 * 60_000);

  // Desconto de tokens das lives online a cada minuto
  setInterval(drainLiveTokens, 60_000);

  // Expiração de planos a cada hora
  setInterval(expirePlansAndEnforceSlots, 60 * 60_000);

  logger.info('Background jobs iniciados.');
}

module.exports = {
  startJobs,
  checkMilestones,
  updateLiveViewerCounts,
  cleanupOfflineStreamers,
  drainLiveTokens,
  expirePlansAndEnforceSlots,
};
