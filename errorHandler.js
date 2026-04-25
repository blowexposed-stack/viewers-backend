'use strict';

const logger   = require('./logger');
const AppError = require('./AppError');

// ─── Formata erros específicos do Mongoose ────────────────────────────────────
function handleMongooseCastError(err) {
  return new AppError(`Valor inválido para o campo "${err.path}".`, 400);
}

function handleMongooseDuplicateKey(err) {
  const field = Object.keys(err.keyValue)[0];
  const map = { email: 'E-mail', nickname: 'Nickname' };
  return new AppError(`${map[field] || field} já está em uso.`, 409);
}

function handleMongooseValidation(err) {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(`Dados inválidos: ${messages.join('. ')}`, 422);
}

// ─── Handler global ───────────────────────────────────────────────────────────
function errorHandler(err, req, res, _next) {
  let error = err;

  // Converte erros do Mongoose em AppErrors legíveis
  if (err.name === 'CastError') error = handleMongooseCastError(err);
  if (err.code === 11000)       error = handleMongooseDuplicateKey(err);
  if (err.name === 'ValidationError') error = handleMongooseValidation(err);

  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;

  // Loga erros inesperados (bugs)
  if (!isOperational) {
    logger.error(`[${req.method}] ${req.originalUrl} — Erro não operacional:`, err);
  }

  // Em produção, não expõe detalhes de erros internos
  const message = (process.env.NODE_ENV === 'production' && !isOperational)
    ? 'Erro interno do servidor.'
    : error.message;

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    // Stack trace apenas em desenvolvimento
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
