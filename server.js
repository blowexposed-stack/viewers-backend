'use strict';
require('dotenv').config();

const http      = require('http');
// ADICIONE ESTA LINHA:
const { Server } = require('socket.io'); 
const app       = require('./app');
const connectDB = require('./database');
const logger    = require('./logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    const server = http.createServer(app);

    // ADICIONE ESTE BLOCO:
    const io = new Server(server, {
      cors: {
        origin: "https://comunidadeviewers.vercel.app", // Isso libera o acesso da Vercel
        methods: ["GET", "POST"]
      }
    });

    // Isso faz o socket funcionar de verdade
    io.on('connection', (socket) => {
      console.log('Usuário conectado:', socket.id);
    });

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
