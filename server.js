'use strict';

// Carrega variáveis de ambiente logo no início
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./database');
const logger = require('./logger');

// Configuração de Porta para Railway (0.0.0.0 é essencial)
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; 

async function startServer() {
  try {
    // 1. Conexão com o Banco de Dados (MongoDB)
    await connectDB();
    logger.info('Banco de dados conectado com sucesso.');

    // 2. Criação do servidor HTTP a partir do App Express
    const server = http.createServer(app);

    // 3. Configuração Robusta do Socket.io
    // Adicionado suporte a múltiplos domínios e tratamento de erro de CORS
    const io = new Server(server, {
      cors: {
        origin: [
          "https://comunidadeviewers.vercel.app", 
          "http://localhost:3000",
          "http://localhost:5173" // Padrão do Vite (Front-end comum)
        ],
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000, // Evita desconexões em redes instáveis
    });

    /**
     * INJEÇÃO DE DEPENDÊNCIA (SOCKET.IO)
     * Disponibiliza o IO para os Controllers sem causar dependência circular.
     */
    app.set('io', io);           // Acessível via req.app.get('io')
    global._io = io;             // Acessível globalmente (usado no Payment Controller)
    
    // 4. Gerenciamento de Eventos Socket
    io.on('connection', (socket) => {
      logger.info(`Conectado: ${socket.id}`);

      // Canal para entrar em salas específicas (ex: sala do streamer)
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
        logger.info(`Socket ${socket.id} entrou na sala: ${roomId}`);
      });

      socket.on('disconnect', (reason) => {
        logger.info(`Desconectado: ${socket.id} - Motivo: ${reason}`);
      });
    });

    // 5. Inicialização do Servidor
    server.listen(PORT, HOST, () => {
      const mode = process.env.NODE_ENV || 'development';
      logger.info(`🚀 Servidor Ativo!`);
      logger.info(`📍 Porta: ${PORT}`);
      logger.info(`🛠️ Modo: ${mode}`);
      logger.info(`🔗 Socket.io pronto para receber conexões.`);
    });

    // 6. Graceful Shutdown (Desligamento suave)
    // Essencial para o Railway não deixar processos "zumbis"
    const gracefulShutdown = () => {
      logger.info('Iniciando encerramento do servidor...');
      server.close(() => {
        logger.info('Servidor HTTP encerrado.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (err) {
    logger.error('❌ Falha crítica ao iniciar o servidor:', err);
    process.exit(1);
  }
}

// 7. Tratamento de Erros Globais (Previne o Crash definitivo)
process.on('uncaughtException', (err) => {
  logger.error('⚠️ Exceção não capturada:', err);
  // Se for erro de conexão do banco, o ideal é tentar reconectar ou fechar
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('⚠️ Promessa não tratada em:', promise, 'razão:', reason);
});

startServer();
