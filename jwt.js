'use strict';

const jwt = require('jsonwebtoken');

// Usamos as chaves do Railway, mas deixamos a sua chave informada como reserva para o servidor não cair
const SECRET = process.env.JWT_SECRET || 'fe17791bacffc4b0e6ace52e48c982d1ecd8a8ecc9a464d68abcc41848cf0590';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fe17791bacffc4b0e6ace52e48c982d1ecd8a8ecc9a464d68abcc41848cf0590';

function generateAccessToken(userId, role) {
  // Removi o 'throw' para o servidor não crashar se o env falhar
  return jwt.sign(
    { sub: String(userId), role },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function generateRefreshToken(userId) {
  return jwt.sign(
    { sub: String(userId) },
    REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
}

function verifyAccessToken(token) {
  // Valida usando a chave definida acima
  return jwt.verify(token, SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken 
};
