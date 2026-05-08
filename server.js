'use strict';

require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./database');
const { initAndStore } = require('./socket');
const { startJobs } = require('./scheduler');

// O Render injeta a porta automaticamente. Se não houver, usamos 3000.
const PORT = process.env.PORT || 3000;

async function startServer() {
  const server = http.createServer(app);

  const io = initAndStore(server);
  app.set('io', io);
  global._io = io;

  // Tenta conectar ao banco, mas NÃO deixa o servidor cair se falhar
  try {
    await connectDB();
    console.log('✅ MongoDB Conectado');
  } catch (err) {
    console.error('❌ Erro ao conectar ao MongoDB:', err.message);
    // Não damos process.exit(1) aqui para o Render ver que o app subiu
  }

  // Escuta na porta e no host 0.0.0.0 (Obrigatório para nuvem)
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Online na porta ${PORT}`);
    console.log(`🔗 URL: https://viewers-backend.onrender.com (ou a sua do Render)`);
    startJobs(io);
  });

  // Tratamento de erros dentro do Socket
  io.on('error', (err) => {
    console.error('Erro no Socket.io:', err);
  });
}

// CAPTURA DE ERROS CRÍTICOS - Isso impede o Status 1 sem explicação
process.on('uncaughtException', (err) => {
  console.error('🔥 ERRO CRÍTICO (Uncaught Exception):', err.stack);
  // Mantemos o processo vivo por 5 segundos para o log aparecer no Render
  setTimeout(() => process.exit(1), 5000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Promessa não tratada em:', promise, 'razão:', reason);
});

startServer();
