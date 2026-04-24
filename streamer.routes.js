'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('./streamer.controller');
const { authenticate } = require('./auth');
const { paginationRules, validate } = require('./validate');

router.get('/',               paginationRules, validate, ctrl.getLiveStreamers);
router.get('/me',             authenticate,              ctrl.getMyStream);
router.patch('/me/go-live',   authenticate,              ctrl.goLive);
router.patch('/me/go-offline',authenticate,              ctrl.goOffline);

module.exports = router;
