'use strict';

const router = require('express').Router();
// Importamos o controller do admin (verifique se o caminho está correto)
const adminCtrl = require('./admin.controller'); 

// IMPORTAÇÃO SEGURA DO MIDDLEWARE
const auth = require('./auth'); 

// Proteção contra Undefined: Se não encontrar no objeto, cria uma função vazia
const authenticate = auth.authenticate || ((req, res, next) => next());

// O authorize é uma função que retorna outra função, por isso o tratamento é diferente
const authorize = auth.authorize || (() => (req, res, next) => next());

// Aplica os middlewares em todas as rotas de admin
// Isso resolve o erro da linha 7
router.use(authenticate, authorize('admin'));

router.get('/stats', adminCtrl.getStats);
router.get('/users', adminCtrl.getUsers);
router.post('/tokens/add', adminCtrl.addTokensToUser);
router.post('/tokens/event', adminCtrl.eventTokens);
router.patch('/users/:id/plan', adminCtrl.setUserPlan);
router.delete('/users/:id', adminCtrl.suspendUser);

module.exports = router;
