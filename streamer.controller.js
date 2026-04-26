'use strict';
// IMPORTANTE: Deve ser exatamente o nome do arquivo no GitHub
const Streamer = require('./Streamer'); 

// LISTAR STREAMERS AO VIVO
exports.getLiveStreamers = async (req, res) => {
  try {
    // Busca e ordena por prioridade de plano e número de viewers
    const streamers = await Streamer.find({ isLive: true })
      .sort({ planPriority: -1, currentViewers: -1 })
      .populate('user', 'username profileImage') // Traz dados do usuário junto
      .lean();

    return res.json({
      success: true,
      data: streamers || []
    });
  } catch (err) {
    console.error('Erro ao buscar streamers:', err);
    return res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
};

// MINHA STREAM
exports.getMyStream = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const streamer = await Streamer.findOne({ user: userId }).lean();
    return res.json({ success: true, data: streamer });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

// GO LIVE (Lógica Definitiva)
exports.goLive = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Não autorizado' });
    }

    // Atualiza para LIVE e grava o horário de início
    const streamer = await Streamer.findOneAndUpdate(
      { user: userId },
      { 
        isLive: true, 
        lastWentLive: new Date() 
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ 
      success: true, 
      message: 'Sistema ativado: Você está online!', 
      data: streamer 
    });
  } catch (err) {
    console.error('ERRO NO RENDER AO FICAR ONLINE:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao iniciar live',
      details: err.message 
    });
  }
};

// GO OFFLINE
exports.goOffline = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    await Streamer.findOneAndUpdate(
      { user: userId },
      { isLive: false }
    );

    return res.json({ success: true, message: 'Status: Offline' });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

// DRAIN TOKENS
exports.drainTokens = async (req, res) => {
  return res.json({ success: true });
};
