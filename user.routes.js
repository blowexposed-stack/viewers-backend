'use strict';

const router = require('express').Router();
const ctrl = require('./user.controller');
const { authenticate, authorize } = require('./auth');
const {
  validate,
  updateProfileRules,
  changePasswordRules,
  mongoIdRule,
} = require('./validate');

router.use(authenticate);

router.get('/me', ctrl.getMe);
router.patch('/me', updateProfileRules, validate, ctrl.updateMe);
router.patch('/me/password', changePasswordRules, validate, ctrl.changePassword);
router.delete('/me', ctrl.deleteMe);

router.get('/:id', authorize('admin', 'moderator'), mongoIdRule('id'), validate, ctrl.getUserById);

module.exports = router;
