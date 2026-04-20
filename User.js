'use strict';

const User     = require('../models/User');
const Streamer = require('../models/Streamer');
const { sendMilestoneEmail } = require('../services/email.service');
const logger   = require('../utils/logger');

const MILESTONES = [100, 500, 1000, 5000, 10000];

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
        const { emitViewerCount } = require('../events/socket');
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

// ─── Inicializa todos os jobs ─────────────────────────────────────────────────
function startJobs(io) {
  logger.info('Iniciando background jobs...');

  // Viewer counts a cada 30s
  setInterval(() => updateLiveViewerCounts(io), 30_000);

  // Cleanup de streamers a cada 5 min
  setInterval(cleanupOfflineStreamers, 5 * 60_000);

  logger.info('Background jobs iniciados.');
}

module.exports = {
  startJobs,
  checkMilestones,
  updateLiveViewerCounts,
  cleanupOfflineStreamers,
};
