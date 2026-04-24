'use strict';

const router = require('express').Router();
const ctrl   = require('./admin.controller');
const { authenticate, authorize } = require('./auth');
const { mongoIdRule, paginationRules, validate } = require('./validate');
const { body } = require('express-validator');

// Todas as rotas exigem autenticação + role admin
router.use(authenticate, authorize('admin'));

router.get ('/stats',                                                  ctrl.getStats);
router.get ('/users',          paginationRules, validate,             ctrl.listUsers);
router.patch('/users/:id/suspend',    mongoIdRule('id'), validate,    ctrl.suspendUser);
router.patch('/users/:id/reactivate', mongoIdRule('id'), validate,    ctrl.reactivateUser);
router.patch('/users/:id/role',
  mongoIdRule('id'),
  body('role').notEmpty().withMessage('Role obrigatório.'),
  validate,
  ctrl.changeUserRole,
);
router.post('/users/:id/adjust-tokens',
  mongoIdRule('id'),
  body('amount').isInt().withMessage('amount deve ser inteiro.'),
  body('reason').notEmpty().withMessage('Motivo obrigatório.'),
  validate,
  ctrl.adjustTokens,
);

module.exports = router;
