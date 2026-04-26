'use strict';
const express = require('express');
const router  = express.Router();

// IMPORTANTE: Se o controller estiver na mesma pasta, use './'
const ctrl    = require('./streamer.controller'); 

const { authenticate } = require('./auth'); // Verifique se o arquivo chama auth.js ou auth.middleware.js

// LINHA 13: Agora o ctrl.getLiveStreamers NÃO será mais Undefined
router.get('/', ctrl.getLiveStreamers);

router.get('/me', authenticate, ctrl.getMyStream);
router.patch('/me/go-live', authenticate, ctrl.goLive);
router.patch('/me/go-offline', authenticate, ctrl.goOffline);
router.post('/me/drain', authenticate, ctrl.drainTokens);

module.exports = router;
