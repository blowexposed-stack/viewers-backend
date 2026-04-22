'use strict';

require('dotenv').config();
const http = require('http');
const app = require('./app'); // Certifique-se que app.js está na mesma pasta
const connectDB = require('./database'); // Certifique-se que database.js está na mesma pasta
const logger = require('./logger');

const PORT = process.env.PORT || 3000;

// Função para encerrar o servidor sem corromper dados
function gracefulShutdown(server, signal) {
  logger.info(`♻️ Recebido ${signal}. Encerrando processos...`);
  server.close(() => {
    logger.info('✅ Servidor HTTP encerrado.');
    process.exit(0);
  });

  // Força o fechamento após 10s se travar
  setTimeout(() => {
    logger.error('⚠️ Forçando encerramento por timeout.');
    process.exit(1);
  }, 10000);
}

async function startServer() {
  try {
    // 1. Conecta ao MongoDB
    await connectDB();
    logger.info('🐘 MongoDB conectado com sucesso.');

    const server = http.createServer(app);

    // 2. Escuta no host 0.0.0.0 (Obrigatório para Railway/Docker)
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 App Online em: http://0.0.0.0:${PORT}`);
      logger.info(`🛠️ Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });

    // Gatilhos de desligamento
    process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));

  } catch (err) {
    logger.error('❌ Falha crítica ao iniciar servidor:', err.message);
    setTimeout(() => process.exit(1), 1000);
  }
}

// Captura de erros globais para evitar crash silencioso
process.on('uncaughtException', (err) => {
  logger.error('💥 Erro não tratado (Uncaught Exception):', err);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
  logger.error('💥 Promessa rejeitada não tratada (Unhandled Rejection):', reason);
  setTimeout(() => process.exit(1), 1000);
});

startServer();
