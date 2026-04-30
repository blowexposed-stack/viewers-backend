'use strict';
const jwt = require('jsonwebtoken');

// Sincronizado com o seu Railway
const SECRET = process.env.JWT_SECRET || 'fe17791bacffc4b0e6ace52e48c982d1ecd8a8ecc9a464d68abcc41848cf0590';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fe17791bacffc4b0e6ace52e48c982d1ecd8a8ecc9a464d68abcc41848cf0590';

module.exports = {
  generateAccessToken: (userId, role) => 
    jwt.sign({ sub: String(userId), role }, SECRET, { expiresIn: '7d' }),
    
  generateRefreshToken: (userId) => 
    jwt.sign({ sub: String(userId) }, REFRESH_SECRET, { expiresIn: '30d' }),
    
  verifyAccessToken: (token) => jwt.verify(token, SECRET),
  
  verifyRefreshToken: (token) => jwt.verify(token, REFRESH_SECRET)
};
module.exports = { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken 
};
