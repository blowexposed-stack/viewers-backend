'use strict';

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const compression  = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp          = require('hpp');
const rateLimit    = require('express-rate-limit');

const logger       = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { notFound }  = require('./middleware/notFound');

// ─── Rotas ────────────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const streamerRoutes  = require('./routes/streamer.routes');
const tokenRoutes     = require('./routes/token.routes');
const rankingRoutes   = require('./routes/ranking.routes');
const paymentRoutes   = require('./routes/payment.routes');
const adminRoutes     = require('./routes/admin.routes');

const app = express();

// ════════════════════════════════════════════════════════════════════════════
//  1. SEGURANÇA — Helmet (HTTP headers)
// ════════════════════════════════════════════════════════════════════════════
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc:  ["'self'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // permite iframes de plataformas de streaming
}));

// ════════════════════════════════════════════════════════════════════════════
//  2. CORS — origens permitidas via env
// ════════════════════════════════════════════════════════════════════════════
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5500')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin(origin, callback) {
    // Permite requisições sem origin em dev e test (Postman, curl, Supertest)
    if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado para origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ════════════════════════════════════════════════════════════════════════════
//  3. RATE LIMITING — limita requisições por IP
// ════════════════════════════════════════════════════════════════════════════
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas requisições. Tente novamente em 15 minutos.' },
  handler(req, res, next, options) {
    logger.warn(`Rate limit atingido: IP ${req.ip}`);
    res.status(429).json(options.message);
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,                    // máx 10 tentativas de login
  message: { success: false, message: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  handler(req, res, next, options) {
    logger.warn(`Auth rate limit: IP ${req.ip} email ${req.body?.email}`);
    res.status(429).json(options.message);
  },
});

app.use('/api/', globalLimiter);

// ════════════════════════════════════════════════════════════════════════════
//  4. BODY PARSING — limita tamanho do corpo
// ════════════════════════════════════════════════════════════════════════════
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ════════════════════════════════════════════════════════════════════════════
//  5. SANITIZAÇÃO — NoSQL injection + XSS + HPP
// ════════════════════════════════════════════════════════════════════════════
app.use(mongoSanitize());   // Remove $ e . de inputs (NoSQL injection)
app.use(hpp());             // Previne HTTP Parameter Pollution

// ════════════════════════════════════════════════════════════════════════════
//  6. COMPRESSÃO & LOGGING
// ════════════════════════════════════════════════════════════════════════════
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ════════════════════════════════════════════════════════════════════════════
//  7. HEALTH CHECK
// ════════════════════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  8. ROTAS DA API
// ════════════════════════════════════════════════════════════════════════════
const API = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API}/auth`,      authLimiter, authRoutes);
app.use(`${API}/users`,     userRoutes);
app.use(`${API}/streamers`, streamerRoutes);
app.use(`${API}/tokens`,    tokenRoutes);
app.use(`${API}/ranking`,   rankingRoutes);
app.use(`${API}/admin`,     adminRoutes);
app.use(`${API}/payments`,  paymentRoutes);

// ════════════════════════════════════════════════════════════════════════════
//  9. TRATAMENTO DE ERROS GLOBAIS
// ════════════════════════════════════════════════════════════════════════════
app.use(notFound);
app.use(errorHandler);

module.exports = app;
