'use strict';
const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const morgan        = require('morgan');
const compression   = require('compression');
const cookieParser  = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp           = require('hpp');
const rateLimit     = require('express-rate-limit');

const logger       = require('./logger');
const errorHandler = require('./errorHandler');
const { notFound } = require('./notFound');

const authRoutes     = require('./auth.routes');
const userRoutes     = require('./user.routes');
const streamerRoutes = require('./streamer.routes');
const tokenRoutes    = require('./token.routes');
const rankingRoutes  = require('./ranking.routes');
const paymentRoutes  = require('./payment.routes');
const adminRoutes    = require('./admin.routes');

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS configurado para aceitar as requisições da Vercel sem bloqueios
app.use(cors({
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// AJUSTE: Aumentamos o limite para 2000 requisições para evitar o erro 429 durante seus testes
const limiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 2000, 
  standardHeaders: true, 
  legacyHeaders: false 
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

app.use('/api/', limiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (m) => logger.http(m.trim()) } }));
}

app.get('/health', (req, res) => res.json({ success: true, status: 'online' }));

const API = `/api/${process.env.API_VERSION || 'v1'}`;
app.use(`${API}/auth`,      authLimiter, authRoutes);
app.use(`${API}/users`,     userRoutes);
app.use(`${API}/streamers`, streamerRoutes);
app.use(`${API}/tokens`,    tokenRoutes);
app.use(`${API}/ranking`,   rankingRoutes);
app.use(`${API}/payments`,  paymentRoutes);
app.use(`${API}/admin`,     adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
