'use strict';

const Streamer = require('./Streamer');
const User     = require('./User');

const PLAN_PRIORITY = { none: 1, starter: 2, pro: 3, elite: 4 };
const PLAN_SLOTS    = { none: 1, starter: 2, pro: 3, elite: 5 };
const DRAIN_AMOUNT  = 2;

function currentPlan(user) {
  if (!user) return 'none';
  if (user.planExpiresAt && user.planExpiresAt <= new Date()) return 'none';
  return user.activePlan || 'none';
}

function maxSlotsFor(user) {
  return PLAN_SLOTS[currentPlan(user)] || 1;
}

function priorityFor(user) {
  return PLAN_PRIORITY[currentPlan(user)] || 1;
}

function channelUrl(platform, liveNick) {
  const base = {
    twitch: 'https://twitch.tv/',
    youtube: 'https://youtube.com/@',
    kick: 'https://kick.com/',
    facebook: 'https://facebook.com/',
  }[platform] || 'https://twitch.tv/';
  return base + liveNick;
}

function serializeStreamer(streamer, user) {
  const raw = typeof streamer.toObject === 'function' ? streamer.toObject() : streamer;
  const nick = raw.liveNick || user?.liveNick || user?.nickname || 'canal';
  const platform = raw.platform || user?.platform || 'twitch';
  return {
    ...raw,
    username: nick,
    user: {
      _id: user?._id || raw.user?._id || raw.user,
      nickname: user?.nickname || raw.user?.nickname || 'Streamer',
      liveNick: nick,
      platform,
    },
  };
}

exports.getLiveStreamers = async (req, res) => {
  try {
    const streamers = await Streamer.find({ isLive: true })
      .populate('user', 'nickname activePlan planExpiresAt')
      .sort({ planPriority: -1, updatedAt: -1 })
      .lean();

    const formatted = streamers.map(s => serializeStreamer(s, s.user));
    return res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Erro ao buscar streamers:', err);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

exports.getMyStream = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Usuário não identificado' });

    const user = await User.findById(userId).select('nickname activePlan planExpiresAt');
    const streamers = await Streamer.find({ user: userId }).sort({ createdAt: 1 }).lean();
    return res.json({
      success: true,
      data: streamers.map(s => serializeStreamer(s, user)),
      slotsUsed: streamers.length,
      slotsTotal: maxSlotsFor(user),
      activePlan: currentPlan(user),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar canais' });
  }
};

exports.createStream = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Não autorizado' });

    const user = await User.findById(userId).select('nickname activePlan planExpiresAt');
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

    const slotsTotal = maxSlotsFor(user);
    const slotsUsed = await Streamer.countDocuments({ user: userId });
    if (slotsUsed >= slotsTotal) {
      return res.status(403).json({
        success: false,
        message: `Seu plano permite ${slotsTotal} canal(is). Faça upgrade para adicionar mais.`
      });
    }

    const platform = req.body?.platform || 'twitch';
    const liveNick = String(req.body?.liveNick || req.body?.nick || '').trim();
    if (!liveNick) return res.status(400).json({ success: false, message: 'Nick do canal obrigatório.' });

    const streamer = await Streamer.create({
      user: userId,
      platform,
      liveNick,
      channelUrl: req.body?.channelUrl || channelUrl(platform, liveNick),
      streamTitle: req.body?.streamTitle || '',
      game: req.body?.game || '',
      planPriority: priorityFor(user),
    });

    return res.status(201).json({ success: true, data: serializeStreamer(streamer, user), slotsUsed: slotsUsed + 1, slotsTotal });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Esse canal já está cadastrado.' });
    }
    console.error('ERRO AO CRIAR CANAL:', err);
    return res.status(500).json({ success: false, message: 'Erro ao adicionar canal' });
  }
};

exports.updateStream = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const updates = {};
    if (req.body?.platform !== undefined) updates.platform = req.body.platform;
    if (req.body?.liveNick !== undefined) updates.liveNick = String(req.body.liveNick).trim();
    if (req.body?.streamTitle !== undefined) updates.streamTitle = req.body.streamTitle;
    if (req.body?.game !== undefined) updates.game = req.body.game;
    if (updates.platform || updates.liveNick) {
      const current = await Streamer.findOne({ _id: req.params.id, user: userId });
      const platform = updates.platform || current?.platform || 'twitch';
      const liveNick = updates.liveNick || current?.liveNick;
      updates.channelUrl = channelUrl(platform, liveNick);
    }

    const streamer = await Streamer.findOneAndUpdate({ _id: req.params.id, user: userId }, updates, { new: true, runValidators: true });
    if (!streamer) return res.status(404).json({ success: false, message: 'Canal não encontrado.' });

    const user = await User.findById(userId).select('nickname activePlan planExpiresAt');
    return res.json({ success: true, data: serializeStreamer(streamer, user) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar canal' });
  }
};

