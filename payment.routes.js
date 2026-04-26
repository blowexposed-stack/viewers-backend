'use strict';
const express = require('express');
const router  = express.Router();
const ctrl    = require('./payment.controller'); // Certifique-se que o caminho está certo
const { authenticate } = require('./auth');

// Webhook Mercado Pago
router.post('/webhook', express.json(), ctrl.mpWebhook);

// Listar planos
router.get('/plans', ctrl.getPlans);

// Histórico (precisa estar logado)
router.get('/history', authenticate, ctrl.getHistory);

module.exports = router;
