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

    const formattedStreamers = streamers.map(s => {
      return {
        ...s,
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

// ESSA FUNÇÃO ESTAVA FALTANDO E POR ISSO DAVA ERRO NO RENDER
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
