'use strict';

const express = require('express');
const router  = express.Router();

const ctrl = require('./payment.controller');
const { authenticate } = require('./auth');

router.get('/plans', ctrl.getPlans);
router.post('/webhook/mercadopago', ctrl.mpWebhook);

router.use(authenticate);
router.get('/history', ctrl.getHistory);

module.exports = router;
