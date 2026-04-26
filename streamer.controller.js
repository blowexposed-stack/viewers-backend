// Procure a função exports.goLive e substitua por esta:
exports.goLive = async (req, res) => {
  try {
    // Busca o streamer pelo ID do usuário logado
    const streamer = await Streamer.findOne({ user: req.user.id });

    if (!streamer) {
      return res.status(404).json({ message: 'Streamer não encontrado' });
    }

    // Atualiza o status para Online e salva a hora
    streamer.isLive = true;
    streamer.lastWentLive = new Date();
    await streamer.save();

    // Avisa o Socket.io que tem alguém online agora (isso faz aparecer para os outros)
    const io = req.app.get('io');
    if (io) {
      io.emit('streamer-online', {
        id: streamer._id,
        user: streamer.user,
        isLive: true
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Você está ao vivo!',
      data: streamer 
    });
  } catch (error) {
    console.error('Erro ao entrar ao vivo:', error);
    return res.status(500).json({ message: 'Erro interno ao iniciar live' });
  }
};
