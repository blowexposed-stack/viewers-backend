'use strict';

const mongoose = require('mongoose');
const logger   = require('./logger');

const MONGO_OPTIONS = {
  // Conexão
  maxPoolSize: 10,       // máx 10 conexões simultâneas
  minPoolSize: 2,
  socketTimeoutMS: 45_000,
  serverSelectionTimeoutMS: 5_000,

  // Segurança
  // authSource: 'admin', // Comentado para evitar erro "bad auth" no MongoDB Atlas
};

async function connectDB() {
  const uri = process.env.NODE_ENV === 'test'
    ? process.env.MONGODB_URI_TEST
    : process.env.MONGODB_URI;

  if (!uri) {
    logger.error('Erro crítico: MONGODB_URI não definido nas variáveis de ambiente.');
    throw new Error('MONGODB_URI não definido nas variáveis de ambiente.');
  }

  // Configuração de eventos (Listeners)
  mongoose.connection.on('connected', () =>
    logger.info('MongoDB conectado com sucesso.'));

  mongoose.connection.on('error', (err) =>
    logger.error('Erro no MongoDB:', err));

  mongoose.connection.on('disconnected', () =>
    logger.warn('MongoDB desconectado. Tentando reconectar...'));

  // Tentativa de conexão com tratamento de erro para evitar Crash no Railway
  try {
    await mongoose.connect(uri, MONGO_OPTIONS);
    logger.info('Mongoose estabeleceu a conexão inicial.');
  } catch (err) {
    logger.error('Falha na autenticação ou conexão inicial do MongoDB:', err.message);
    
    // IMPORTANTE: Em vez de deixar o app cair, apenas avisamos.
    // Assim o Railway fica "Online" e você consegue ver o erro nos logs.
  }
}

module.exports = connectDB;
