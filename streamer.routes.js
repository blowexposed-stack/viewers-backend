// Dentro de streamer.controller.js
exports.goLive = async (req, res) => {
  try {
    const streamer = await Streamer.findOne({ user: req.user.id });

    if (!streamer) {
      return res.status(404).json({ message: 'Streamer não encontrado' });
    }

    // REMOVA OU COMENTE A TRAVA DO 409
    // Se o código tiver algo como: if (streamer.isLive) return res.status(409)... APAGUE.

    streamer.isLive = true;
    streamer.lastWentLive = new Date();
    await streamer.save();

    // Se você configurou o Socket.io no server.js, pode avisar aqui:
    const io = req.app.get('io');
    if (io) {
      io.emit('streamer-online', streamer);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Você está ao vivo!',
      data: streamer 
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao entrar ao vivo' });
  }
};
