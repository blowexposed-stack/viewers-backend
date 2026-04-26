exports.goLive = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const streamer = await Streamer.findOne({ user: req.user.id });

    if (!streamer) {
      return res.status(404).json({ message: 'Streamer não encontrado' });
    }

    if (streamer.isLive) {
      return res.status(400).json({ message: 'Você já está ao vivo' });
    }

    streamer.isLive = true;
    streamer.lastWentLive = new Date();

    await streamer.save();

    const io = req.app?.get('io');

    if (io) {
      io.emit('streamer-online', {
        id: streamer._id,
        user: streamer.user,
        isLive: true,
        lastWentLive: streamer.lastWentLive
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Você está ao vivo!',
      data: streamer
    });

  } catch (error) {
    console.error('Erro ao entrar ao vivo:', error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno ao iniciar live'
    });
  }
};
