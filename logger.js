'use strict';

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array().map(e => e.msg).join('. '), 422));
  }
  next();
}

// ─── WEBHOOK MP — recebe JSON puro (sem auth JWT) ─────────────────────────────
// IMPORTANTE: deve vir ANTES do express.json() global
router.post('/webhook', express.json(), ctrl.mpWebhook);

// ─── Planos (público) ─────────────────────────────────────────────────────────
router.get('/plans', ctrl.getPlans);

// ─── Rotas autenticadas ───────────────────────────────────────────────────────
router.use(authenticate);

router.get('/history', ctrl.getHistory);

// Credito manual — somente admin
router.post(
  '/manual-credit',
  authorize('admin'),
  [
    body('userId').isMongoId().withMessage('userId invalido.'),
    body('planId').isIn(['starter','pro','elite']).withMessage('planId invalido.'),
    body('reason').notEmpty().withMessage('Motivo obrigatorio.'),
  ],
  validate,
  ctrl.manualCredit
);

module.exports = router;
