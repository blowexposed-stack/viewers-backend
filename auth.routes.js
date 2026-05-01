'use strict';

const router = require('express').Router();
const ctrl = require('./auth.controller');
const { authenticate } = require('./auth');
const { validate, registerRules, loginRules } = require('./validate');

/**
 * Utilitário para evitar que o servidor crash caso uma função do 
 * controller esteja undefined ou falhe na importação.
 */
const handle = (method) => {
  if (typeof method !== 'function') {
    return (req, res) => {
      console.error(`ERRO: Rota acessada, mas o método no controller não é uma função.`);
      res.status(500).json({ success: false, message: "Erro interno: Método não definido no servidor." });
    };
  }
  return method;
};

// --- ROTAS PÚBLICAS ---

// Registro de novo usuário
router.post('/register', registerRules, validate, handle(ctrl.register));

// Login de usuário
router.post('/login', loginRules, validate, handle(ctrl.login));

// Renovação de Access Token via Refresh Token (Cookie)
router.post('/refresh', handle(ctrl.refresh));

// Solicitação de recuperação de senha
router.post('/forgot-password', handle(ctrl.forgotPassword));

// Redefinição de senha com token
router.post('/reset-password/:token', handle(ctrl.resetPassword));


// --- ROTAS AUTENTICADAS ---

// Logout (Limpa o cookie no navegador)
router.post('/logout', authenticate, handle(ctrl.logout));


// Exportação do roteador configurado
module.exports = router;
