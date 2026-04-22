'use strict';

const winston = require('winston');
const path    = require('path');
const fs      = require('fs');

// Cria pasta de logs se não existir
const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    // Console — apenas fora de produção
    ...(process.env.NODE_ENV !== 'production'
      ? [new winston.transports.Console({
          format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
        })]
      : []
    ),

    // Arquivo — erros
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5_242_880, // 5MB
      maxFiles: 5,
    }),

    // Arquivo — geral
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 10_485_760, // 10MB
      maxFiles: 10,
    }),
  ],
  exitOnError: false,
});

// HTTP stream para morgan
logger.http = (msg) => logger.log('http', msg);

module.exports = logger;
