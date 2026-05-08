'use strict';

const jwt = require('jsonwebtoken');

// ESTRATÉGIA DE SEGURANÇA: Secrets carregadas do ambiente ou fallback seguro
const ACCESS_SECRET = process.env.JWT_SECRET || 'fe17791bacffc4b0e6ace52e48c982d1ecd8a8ecc9a464d68abcc41848cf0590';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'e8ee7bf553427bc9d7423eba7e99ea728959afb895f47b6662a5ce4344cdd350';

/**
 * Gera Token de Acesso (Curta duração)
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
 * Verifica se o usuário tem um token válido para acessar qualquer rota protegida
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Token não fornecido.' });
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = {
            ...decoded,
            _id: decoded.sub,
            id: decoded.sub,
        };
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Token inválido ou expirado.' });
    }
};

/**
 * MIDDLEWARE DE AUTORIZAÇÃO (A que estava faltando!)
 * Bloqueia o acesso se o cargo (role) do usuário não for permitido
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        // Verifica se o authenticate já rodou
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Não autenticado.' });
        }

        // Verifica se a role do usuário (ex: 'user', 'admin') está na lista de permitidas
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Privilégios insuficientes para esta ação.' 
            });
        }
        next();
    };
};

// EXPORTAÇÃO COMPLETA: Tudo o que as suas rotas precisam
module.exports = { 
    generateAccessToken, 
    generateRefreshToken, 
    verifyAccessToken, 
    verifyRefreshToken,
    authenticate, 
    authorize 
};
