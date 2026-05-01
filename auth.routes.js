'use strict';

const router = require('express').Router();
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

// Verificação completa no log para sabermos exatamente qual falhou
console.log("Status das funções:", { 
  register: !!register, 
  login: !!login, 
  refresh: !!refresh, 
  forgotPassword: !!forgotPassword, 
  logout: !!logout 
});

// Usando condicionais para evitar que o servidor quebre se uma função faltar
if (register) router.post('/register', registerRules, validate, register);
if (login)    router.post('/login', loginRules, validate, login);
if (refresh)  router.post('/refresh', refresh);
if (forgotPassword) router.post('/forgot-password', forgotPassword);
if (resetPassword)  router.post('/reset-password/:token', resetPassword);
if (logout)   router.post('/logout', authenticate, logout);

module.exports = router;
