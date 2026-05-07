'use strict';

const express = require('express');
const router = express.Router();
const streamerController = require('./streamer.controller');
const { protect } = require('./auth.middleware'); // Mantenha a proteção!

// 1. Rota que TODOS podem ver (Pública)
router.get('/', streamerController.getLiveStreamers);

// 2. Tudo abaixo desta linha EXIGE que o usuário esteja logado
router.use(protect); 

// 3. Rotas que precisam saber QUEM é o usuário (Privadas)
router.get('/me', streamerController.getMyStream);
router.patch('/me/go-live', streamerController.goLive);
router.patch('/me/go-offline', streamerController.goOffline);

module.exports = router;
