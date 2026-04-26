'use strict';
// IMPORTANTE: Verifique se no seu GitHub o arquivo se chama Streamer.js ou streamer.js
const Streamer = require('./Streamer'); 

// LISTAR STREAMERS AO VIVO
exports.getLiveStreamers = async (req, res) => {
  try {
    const streamers = await Streamer.find({ isLive: true }).lean();
    return res.json({
      success: true,
      data: streamers || []
    });
  } catch (err) {
    console.error('Erro ao buscar streamers:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar streamers' });
  }
};

// MINHA STREAM
exports.getMyStream = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const streamer = await Streamer.findOne({ user: userId }).lean();
    return res.json({ success: true, data: streamer });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

// GO LIVE (Lógica Reforçada)
exports.goLive = async (req, res) => {
  try {
    // Pega o ID do usuário de forma segura
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      console.error('ERRO: Usuário não identificado na requisição');
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    console.log(`[LOG] Ativando live para o usuario: ${userId}`);

    const streamer = await Streamer.findOneAndUpdate(
      { user: userId },
      { 
        isLive: true, 
        lastWentLive: new Date() 
      },
      { new: true, upsert: true } // Se não existir registro de streamer para esse user, ele cria agora
    );

    // Se você usa Socket.io, ele deve ser disparado aqui
    const io = req.app.get('io');
    if (io) io.emit('streamer:online', streamer);

    return res.json({ 
      success: true, 
      message: 'Você está ao vivo!', 
      data: streamer 
    });
  } catch (err) {
    console.error('ERRO DETALHADO NO GO-LIVE:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao iniciar live',
      error: err.message 
    });
  }
};

// GO OFFLINE
exports.goOffline = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    const streamer = await Streamer.findOneAndUpdate(
      { user: userId },
      { isLive: false },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) io.emit('streamer:offline', { userId });

    return res.json({ success: true, message: 'Live encerrada' });
  } catch (err) {
    console.error('Erro ao encerrar live:', err);
    return res.status(500).json({ success: false });
  }
};

// DRAIN TOKENS
exports.drainTokens = async (req, res) => {
  return res.json({ success: true });
};
