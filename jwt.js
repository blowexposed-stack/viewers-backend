'use strict';

const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// ─── Gera Access Token (curto prazo) ─────────────────────────────────────────
function generateAccessToken(userId, role) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não definido.');

  return jwt.sign(
    { sub: userId, role, jti: uuidv4() },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'comunidade-viewrs',
      audience: 'comunidade-viewrs-client',
    }
  );
}

// ─── Gera Refresh Token (longo prazo) ────────────────────────────────────────
function generateRefreshToken(userId) {
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET não definido.');

  return jwt.sign(
    { sub: userId, jti: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      issuer: 'comunidade-viewrs',
    }
  );
}

// ─── Verifica Access Token ────────────────────────────────────────────────────
function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'comunidade-viewrs',
    audience: 'comunidade-viewrs-client',
  });
}

// ─── Verifica Refresh Token ───────────────────────────────────────────────────
function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'comunidade-viewrs',
  });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
