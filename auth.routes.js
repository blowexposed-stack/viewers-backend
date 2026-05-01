'use strict';

const router = require('express').Router();
// Importando as funções separadamente para garantir que elas existem
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

// Se alguma das funções acima for 'undefined', o Node vai avisar aqui embaixo
console.log("Check de funções:", { register: !!register, login: !!login });

// Linha 23 (ajuste as rotas para usarem os nomes diretos das funções)
router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/logout', authenticate, logout);

module.exports = router;
