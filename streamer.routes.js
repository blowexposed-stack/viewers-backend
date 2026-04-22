'use strict';

const router = require('express').Router();
const ctrl   = require('./streamer.controller');
const { authenticate } = require('./auth');
const { paginationRules, validate } = require('./validate');

// Pública
router.get('/', paginationRules, validate, ctrl.getLiveStreamers);

// Protegidas
router.patch('/me/go-live',    authenticate, ctrl.goLive);
router.patch('/me/go-offline', authenticate, ctrl.goOffline);

module.exports = router;
