'use strict';
const express = require('express');
const router  = express.Router();

const ctrl = require('./streamer.controller');
const { authenticate } = require('./auth');

// 🔒 função pra evitar crash se algo estiver undefined
function safeRoute(handler) {
  if (typeof handler !== 'function') {
    throw new Error('Handler da rota não é uma função válida');
  }
  return handler;
}

// ROTAS
router.get('/', safeRoute(ctrl.getLiveStreamers));

router.get('/me',
  authenticate,
  safeRoute(ctrl.getMyStream)
);

router.patch('/me/go-live',
  authenticate,
  safeRoute(ctrl.goLive)
);

router.patch('/me/go-offline',
  authenticate,
  safeRoute(ctrl.goOffline)
);

router.post('/me/drain',
  authenticate,
  safeRoute(ctrl.drainTokens)
);

module.exports = router;
