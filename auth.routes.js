'use strict';

const router = require('express').Router();
const ctrl   = require('./auth.controller');
const { authenticate } = require('./auth');
const { validate, registerRules, loginRules } = require('./validate');

// Rotas públicas
router.post('/register',             registerRules, validate, ctrl.register);
router.post('/login',                loginRules,    validate, ctrl.login);
router.post('/refresh',                                        ctrl.refresh);
router.post('/forgot-password',                                ctrl.forgotPassword);
router.post('/reset-password/:token',                          ctrl.resetPassword);

// Rota autenticada
router.post('/logout', authenticate, ctrl.logout);

module.exports = router;
