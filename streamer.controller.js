'use strict';
const Streamer = require('./Streamer'); // Verifique se o nome do arquivo de Model está correto (ex: Streamer.js ou streamer.model.js)

// LISTAR STREAMERS AO VIVO
exports.getLiveStreamers = async (req, res) => {
  try {
    const streamers = await Streamer.find({ isLive: true }).lean();
    return res.json({
      success: true,
      data: streamers
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar streamers' });
  }
};

// MINHA STREAM
exports.getMyStream = async (req, res) => {
  try {
    const streamer = await Streamer.findOne({ user: req.user._id }).lean();
    return res.json({ success: true, data: streamer });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

// GO LIVE (Lógica Real)
exports.goLive = async (req, res) => {
  try {
    // Procura o registro do streamer pelo ID do usuário logado
    const streamer = await Streamer.findOneAndUpdate(
      { user: req.user._id },
      { isLive: true, lastWentLive: new Date() },
      { new: true, upsert: true } // Se não existir, ele cria um
    );

    return res.json({ 
      success: true, 
      message: 'Você está ao vivo!', 
      data: streamer 
    });
  } catch (err) {
    console.error('Erro no goLive:', err);
    return res.status(500).json({ success: false, message: 'Erro ao iniciar live' });
  }
};

// GO OFFLINE
exports.goOffline = async (req, res) => {
  try {
    await Streamer.findOneAndUpdate(
      { user: req.user._id },
      { isLive: false }
    );
    return res.json({ success: true, message: 'Live encerrada' });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

// DRAIN TOKENS
exports.drainTokens = async (req, res) => {
  // Sua lógica de tokens aqui depois
  return res.json({ success: true });
};
