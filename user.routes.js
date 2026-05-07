'use strict';

const express = require('express');
const router = express.Router();
const streamerController = require('./streamer.controller');

// Importação mais segura do middleware
const authMiddleware = require('./auth');

// Verifica se 'protect' existe dentro do arquivo importado, 
// senão tenta usar o arquivo importado diretamente como a função de proteção.
const protect = authMiddleware.protect || authMiddleware;

// 1. Rota Pública
router.get('/', streamerController.getLiveStreamers);

// 2. Middleware de Proteção aplicado a todas as rotas abaixo
// Se 'protect' for undefined aqui, o Express dará o erro que você viu.
router.use(protect);

// 3. Rotas Privadas (req.user estará disponível aqui)
router.get('/me', streamerController.getMyStream);
router.patch('/me/go-live', streamerController.goLive);
router.patch('/me/go-offline', streamerController.goOffline);

module.exports = router;
