'use strict';

const express = require('express');
const router = express.Router();
const streamerController = require('./streamer.controller');
const { authenticate } = require('./auth');

/**
 * ROTAS PÚBLICAS
 * Qualquer pessoa (logada ou não) pode acessar.
 */
router.get('/', streamerController.getLiveStreamers);

/**
 * MIDDLEWARE DE PROTEÇÃO (Filtro)
 * Todas as rotas abaixo desta linha exigem que o usuário esteja logado.
 * Isso evita que você precise colocar 'protect' em cada linha individualmente.
 */
router.use(authenticate);

/**
 * ROTAS PRIVADAS (Requerem Autenticação)
 * O 'protect' garante que o 'req.user' exista antes de chegar no controller.
 */
router.route('/me')
    .get(streamerController.getMyStream);

router.patch('/me/go-live', streamerController.goLive);
router.patch('/me/go-offline', streamerController.goOffline);
router.post('/me/drain', streamerController.drainTokens);

router.post('/', streamerController.createStream);
router.patch('/:id', streamerController.updateStream);
router.delete('/:id', streamerController.deleteStream);
router.patch('/:id/go-live', streamerController.goLive);
router.patch('/:id/go-offline', streamerController.goOffline);
router.post('/:id/drain', streamerController.drainTokens);

module.exports = router;
