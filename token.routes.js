'use strict';

const router = require('express').Router();
const ctrl   = require('./token.controller');
const { authenticate } = require('./auth');

router.use(authenticate);

router.get ('/balance', ctrl.balance);
router.post('/earn',    ctrl.earn);
router.post('/spend',   ctrl.spend);

module.exports = router;
