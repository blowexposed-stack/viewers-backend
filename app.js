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

const authRoutes     = require('./auth.routes');
const userRoutes     = require('./user.routes');
const streamerRoutes = require('./streamer.routes');
const tokenRoutes    = require('./token.routes');
const rankingRoutes  = require('./ranking.routes');
const paymentRoutes  = require('./payment.routes');
const adminRoutes    = require('./admin.routes');

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5500')
  .split(',').map(o => o.trim());

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10 });

app.use('/api/', limiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
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
