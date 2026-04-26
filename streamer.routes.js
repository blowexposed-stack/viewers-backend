'use strict';
const express = require('express');
const router  = express.Router();

// MUDANÇA AQUI: Remova o '../' e use apenas './' 
// Isso diz para o Node procurar o controlador na mesma pasta que as rotas
const ctrl    = require('./streamer.controller'); 

// Mesma coisa aqui para os outros arquivos:
const { authenticate } = require('./auth'); 
const { paginationRules, validate } = require('./validate');

router.get('/', paginationRules, validate, ctrl.getLiveStreamers);
router.get('/me', authenticate, ctrl.getMyStream);

// Essa é a função que você acabou de me mandar corrigida:
router.patch('/me/go-live', authenticate, ctrl.goLive);

router.patch('/me/go-offline', authenticate, ctrl.goOffline);
router.post('/me/drain', authenticate, ctrl.drainTokens);

module.exports = router;
