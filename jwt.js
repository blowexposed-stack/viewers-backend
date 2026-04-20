'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const {
  validate,
  registerRules,
  loginRules,
} = require('../middleware/validate');

// Públicas
router.post('/register',        registerRules, validate, ctrl.register);
router.post('/login',           loginRules,    validate, ctrl.login);
router.post('/refresh',                                  ctrl.refresh);
router.post('/forgot-password',                          ctrl.forgotPassword);
router.post('/reset-password/:token',                    ctrl.resetPassword);

// Autenticada
router.post('/logout', authenticate, ctrl.logout);

module.exports = router;
