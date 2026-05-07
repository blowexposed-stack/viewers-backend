'use strict';

const express = require('express');
const router = express.Router();
const streamerController = require('./streamer.controller');

// Importando os middlewares que você definiu no auth.js
const { authenticate, authorize } = require('./auth');

/**
 * ROTAS PÚBLICAS
 * (Acessíveis sem login)
 */
router.get('/', streamerController.getLiveStreamers);

/**
 * MIDDLEWARE DE AUTENTICAÇÃO
 * A partir desta linha, todas as rotas abaixo exigem um token válido
 */
router.use(authenticate); 

/**
 * ROTAS PRIVADAS (USUÁRIO COMUM)
 * O req.user já estará disponível aqui
 */
router.get('/me', streamerController.getMyStream);
router.patch('/me/go-live', streamerController.goLive);
router.patch('/me/go-offline', streamerController.goOffline);

// Rota de perfil (exemplo de uso individual)
// Note: Removi o "protect" e usei "authenticate" que é o nome real no seu auth.js
router.get('/perfil', authenticate, (req, res) => {
    res.json({ success: true, user: req.user });
});

/**
 * ROTAS ADMINISTRATIVAS
 * Exemplo de uso do middleware de autorização por cargo (role)
 */
// Apenas usuários com a role 'admin' podem deletar
router.delete('/usuario/:id', authorize('admin'), (req, res) => {
    // Lógica para deletar usuário aqui
    res.json({ success: true, message: 'Usuário deletado' });
});

module.exports = router;
