'use strict';

const Streamer  = require('./Streamer');
const AppError  = require('./AppError');
const logger    = require('./logger');

// ─── GET /streamers — lista ao vivo com paginação ────────────────────────────
async function getLiveStreamers(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip  = (page - 1) * limit;

    const platform = req.query.platform; // filtro opcional
    const filter = { isLive: true };
    // Sanitiza o filtro de plataforma — só aceita valores conhecidos
    const VALID_PLATFORMS = ['twitch', 'youtube', 'kick', 'facebook'];
    if (platform && VALID_PLATFORMS.includes(platform)) {
      filter['user.platform'] = platform;
    }

    const [streamers, total] = await Promise.all([
      Streamer.find({ isLive: true })
        .populate('user', 'nickname platform channelUrl')
        .sort({ currentViewers: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Streamer.countDocuments({ isLive: true }),
    ]);

    return res.json({
      success: true,
      data: streamers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /streamers/me/go-live ─────────────────────────────────────────────
async function goLive(req, res, next) {
  try {
    const { streamTitle, game } = req.body;

    // Sanitização adicional
    if (streamTitle && streamTitle.length > 120) {
      return next(new AppError('Título do stream muito longo.', 400));
    }

    const streamer = await Streamer.findOneAndUpdate(
      { user: req.user._id },
      {
        isLive: true,
        streamTitle: streamTitle?.trim(),
        game: game?.trim(),
        lastWentLive: new Date(),
      },
      { new: true, upsert: true, runValidators: true }
    );

    logger.info(`Streamer ao vivo: userId=${req.user._id}`);
    return res.json({ success: true, data: streamer });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /streamers/me/go-offline ──────────────────────────────────────────
async function goOffline(req, res, next) {
  try {
    await Streamer.findOneAndUpdate(
      { user: req.user._id },
      { isLive: false, currentViewers: 0 }
    );

    logger.info(`Streamer offline: userId=${req.user._id}`);
    return res.json({ success: true, message: 'Stream encerrado.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getLiveStreamers, goLive, goOffline };
