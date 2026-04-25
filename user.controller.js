'use strict';

const User     = require('./User');
const AppError = require('./AppError');
const logger   = require('./logger');

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('Usuário não encontrado.', 404));
    return res.json({ success:true, data:user });
  } catch(err) { next(err); }
}

async function updateMe(req, res, next) {
  try {
    const ALLOWED = ['nickname','platform','channelUrl','liveNick'];
    const updates = {};
    ALLOWED.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (!Object.keys(updates).length) return next(new AppError('Nenhum campo válido.', 400));

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new:true, runValidators:true });
    logger.info(`Perfil atualizado: userId=${req.user._id}`);
    return res.json({ success:true, data:user });
  } catch(err) { next(err); }
}

async function changePassword(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return next(new AppError('Usuário não encontrado.', 404));
    const { currentPassword, newPassword } = req.body;
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) return next(new AppError('Senha atual incorreta.', 401));
    if (currentPassword === newPassword) return next(new AppError('Nova senha deve ser diferente.', 400));
    user.password = newPassword;
    await user.save();
    logger.info(`Senha alterada: userId=${user._id}`);
    return res.json({ success:true, message:'Senha alterada.' });
  } catch(err) { next(err); }
}

async function deleteMe(req, res, next) {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive:false });
    res.clearCookie('refreshToken');
    return res.json({ success:true, message:'Conta desativada.' });
  } catch(err) { next(err); }
}

async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('Usuário não encontrado.', 404));
    return res.json({ success:true, data:user });
  } catch(err) { next(err); }
}

module.exports = { getMe, updateMe, changePassword, deleteMe, getUserById };
