'use strict';
const Streamer = require('./Streamer'); 

// LISTAR STREAMERS AO VIVO (Público)
exports.getLiveStreamers = async (req, res) => {
  try {
    const streamers = await Streamer.find({ isLive: true })
      .populate('user', 'nickname liveNick profileImage') 
      .sort({ planPriority: -1 })
      .lean();

    const formattedStreamers = streamers.map(s => ({
      ...s,
      username: s.user?.liveNick || s.user?.nickname || "canal"
    }));

    return res.json({ success: true, data: formattedStreamers });
  } catch (err) {
    console.error('Erro ao buscar streamers:', err);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

// BUSCAR MINHA LIVE (Privado)
exports.getMyStream = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Usuário não identificado' });

    const streamer = await Streamer.findOne({ user: userId }).lean();
    return res.json({ success: true, data: streamer });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

// FICAR ONLINE (Lógica Definitiva)
exports.goLive = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Não autorizado: Token inválido ou ausente' });
    }

    const streamer = await Streamer.findOneAndUpdate(
      { user: userId },
      { isLive: true, lastWentLive: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ 
      success: true, 
      message: 'Sistema ativado: Você está online!', 
      data: streamer 
    });
  } catch (err) {
    console.error('ERRO AO FICAR ONLINE:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao iniciar live',
      details: err.message 
    });
  }
};

// FICAR OFFLINE (Adicionado verificação de segurança)
exports.goOffline = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autorizado' });
    }

    await Streamer.findOneAndUpdate(
      { user: userId },
      { isLive: false }
    );

    return res.json({ success: true, message: 'Status: Offline' });
  } catch (err) {
    console.error('ERRO AO FICAR OFFLINE:', err);
    return res.status(500).json({ success: false });
  }
};

exports.drainTokens = async (req, res) => res.json({ success: true });
