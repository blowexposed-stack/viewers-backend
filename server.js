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
    process.on('SIGTERM', () => server.close(() => process.exit(0)));
    process.on('SIGINT',  () => server.close(() => process.exit(0)));
  } catch (err) {
    logger.error('Falha ao iniciar:', err);
    process.exit(1);
  }
}

process.on('uncaughtException',  (err) => { console.error(err); process.exit(1); });
process.on('unhandledRejection', (r)   => { console.error(r);   process.exit(1); });

startServer();
