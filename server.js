'use strict';

require('dotenv').config();

const http      = require('http');
const app       = require('./app');
const connectDB = require('./database');
const logger    = require('./logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();

    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`Servidor rodando na porta ${PORT} [${process.env.NODE_ENV}]`);
    });

    const shutdown = (signal) => {
      logger.info(`${signal} recebido. Encerrando servidor...`);
      server.close(() => { process.exit(0); });
      setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Falha ao iniciar o servidor:', err);
    process.exit(1);
  }
}

process.on('uncaughtException',  (err)    => { console.error('UncaughtException:',  err); process.exit(1); });
process.on('unhandledRejection', (reason) => { console.error('UnhandledRejection:', reason); process.exit(1); });

startServer();
