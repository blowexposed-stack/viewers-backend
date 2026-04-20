'use strict';

const User     = require('../models/User');
const AppError = require('../utils/AppError');
const logger   = require('../utils/logger');

// ─── GET /users/me ────────────────────────────────────────────────────────────
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('Usuário não encontrado.', 404));
    return res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /users/me ──────────────────────────────────────────────────────────
async function updateMe(req, res, next) {
  try {
    // Campos permitidos para atualização pelo próprio usuário
    const ALLOWED = ['nickname', 'platform', 'channelUrl'];
    const updates = {};
    ALLOWED.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (Object.keys(updates).length === 0) {
      return next(new AppError('Nenhum campo válido para atualizar.', 400));
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    logger.info(`Perfil atualizado: userId=${req.user._id}`);

    return res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /users/me/password ─────────────────────────────────────────────────
async function changePassword(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    const { currentPassword, newPassword } = req.body;

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) return next(new AppError('Senha atual incorreta.', 401));

    if (currentPassword === newPassword) {
      return next(new AppError('A nova senha deve ser diferente da atual.', 400));
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Senha alterada: userId=${user._id}`);

    return res.json({ success: true, message: 'Senha alterada com sucesso.' });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /users/me ─────────────────────────────────────────────────────────
async function deleteMe(req, res, next) {
  try {
    // Soft delete — desativa conta em vez de apagar
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    logger.info(`Conta desativada: userId=${req.user._id}`);

    res.clearCookie('refreshToken');
    return res.json({ success: true, message: 'Conta desativada com sucesso.' });
  } catch (err) {
    next(err);
  }
}

// ─── GET /users/:id (admin) ───────────────────────────────────────────────────
async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('Usuário não encontrado.', 404));
    return res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, updateMe, changePassword, deleteMe, getUserById };
