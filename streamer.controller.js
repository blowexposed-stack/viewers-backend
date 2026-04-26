'use strict';

const Streamer = require('./Streamer'); // ⚠️ ajusta o caminho se necessário

// LISTAR STREAMERS AO VIVO
exports.getLiveStreamers = async (req, res) => {
  try {
    const streamers = await Streamer.find({ isLive: true });

    return res.json({
      success: true,
      data: streamers
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

// MINHA STREAM
exports.getMyStream = async (req, res) => {
  try {
    const streamer = await Streamer.findOne({ user: req.user.id });

    return res.json({
      success: true,
      data: streamer
    });

  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

// GO LIVE
exports.goLive = async (req, res) => {
  try {
    const streamer = await Streamer.findOne({ user: req.user.id });

    if (!streamer) {
      return res.status(404).json({ message: 'Streamer não encontrado' });
    }

    streamer.isLive = true;
    streamer.lastWentLive = new Date();

    await streamer.save();

    return res.json({
      success: true,
      message: 'Você está ao vivo!',
      data: streamer
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

// GO OFFLINE
exports.goOffline = async (req, res) => {
  try {
    const streamer = await Streamer.findOne({ user: req.user.id });

    if (!streamer) {
      return res.status(404).json({ message: 'Streamer não encontrado' });
    }

    streamer.isLive = false;
    await streamer.save();

    return res.json({
      success: true,
      message: 'Você saiu do ao vivo'
    });

  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

// DRAIN TOKENS
exports.drainTokens = async (req, res) => {
  return res.json({ success: true });
};
