'use strict';
const express = require('express');
const router  = express.Router();
const ctrl    = require('./admin.controller');
const { authenticate, authorize } = require('./auth');

router.use(authenticate, authorize('admin'));

router.get('/stats',              ctrl.getStats);
router.get('/users',              ctrl.getUsers);
router.post('/tokens/add',        ctrl.addTokensToUser);
router.post('/tokens/event',      ctrl.eventTokens);
router.patch('/users/:id/plan',   ctrl.setUserPlan);
router.delete('/users/:id',       ctrl.suspendUser);

module.exports = router;
