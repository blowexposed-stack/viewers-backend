'use strict';

const router = require('express').Router();
// Importação desestruturada para garantir que as funções existem
const { 
  register, 
  login, 
  refresh, 
  forgotPassword, 
  resetPassword, 
  logout 
} = require('./auth.controller');

const { authenticate } = require('./auth');
const { validate, registerRules, loginRules } = require('./validate');

// Rotas públicas (usando as variáveis diretas agora)
router.post('/register',              registerRules, validate, register);
router.post('/login',                 loginRules,    validate, login);
router.post('/refresh',                                        refresh);
router.post('/forgot-password',                                forgotPassword);
router.post('/reset-password/:token',                          resetPassword);

// Rota autenticada
router.post('/logout', authenticate, logout);

module.exports = router;
