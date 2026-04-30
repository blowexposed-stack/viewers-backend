'use strict';

const jwt = require('jsonwebtoken');

// Sincronizado com o seu Railway
const SECRET = process.env.JWT_SECRET || 'fe17791bacffc4b0e6ace52e48c982d1ecd8a8ecc9a464d68abcc41848cf0590';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fe17791bacffc4b0e6ace52e48c982d1ecd8a8ecc9a464d68abcc41848cf0590';

function generateAccessToken(userId, role) {
  return jwt.sign({ sub: String(userId), role }, SECRET, { expiresIn: '7d' });
}

function generateRefreshToken(userId) {
  return jwt.sign({ sub: String(userId) }, REFRESH_SECRET, { expiresIn: '30d' });
}

function verifyAccessToken(token) {
  return jwt.verify(token, SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

// EXPORTAÇÃO ÚNICA E CORRETA
module.exports = { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken 
};
