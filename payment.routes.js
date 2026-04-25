'use strict';

const express  = require('express');
const router   = express.Router();
const ctrl     = require('./payment.controller');
const { authenticate } = require('./auth');

// ─── WEBHOOK MP (sem auth JWT, body raw) ─────────────────────────────────────
router.post('/webhook', express.json(), ctrl.mpWebhook);

// ─── Planos (público) ─────────────────────────────────────────────────────────
router.get('/plans', ctrl.getPlans);

// ─── Rotas autenticadas ───────────────────────────────────────────────────────
router.use(authenticate);
router.get('/history', ctrl.getHistory);

module.exports = router;
