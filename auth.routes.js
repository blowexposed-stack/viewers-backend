'use strict';

const router = require('express').Router();
const ctrl = require('./auth.controller');
const { authenticate } = require('./auth');
const { validate, registerRules, loginRules } = require('./validate');

// Se ctrl estiver vindo vazio por erro de path, isso aqui mata o erro antes do Express
if (!ctrl) {
  console.error("❌ CRÍTICO: O arquivo auth.controller.js não foi carregado!");
}

// Criamos funções anônimas para que o Express nunca receba 'undefined' no boot
router.post('/register', registerRules, validate, (req, res, next) => ctrl.register(req, res, next));
router.post('/login', loginRules, validate, (req, res, next) => ctrl.login(req, res, next));
router.post('/refresh', (req, res, next) => ctrl.refresh(req, res, next));
router.post('/forgot-password', (req, res, next) => ctrl.forgotPassword(req, res, next));
router.post('/reset-password/:token', (req, res, next) => ctrl.resetPassword(req, res, next));
router.post('/logout', authenticate, (req, res, next) => ctrl.logout(req, res, next));

module.exports = router;
