'use strict';

// LISTAR STREAMERS AO VIVO
exports.getLiveStreamers = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: []
    });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

// MINHA STREAM
exports.getMyStream = async (req, res) => {
  return res.json({ success: true });
};

// GO LIVE (seu código)
exports.goLive = async (req, res) => {
  return res.json({ success: true });
};

// GO OFFLINE
exports.goOffline = async (req, res) => {
  return res.json({ success: true });
};

// DRAIN TOKENS
exports.drainTokens = async (req, res) => {
  return res.json({ success: true });
};
