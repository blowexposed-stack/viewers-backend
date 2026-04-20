'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const User   = require('../models/User');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// ─── Autentica JWT ────────────────────────────────────────────────────────────
async function authenticate(req, res, next) {
  try {
    // 1. Extrai o token do header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Token de autenticação não fornecido.', 401));
    }

    const token = authHeader.split(' ')[1];

    // 2. Verifica e decodifica o token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Sessão expirada. Faça login novamente.', 401));
      }
      return next(new AppError('Token inválido.', 401));
    }

    // 3. Busca o usuário (verifica se ainda existe e está ativo)
    const user = await User.findById(decoded.sub).select('+isActive +role');
    if (!user) return next(new AppError('Usuário não encontrado.', 401));
    if (!user.isActive) return next(new AppError('Conta suspensa. Entre em contato com o suporte.', 403));

    // 4. Injeta o usuário na request
    req.user = user;
    next();
  } catch (err) {
    logger.error('Erro no middleware de autenticação:', err);
    next(new AppError('Erro de autenticação.', 500));
  }
}

// ─── Autorização por role ─────────────────────────────────────────────────────
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Não autenticado.', 401));

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Você não tem permissão para esta ação.', 403));
    }

    next();
  };
}

module.exports = { authenticate, authorize };
