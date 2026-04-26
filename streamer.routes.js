'use strict';
const express = require('express');
const router = express.Router();
const streamerController = require('./streamer.controller');
const { protect } = require('./auth.middleware'); // Se você usar proteção

// Verifique se os nomes depois do ponto (.) são IGUAIS aos do controller
router.get('/', streamerController.getLiveStreamers); 
router.get('/me', protect, streamerController.getMyStream);
router.patch('/me/go-live', protect, streamerController.goLive);
router.patch('/me/go-offline', protect, streamerController.goOffline);

module.exports = router;
