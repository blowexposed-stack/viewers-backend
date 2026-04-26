'use strict';
const express = require('express');
const router  = express.Router();

// Importe o controller onde você colou a função goLive
const ctrl    = require('../controllers/streamer.controller'); 

// Importe os seus middlewares (ajuste o caminho se a pasta for diferente)
const { authenticate } = require('../middlewares/auth');
const { paginationRules, validate } = require('../middlewares/validate');

// Definição das Rotas
// Listar todos os streamers que estão online
router.get('/', paginationRules, validate, ctrl.getLiveStreamers);

// Pegar os dados do próprio perfil (requer login)
router.get('/me', authenticate, ctrl.getMyStream);

// Rota que você corrigiu (Ligar Live)
router.patch('/me/go-live', authenticate, ctrl.goLive);

// Rota para desligar a live
router.patch('/me/go-offline', authenticate, ctrl.goOffline);

// Rota de tokens/finanças
router.post('/me/drain', authenticate, ctrl.drainTokens);

// --- ESSA LINHA ABAIXO É A QUE ESTÁ FALTANDO E CAUSA O ERRO NO RAILWAY ---
module.exports = router;
