'use strict';

const router = require('express').Router();
const ctrl = require('./auth.controller');
const { authenticate } = require('./auth');
const { validate, registerRules, loginRules } = require('./validate');

// Função de emergência: se o método não existir no controller, ela avisa no log mas NÃO quebra o servidor
const execute = (name) => (req, res, next) => {
    if (ctrl && typeof ctrl[name] === 'function') {
        return ctrl[name](req, res, next);
    }
    console.error(`ERRO: O método ${name} não foi encontrado no controller.`);
    res.status(500).json({ error: "Método não implementado" });
};

// Definindo as rotas (Linha 30 agora terá uma função real)
router.post('/register', registerRules, validate, execute('register'));
router.post('/login',    loginRules,    validate, execute('login'));
router.post('/refresh',                           execute('refresh'));
router.post('/forgot-password',                   execute('forgotPassword'));
router.post('/reset-password/:token',             execute('resetPassword'));
router.post('/logout',           authenticate,    execute('logout'));

module.exports = router;
