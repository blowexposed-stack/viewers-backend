'use strict';

// ─── Classe de erro customizado ───────────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Erros operacionais esperados (não são bugs)
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
