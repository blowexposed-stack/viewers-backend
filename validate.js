'use strict';

const { body, param, query, validationResult } = require('express-validator');
const AppError = require('./AppError');

// ─── Executa as validações e retorna erros formatados ─────────────────────────
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => `${e.path}: ${e.msg}`).join('. ');
    return next(new AppError(messages, 422));
  }
  next();
}

// ════════════════════════════════════════════════════════════════════════════
//  REGRAS DE VALIDAÇÃO POR ENDPOINT
// ════════════════════════════════════════════════════════════════════════════

const registerRules = [
  body('nickname')
    .trim()
    .notEmpty().withMessage('Nickname obrigatório.')
    .isLength({ min: 3, max: 30 }).withMessage('Nickname: 3–30 caracteres.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Nickname: apenas letras, números e _.'),

  body('email')
    .trim()
    .notEmpty().withMessage('E-mail obrigatório.')
    .isEmail().withMessage('E-mail inválido.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Senha obrigatória.')
    .isLength({ min: 8 }).withMessage('Senha: mínimo 8 caracteres.')
    .matches(/[A-Z]/).withMessage('Senha deve conter ao menos uma letra maiúscula.')
    .matches(/[0-9]/).withMessage('Senha deve conter ao menos um número.')
    .matches(/[!@#$%^&*]/).withMessage('Senha deve conter ao menos um caractere especial (!@#$%^&*).'),

  body('platform')
    .notEmpty().withMessage('Plataforma obrigatória.')
    .isIn(['twitch', 'youtube', 'kick', 'facebook']).withMessage('Plataforma inválida.'),

  body('channelUrl')
    .optional()
    .trim()
    .isURL({ protocols: ['http', 'https'] }).withMessage('URL do canal inválida.'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('E-mail obrigatório.')
    .isEmail().withMessage('E-mail inválido.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Senha obrigatória.'),
];

const updateProfileRules = [
  body('nickname')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Nickname: 3–30 caracteres.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Nickname: apenas letras, números e _.'),

  body('channelUrl')
    .optional()
    .trim()
    .isURL({ protocols: ['http', 'https'] }).withMessage('URL do canal inválida.'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Senha atual obrigatória.'),
  body('newPassword')
    .notEmpty().withMessage('Nova senha obrigatória.')
    .isLength({ min: 8 }).withMessage('Nova senha: mínimo 8 caracteres.')
    .matches(/[A-Z]/).withMessage('Nova senha deve conter ao menos uma letra maiúscula.')
    .matches(/[0-9]/).withMessage('Nova senha deve conter ao menos um número.')
    .matches(/[!@#$%^&*]/).withMessage('Nova senha deve conter ao menos um caractere especial.'),
];

const mongoIdRule = (field = 'id') =>
  param(field).isMongoId().withMessage('ID inválido.');

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page deve ser inteiro >= 1.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit deve ser entre 1 e 100.'),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  updateProfileRules,
  changePasswordRules,
  mongoIdRule,
  paginationRules,
};