exports.deleteStream = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const deleted = await Streamer.findOneAndDelete({ _id: req.params.id, user: userId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Canal não encontrado.' });
    return res.json({ success: true, message: 'Canal removido.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao remover canal' });
  }
};

exports.goLive = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Não autorizado' });

    const user = await User.findById(userId).select('tokens activePlan planExpiresAt nickname');
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    if (user.tokens < DRAIN_AMOUNT) {
      return res.status(402).json({ success: false, message: 'Saldo insuficiente. Assista outras lives para ganhar tokens antes de ficar online.' });
    }

    let streamer;
    if (req.params.id) {
      streamer = await Streamer.findOne({ _id: req.params.id, user: userId });
      if (!streamer) return res.status(404).json({ success: false, message: 'Canal não encontrado.' });
    } else {
      streamer = await Streamer.findOne({ user: userId }).sort({ createdAt: 1 });
      if (!streamer) {
        const liveNick = String(req.body?.liveNick || '').trim();
        if (!liveNick) return res.status(400).json({ success: false, message: 'Cadastre um canal antes de ficar online.' });
        streamer = await Streamer.create({
          user: userId,
          platform: req.body?.platform || 'twitch',
          liveNick,
          channelUrl: channelUrl(req.body?.platform || 'twitch', liveNick),
        });
      }
    }

    const ordered = await Streamer.find({ user: userId }).sort({ createdAt: 1 }).select('_id');
    const allowedIds = ordered.slice(0, maxSlotsFor(user)).map(s => String(s._id));
    if (!allowedIds.includes(String(streamer._id))) {
      return res.status(403).json({ success: false, message: 'Este canal está acima do limite do seu plano atual.' });
    }

    if (req.body?.streamTitle !== undefined) streamer.streamTitle = req.body.streamTitle;
    if (req.body?.game !== undefined) streamer.game = req.body.game;
    streamer.isLive = true;
    streamer.lastWentLive = new Date();
    streamer.lastDrainAt = new Date();
    streamer.planPriority = priorityFor(user);
    await streamer.save();

    return res.json({ success: true, message: 'Sistema ativado: Você está online!', data: serializeStreamer(streamer, user) });
  } catch (err) {
    console.error('ERRO AO FICAR ONLINE:', err);
    return res.status(500).json({ success: false, message: 'Erro ao iniciar live', details: err.message });
  }
};

exports.goOffline = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Não autorizado' });

    const filter = req.params.id ? { _id: req.params.id, user: userId } : { user: userId };
    await Streamer.updateMany(filter, { isLive: false, currentViewers: 0 });
    return res.json({ success: true, message: 'Status: Offline' });
  } catch (err) {
    console.error('ERRO AO FICAR OFFLINE:', err);
    return res.status(500).json({ success: false });
  }
};

exports.drainTokens = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Não autorizado' });

    const amount = Math.max(0, Number(req.body?.amount) || DRAIN_AMOUNT);
    const filter = req.params.id ? { _id: req.params.id, user: userId } : { user: userId };
    const streamer = await Streamer.findOne({ ...filter, isLive: true });
    if (!streamer) return res.json({ success: true, spent: 0, message: 'Live offline.' });

    const user = await User.findOneAndUpdate(
      { _id: userId, tokens: { $gte: amount } },
      { $inc: { tokens: -amount, totalTokensSpent: amount, viewersReceived: 1 } },
      { new: true }
    );

    if (!user) {
      await Streamer.findByIdAndUpdate(streamer._id, { isLive: false, currentViewers: 0 });
      return res.status(402).json({ success: false, message: 'Saldo insuficiente. A live foi colocada offline.' });
    }

    await Streamer.findByIdAndUpdate(streamer._id, {
      lastDrainAt: new Date(),
      $inc: { totalViewers: 1, todayViewers: 1, monthViewers: 1 },
    });

    return res.json({ success: true, spent: amount, newBalance: user.tokens });
  } catch (err) {
    console.error('ERRO AO DESCONTAR TOKENS:', err);
    return res.status(500).json({ success: false, message: 'Erro ao descontar tokens' });
  }
};
