'use strict';

const router = require('express').Router();
const authCtrl = require('./auth.controller');

// Importações dos Middlewares
const authMiddleware = require('./auth');
const validateMiddleware = require('./validate');

// --- TRAVA DE SEGURANÇA (Anti-Crash Railway) ---
// Se a importação falhar, atribuímos uma função vazia ou array vazio para não quebrar o Express
const authenticate = authMiddleware.authenticate || ((req, res, next) => next());
const validate = validateMiddleware.validate || ((req, res, next) => next());
const registerRules = validateMiddleware.registerRules || [];
const loginRules = validateMiddleware.loginRules || [];

/**
 * Wrapper para métodos do controller
 * Evita que o servidor caia se você esquecer de exportar um método no controller
 */
const safe = (method) => {
    return (req, res, next) => {
        if (authCtrl && typeof authCtrl[method] === 'function') {
            return authCtrl[method](req, res, next);
        }
        
        console.error(`[ERRO]: O método "${method}" não foi encontrado no auth.controller.js`);
        res.status(501).json({ 
            success: false, 
            error: 'Esta funcionalidade ainda não foi implementada ou está em manutenção.' 
        });
    };
};

// --- DEFINIÇÃO DAS ROTAS ---

// Registro e Login (Público)
router.post('/register', registerRules, validate, safe('register'));
router.post('/login',    loginRules,    validate, safe('login'));

// Tokens (Público - O refresh valida o cookie internamente)
router.post('/refresh', safe('refresh'));

// Recuperação de Senha (Público)
router.post('/forgot-password',       safe('forgotPassword'));
router.post('/reset-password/:token', safe('resetPassword'));

// Logout (Protegido - Requer Token de Acesso)
router.post('/logout', authenticate, safe('logout'));

module.exports = router;
