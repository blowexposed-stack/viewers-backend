'use strict';
// streamer.routes.js (Temporário para teste)
const express = require('express');
const router = express.Router();
const streamerController = require('./streamer.controller');
// const { protect } = require('./auth.middleware'); <--- Comente essa linha

router.get('/', streamerController.getLiveStreamers); 
router.get('/me', streamerController.getMyStream); // Retire o 'protect' daqui
router.patch('/me/go-live', streamerController.goLive); // Retire o 'protect' daqui
router.patch('/me/go-offline', streamerController.goOffline); // Retire o 'protect' daqui

module.exports = router;
