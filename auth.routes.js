'use strict';

const router = require('express').Router();
const ctrl = require('./auth.controller');
const { authenticate } = require('./auth');
const { validate, registerRules, loginRules } = require('./validate');

// Logs de segurança para o log do Render
console.log('Controller carregado. Métodos disponíveis:', Object.keys(ctrl));

// Rotas públicas
router.post('/register',              registerRules, validate, ctrl.register);
router.post('/login',                 loginRules,    validate, ctrl.login);
router.post('/refresh',                                        ctrl.refresh);
router.post('/forgot-password',                                ctrl.forgotPassword);
router.post('/reset-password/:token',                          ctrl.resetPassword);

// Rota autenticada - Adicionamos uma verificação simples
if (ctrl.logout) {
    router.post('/logout', authenticate, ctrl.logout);
} else {
    console.error('ALERTA: ctrl.logout não foi encontrado! Verifique o auth.controller.js');
}

module.exports = router;
