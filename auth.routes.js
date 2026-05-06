'use strict';

const router = require('express').Router();
// Importamos apenas o que vamos usar, garantindo clareza
const authCtrl = require('./auth.controller');

const { authenticate } = require('./auth');
const { validate, registerRules, loginRules } = require('./validate');

/**
 * Se você prefere manter a segurança contra 'undefined', 
 * esta versão simplificada do seu handle resolve sem poluir as rotas.
 */
const safe = (method) => {
    return (req, res, next) => {
        if (authCtrl[method]) return authCtrl[method](req, res, next);
        
        console.error(`[ERRO CRÍTICO]: Método ${method} não encontrado no auth.controller.`);
        res.status(501).json({ error: 'Funcionalidade temporariamente indisponível.' });
    };
};

// --- ROTAS PÚBLICAS ---

// Registro de novo usuário
router.post('/register', registerRules, validate, safe('register'));

// Login e obtenção de tokens
router.post('/login', loginRules, validate, safe('login'));

// Renovação de token (Refresh Token)
router.post('/refresh', safe('refresh'));

// Recuperação de senha
router.post('/forgot-password', safe('forgotPassword'));
router.post('/reset-password/:token', safe('resetPassword'));

// --- ROTAS PROTEGIDAS ---

// Logout (Requer autenticação)
router.post('/logout', authenticate, safe('logout'));

module.exports = router;
