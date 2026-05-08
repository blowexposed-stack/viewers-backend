'use strict';

const router = require('express').Router();
const ctrl   = require('./ranking.controller');
const { paginationRules, validate } = require('./validate');

// Pública — qualquer um pode ver o ranking
router.get('/', paginationRules, validate, ctrl.getRanking);

module.exports = router;
