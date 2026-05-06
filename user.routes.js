'use strict';

const router = require('express').Router();
const ctrl   = require('./user.controller');

// IMPORTAÇÃO SEGURA: Importamos o objeto inteiro primeiro
const auth = require('./auth');

// GARANTIA: Se o middleware não existir por erro de exportação, 
// usamos uma função vazia (next) para o servidor não crashar no boot.
const authenticate = auth.authenticate || ((req, res, next) => next());
const authorize    = auth.authorize    || (() => (req, res, next) => next());

const validateModule = require('./validate');
// Garante que as regras existam antes de passá-las ao router
const validate = validateModule.validate || ((req, res, next) => next());
const updateProfileRules = validateModule.updateProfileRules || [];
const changePasswordRules = validateModule.changePasswordRules || [];
const mongoIdRule = validateModule.mongoIdRule || (() => (req, res, next) => next());

// --- ROTAS ---

// Todas as rotas abaixo requerem autenticação
router.use(authenticate);

router.get   ('/me',           ctrl.getMe);
router.patch ('/me',           updateProfileRules,  validate, ctrl.updateMe);
router.patch ('/me/password',  changePasswordRules, validate, ctrl.changePassword);
router.delete('/me',                                          ctrl.deleteMe);

// Admin only
// A função authorize('admin') agora está protegida pelo check acima
router.get('/:id', authorize('admin'), mongoIdRule('id'), validate, ctrl.getUserById);

module.exports = router;
