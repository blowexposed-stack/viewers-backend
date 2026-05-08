'use strict';

const { Server } = require('socket.io');
const { verifyAccessToken } = require('./jwt');
const User     = require('./User');
const Streamer = require('./Streamer');
const logger   = require('./logger');

// ─── Rooms (namespaces lógicos) ───────────────────────────────────────────────
const ROOMS = {
  RANKING:      'ranking:global',
  LIVE_LOBBY:   'live:lobby',
  userRoom:  (id) => `user:${id}`,
  streamRoom:(id) => `stream:${id}`,
};

// ─── Mapa de usuários online ──────────────────────────────────────────────────
const onlineUsers = new Map(); // socketId → userId

// ─── Inicializa o servidor Socket.IO ─────────────────────────────────────────
function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:5500').split(',').map(o => o.trim()),
      credentials: true,
    },
    pingTimeout: 20_000,
    pingInterval: 10_000,
    transports: ['websocket', 'polling'],
  });

  // ─── Middleware de autenticação JWT ────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        // Permite conexão como guest (só leitura)
        socket.data.userId = null;
        socket.data.role   = 'guest';
        return next();
      }

      const decoded = verifyAccessToken(token);
      const user    = await User.findById(decoded.sub).select('nickname role isActive');

      if (!user || !user.isActive) {
        return next(new Error('Usuário não encontrado ou inativo.'));
      }

      socket.data.userId   = user._id.toString();
      socket.data.nickname = user.nickname;
      socket.data.role     = user.role;
      next();
    } catch {
      // Token inválido — conecta como guest
      socket.data.userId = null;
      socket.data.role   = 'guest';
      next();
    }
  });

  // ─── Eventos de conexão ───────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { userId, nickname, role } = socket.data;

    logger.info(`WS conectado: ${userId ? `${nickname} (${userId})` : 'guest'} [${socket.id}]`);

    // Registra usuário autenticado
    if (userId) {
      onlineUsers.set(socket.id, userId);
      socket.join(ROOMS.userRoom(userId));
    }

    // Entra no lobby geral (todos)
    socket.join(ROOMS.LIVE_LOBBY);
    socket.join(ROOMS.RANKING);

    // Broadcast de contagem de online
    io.emit('online:count', onlineUsers.size);

    // ── Entrar na sala de um streamer específico ───────────────────────────
    socket.on('stream:join', async (streamerId) => {
      if (!streamerId || typeof streamerId !== 'string') return;
      // Sanitiza — só aceita IDs MongoDB válidos (24 chars hex)
      if (!/^[a-fA-F0-9]{24}$/.test(streamerId)) return;

      socket.join(ROOMS.streamRoom(streamerId));
      logger.info(`${socket.id} entrou na sala stream:${streamerId}`);
    });

    // ── Sair da sala de um streamer ───────────────────────────────────────
    socket.on('stream:leave', (streamerId) => {
      if (!streamerId || !/^[a-fA-F0-9]{24}$/.test(streamerId)) return;
      socket.leave(ROOMS.streamRoom(streamerId));
    });

    // ── Ping de presença (mantém o usuário "assistindo") ─────────────────
    socket.on('viewer:ping', async ({ streamerId }) => {
      if (!userId || !streamerId) return;
      if (!/^[a-fA-F0-9]{24}$/.test(streamerId)) return;

      // Rate limit básico — máx 1 ping por 30s por socket
      const now = Date.now();
      const lastPing = socket.data.lastPing || 0;
      if (now - lastPing < 30_000) return;
      socket.data.lastPing = now;

      // Atualiza contador de viewers no DB
      await Streamer.findByIdAndUpdate(streamerId, {
        $inc: { currentViewers: 0 }, // apenas confirma presença (viewer management via job)
      });
    });

    // ── Chat simples na sala do streamer ──────────────────────────────────
    socket.on('chat:message', (data) => {
      if (!userId) return socket.emit('error', { message: 'Faça login para usar o chat.' });

      const { streamerId, text } = data || {};
      if (!streamerId || !text) return;
      if (!/^[a-fA-F0-9]{24}$/.test(streamerId)) return;

      // Sanitização básica da mensagem
      const clean = String(text).trim().slice(0, 200); // máx 200 chars
      if (!clean) return;

      // Broadcast para a sala do streamer
      io.to(ROOMS.streamRoom(streamerId)).emit('chat:message', {
        from:    nickname,
        userId,
        text:    clean,
        time:    new Date().toISOString(),
      });
    });

    // ── Desconexão ─────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      onlineUsers.delete(socket.id);
      io.emit('online:count', onlineUsers.size);
      logger.info(`WS desconectado: ${socket.id} (${reason})`);
    });
  });

  logger.info('Servidor WebSocket (Socket.IO) inicializado.');
  return io;
}

// ─── Helpers para emitir eventos a partir dos controllers ─────────────────────
function getIO() {
  if (!_io) throw new Error('Socket.IO ainda não inicializado.');
  return _io;
}

let _io = null;

function initAndStore(httpServer) {
  _io = initSocketServer(httpServer);
  return _io;
}

// ─── Emite atualização de ranking (chamado pelo token controller) ─────────────
async function emitRankingUpdate(io) {
  try {
    const top10 = await User.find({ isActive: true })
      .select('nickname platform tokens viewersReceived')
      .sort({ tokens: -1 })
      .limit(10)
      .lean();

    io.to(ROOMS.RANKING).emit('ranking:update', top10);
  } catch (err) {
    logger.error('Erro ao emitir ranking update:', err);
  }
}

// ─── Emite notificação para um usuário específico ─────────────────────────────
function emitToUser(io, userId, event, data) {
  io.to(ROOMS.userRoom(String(userId))).emit(event, data);
}

// ─── Emite atualização de contagem de viewers de um stream ───────────────────
function emitViewerCount(io, streamerId, count) {
  io.to(ROOMS.streamRoom(String(streamerId))).emit('stream:viewers', { streamerId, count });
}

module.exports = {
  initAndStore,
  emitRankingUpdate,
  emitToUser,
  emitViewerCount,
  ROOMS,
};
