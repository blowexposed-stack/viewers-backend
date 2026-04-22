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
  authSource: 'admin',
};

async function connectDB() {
  const uri = process.env.NODE_ENV === 'test'
    ? process.env.MONGODB_URI_TEST
    : process.env.MONGODB_URI;

  if (!uri) throw new Error('MONGODB_URI não definido nas variáveis de ambiente.');

  mongoose.connection.on('connected', () =>
    logger.info('MongoDB conectado com sucesso.'));

  mongoose.connection.on('error', (err) =>
    logger.error('Erro no MongoDB:', err));

  mongoose.connection.on('disconnected', () =>
    logger.warn('MongoDB desconectado. Tentando reconectar...'));

  await mongoose.connect(uri, MONGO_OPTIONS);
}

module.exports = connectDB;
