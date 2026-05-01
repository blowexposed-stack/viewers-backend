'use strict';

const router = require('express').Router();
const ctrl = require('./auth.controller');
const { authenticate } = require('./auth');
const { validate, registerRules, loginRules } = require('./validate');

// Função "Wrapper" - Ela impede o Express de receber um 'undefined' no boot
const wrap = (methodName) => {
  return (req, res, next) => {
    if (ctrl && typeof ctrl[methodName] === 'function') {
      return ctrl[methodName](req, res, next);
    }
    console.error(`❌ Erro Crítico: O método '${methodName}' não foi encontrado no auth.controller.js`);
    return res.status(500).json({ 
      success: false, 
      message: `Erro interno: função ${methodName} não carregada.` 
    });
  };
};

// --- ROTAS PÚBLICAS ---
router.post('/register', registerRules, validate, wrap('register'));
router.post('/login', loginRules, validate, wrap('login'));
router.post('/refresh', wrap('refresh'));
router.post('/forgot-password', wrap('forgotPassword'));
router.post('/reset-password/:token', wrap('resetPassword'));

// --- ROTAS AUTENTICADAS ---
router.post('/logout', authenticate, wrap('logout'));

module.exports = router;
