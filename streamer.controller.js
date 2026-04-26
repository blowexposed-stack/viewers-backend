'use strict';
// IMPORTANTE: Deve ser exatamente o nome do arquivo no GitHub
const Streamer = require('./Streamer'); 

// LISTAR STREAMERS AO VIVO
exports.getLiveStreamers = async (req, res) => {
  try {
    const streamers = await Streamer.find({ isLive: true })
      .populate('user', 'nickname liveNick profileImage') 
      .sort({ planPriority: -1 })
      .lean();

    // Mapeia os dados para garantir que o Frontend receba o que ele espera
    const formattedStreamers = streamers.map(s => {
      return {
        ...s,
        // Forçamos o username a ser o nickname ou liveNick do banco
        username: s.user?.liveNick || s.user?.nickname || "canal"
      };
    });

    return res.json({
      success: true,
      data: formattedStreamers
    });
  } catch (err) {
    console.error('Erro ao formatar streamers:', err);
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
  // Sua lógica de tokens aqui depois
  return res.json({ success: true });
};
