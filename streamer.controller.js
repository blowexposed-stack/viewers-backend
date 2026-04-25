'use strict';

const Streamer  = require('./Streamer');
const User      = require('./User');
const AppError  = require('./AppError');
const logger    = require('./logger');

const COST_PER_TAB   = 2;   // tokens por aba ativa
const COST_PER_SLOT  = 6;   // custo total por rodada (3 abas × 2 tokens)
const DRAIN_INTERVAL = 60;  // desconta a cada 60s

// ─── GET /streamers — lista ao vivo ──────────────────────────────────────────
async function getLiveStreamers(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    // Ordena: planos premium primeiro, depois por viewers
    const [streamers, total] = await Promise.all([
      Streamer.find({ isLive: true })
        .populate('user', 'nickname platform liveNick channelUrl activePlan')
        .sort({ planPriority: -1, currentViewers: -1 })
        .skip(skip).limit(limit).lean(),
      Streamer.countDocuments({ isLive: true }),
    ]);

    return res.json({ success:true, data: streamers, pagination: { page, limit, total, pages: Math.ceil(total/limit) } });
  } catch(err) { next(err); }
}

// ─── GET /streamers/me ────────────────────────────────────────────────────────
async function getMyStream(req, res, next) {
  try {
    const streamer = await Streamer.findOne({ user: req.user._id })
      .populate('user', 'nickname platform liveNick channelUrl activePlan tokens')
      .lean();
    return res.json({ success:true, data: streamer || null });
  } catch(err) { next(err); }
}

// ─── PATCH /streamers/me/go-live — verifica saldo antes de ativar ─────────────
async function goLive(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    // VERIFICAÇÃO DE SALDO
    if (user.tokens < COST_PER_TAB) {
      return next(new AppError(
        `Saldo insuficiente. Você precisa de pelo menos ${COST_PER_TAB} tokens para ativar sua live. ` +
        'Assista a outras lives para ganhar tokens ou adquira um plano.',
        402
      ));
    }

    const { streamTitle, game, liveNick } = req.body;

    // Atualiza liveNick se fornecido
    if (liveNick) {
      await User.findByIdAndUpdate(user._id, { liveNick: liveNick.trim() });
    }

    // Prioridade por plano
    const planPriority = { elite:4, pro:3, starter:2, none:1 };
    const priority = planPriority[user.activePlan || 'none'] || 1;

    const streamer = await Streamer.findOneAndUpdate(
      { user: req.user._id },
      {
        isLive:       true,
        streamTitle:  streamTitle?.trim() || '',
        game:         game?.trim()        || '',
        lastWentLive: new Date(),
        planPriority: priority,
      },
      { new:true, upsert:true, runValidators:true }
    );

    logger.info(`Live ON: userId=${req.user._id} tokens=${user.tokens}`);
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

// ─── POST /streamers/me/drain — desconta tokens por aba ativa (chamado pelo frontend)
async function drainTokens(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    const { tabs = 1 } = req.body; // número de abas ativas (max 3)
    const cost = Math.min(tabs, 3) * COST_PER_TAB;

    // Saldo insuficiente — derruba a live automaticamente
    if (user.tokens < cost) {
      await Streamer.findOneAndUpdate(
        { user: req.user._id },
        { isLive:false, currentViewers:0 }
      );
      logger.info(`Live derrubada por saldo zerado: userId=${req.user._id}`);
      return res.status(402).json({
        success:    false,
        liveDowned: true,
        message:    'Saldo insuficiente. Sua live foi desativada automaticamente. Assista a outras lives para ganhar mais tokens.',
      });
    }

    // Desconta tokens
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $inc: { tokens: -cost, totalTokensSpent: cost } },
      { new:true }
    );

    return res.json({
      success:    true,
      cost,
      newBalance: updated.tokens,
      message:    `${cost} token(s) descontados.`,
    });
  } catch(err) { next(err); }
}

module.exports = { getLiveStreamers, getMyStream, goLive, goOffline, drainTokens };
