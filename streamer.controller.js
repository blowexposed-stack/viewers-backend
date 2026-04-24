'use strict';

const Streamer  = require('./Streamer');
const AppError  = require('./AppError');
const logger    = require('./logger');

// ─── GET /streamers — lista ao vivo ──────────────────────────────────────────
async function getLiveStreamers(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;

    const [streamers, total] = await Promise.all([
      Streamer.find({ isLive: true })
        .populate('user', 'nickname platform liveNick channelUrl activePlan')
        .sort({ currentViewers: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Streamer.countDocuments({ isLive: true }),
    ]);

    return res.json({
      success: true,
      data:    streamers,
      pagination: { page, limit, total, pages: Math.ceil(total/limit) },
    });
  } catch(err) { next(err); }
}

// ─── GET /streamers/me — streamer do usuário logado ──────────────────────────
async function getMyStream(req, res, next) {
  try {
    const streamer = await Streamer.findOne({ user: req.user._id })
      .populate('user', 'nickname platform liveNick channelUrl')
      .lean();

    return res.json({ success: true, data: streamer || null });
  } catch(err) { next(err); }
}

// ─── PATCH /streamers/me/go-live ─────────────────────────────────────────────
async function goLive(req, res, next) {
  try {
    const { streamTitle, game, liveNick } = req.body;

    // Atualiza liveNick no User se fornecido
    if (liveNick) {
      await require('./User').findByIdAndUpdate(req.user._id, { liveNick: liveNick.trim() });
    }

    const streamer = await Streamer.findOneAndUpdate(
      { user: req.user._id },
      {
        isLive:      true,
        streamTitle: streamTitle?.trim() || '',
        game:        game?.trim()        || '',
        lastWentLive: new Date(),
      },
      { new:true, upsert:true, runValidators:true }
    );

    logger.info(`Live ON: userId=${req.user._id}`);
    return res.json({ success:true, data: streamer });
  } catch(err) { next(err); }
}

// ─── PATCH /streamers/me/go-offline ──────────────────────────────────────────
async function goOffline(req, res, next) {
  try {
    await Streamer.findOneAndUpdate(
      { user: req.user._id },
      { isLive:false, currentViewers:0 }
    );
    logger.info(`Live OFF: userId=${req.user._id}`);
    return res.json({ success:true, message:'Stream encerrado.' });
  } catch(err) { next(err); }
}

module.exports = { getLiveStreamers, getMyStream, goLive, goOffline };
