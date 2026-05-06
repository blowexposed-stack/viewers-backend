'use strict';

const jwt = require('jsonwebtoken');

// ESTRATÉGIA DE SEGURANÇA: Nunca use a mesma Secret para os dois tokens
const ACCESS_SECRET = process.env.JWT_SECRET || 'sua_chave_acesso_ultra_secreta';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'sua_chave_refresh_mais_secreta_ainda';

/**
 * Gera Token de Acesso (Curta duração)
 * Estratégia: 15 minutos a 1 hora. Se for roubado, expira logo.
 */
function generateAccessToken(userId, role) {
  return jwt.sign(
    { sub: String(userId), role }, 
    ACCESS_SECRET, 
    { expiresIn: '1h' } 
  );
}

/**
 * Gera Token de Atualização (Longa duração)
 * Estratégia: 30 dias. Fica guardado no Cookie HttpOnly.
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    { sub: String(userId) }, 
    REFRESH_SECRET, 
    { expiresIn: '30d' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * MIDDLEWARE DE AUTENTICAÇÃO
 * Resolve o erro "Route.post() requires a callback function but got a [object Undefined]"
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // Salva sub (id) e role no request
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
};

// EXPORTAÇÃO COMPLETA: Garante que o auth.routes.js encontre tudo
module.exports = { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken,
  authenticate // <--- Isso resolve o seu crash no Railway
};
