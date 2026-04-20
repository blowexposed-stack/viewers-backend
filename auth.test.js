'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/ranking.controller');
const { paginationRules, validate } = require('../middleware/validate');

// Pública — qualquer um pode ver o ranking
router.get('/', paginationRules, validate, ctrl.getRanking);

module.exports = router;
