'use strict';

const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const morgan        = require('morgan');
const compression   = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp           = require('hpp');
const rateLimit     = require('express-rate-limit');

const logger       = require('./logger');
const errorHandler = require('./errorHandler');
const { notFound } = require('./notFound');

// Rotas
const authRoutes     = require('./auth.routes');
const userRoutes     = require('./user.routes');
const streamerRoutes = require('./streamer.routes');
const tokenRoutes    = require('./token.routes');
const rankingRoutes  = require('./ranking.routes');
const paymentRoutes  = require('./payment.routes');
const adminRoutes    = require('./admin.routes');

const app = express();

// ── Segurança ──────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// ── CORS ───────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5500')
  .split(',').map(o => o.trim());

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── Rate limiting ──────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas requisições. Tente em 15 minutos.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Muitas tentativas. Aguarde 15 minutos.' },
});

app.use('/api/', globalLimiter);

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Sanitização ────────────────────────────────────────────────────────────────
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
}

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, status: 'online', timestamp: new Date().toISOString() });
});

// ── Rotas ──────────────────────────────────────────────────────────────────────
const API = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API}/auth`,      authLimiter, authRoutes);
app.use(`${API}/users`,     userRoutes);
app.use(`${API}/streamers`, streamerRoutes);
app.use(`${API}/tokens`,    tokenRoutes);
app.use(`${API}/ranking`,   rankingRoutes);
app.use(`${API}/payments`,  paymentRoutes);
app.use(`${API}/admin`,     adminRoutes);

// ── Erros ──────────────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
