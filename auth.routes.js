'use strict';

const router = require('express').Router();
// Importa o controller inteiro como um objeto
const authCtrl = require('./auth.controller');

const { authenticate } = require('./auth');
const { validate, registerRules, loginRules } = require('./validate');

// Função auxiliar para evitar o erro de 'Undefined'
const handle = (methodName) => {
    return (req, res, next) => {
        if (authCtrl && typeof authCtrl[methodName] === 'function') {
            return authCtrl[methodName](req, res, next);
        }
        console.error(`ERRO: A função ${methodName} não foi encontrada no controller.`);
        res.status(501).json({ error: `Rota ${methodName} não implementada no servidor.` });
    };
};

// Agora as rotas NUNCA mais vão dar erro de 'callback function undefined'
router.post('/register', registerRules, validate, handle('register'));
router.post('/login',    loginRules,    validate, handle('login'));
router.post('/refresh',                           handle('refresh'));
router.post('/forgot-password',                   handle('forgotPassword'));
router.post('/reset-password/:token',             handle('resetPassword'));
router.post('/logout',           authenticate,    handle('logout'));

module.exports = router;
