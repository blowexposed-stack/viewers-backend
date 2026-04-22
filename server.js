'use strict';

// Carrega variáveis de ambiente o mais cedo possível
require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./database');
const logger = require('./logger');

const PORT = process.env.PORT || 3000;

// Função para desligamento suave (Graceful Shutdown)
function gracefulShutdown(server, signal) {
  logger.info(`Recebido ${signal}. Encerrando servidor suavemente...`);
  server.close(() => {
    logger.info('Servidor HTTP fechado.');
    // Aqui você pode fechar a conexão com o banco se o connectDB exportar o mongoose
    process.exit(0);
  });

  // Força a saída após 10 segundos se não fechar sozinho
  setTimeout(() => {
    logger.error('Não foi possível fechar as conexões a tempo, forçando saída.');
    process.exit(1);
  }, 10000);
}

async function startServer() {
  try {
    // 1. Conecta ao Banco de Dados primeiro
    await connectDB();
    logger.info('Conexão com o banco de dados estabelecida.');

    // 2. Cria o servidor
    const server = http.createServer(app);

    // 3. Escuta na porta correta (Railway exige 0.0.0.0 para tráfego externo)
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Servidor rodando: http://0.0.0.0:${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    // 4. Tratamento de Sinais do Sistema (Crucial para Cloud)
    process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));

  } catch (err) {
    logger.error('❌ Erro crítico no startServer:', err.message);
    // Dá um tempo para o logger registrar o erro antes de matar o processo
    setTimeout(() => process.exit(1), 1000);
  }
}

// Tratamento de erros globais (evita crash silencioso)
process.on('uncaughtException', (err) => {
  logger.error('FALHA CRÍTICA (Uncaught Exception):', err);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('FALHA CRÍTICA (Unhandled Rejection) em:', promise, 'motivo:', reason);
  setTimeout(() => process.exit(1), 1000);
});

startServer();
