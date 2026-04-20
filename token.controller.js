'use strict';

const User     = require('../models/User');
const Streamer = require('../models/Streamer');
const AppError = require('../utils/AppError');
const logger   = require('../utils/logger');

// ─── GET /admin/stats — painel de estatísticas gerais ────────────────────────
async function getStats(req, res, next) {
  try {
    const [
      totalUsers,
      activeUsers,
      liveStreamers,
      totalTokensInCirculation,
      newUsersToday,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Streamer.countDocuments({ isLive: true }),
      User.aggregate([{ $group: { _id: null, total: { $sum: '$tokens' } } }]),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          newToday: newUsersToday,
        },
        streamers: {
          liveNow: liveStreamers,
        },
        economy: {
          tokensInCirculation: totalTokensInCirculation[0]?.total || 0,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/users — lista todos os usuários (paginado + busca) ────────────
async function listUsers(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;
    const search = req.query.search?.trim();

    const filter = {};
    if (search) {
      // Sanitização: escape de regex para evitar ReDoS
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { nickname: { $regex: escaped, $options: 'i' } },
        { email:    { $regex: escaped, $options: 'i' } },
      ];
    }

    if (req.query.platform) {
      const VALID = ['twitch', 'youtube', 'kick', 'facebook'];
      if (VALID.includes(req.query.platform)) filter.platform = req.query.platform;
    }

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('nickname email platform role tokens isActive createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /admin/users/:id/suspend — suspende uma conta ─────────────────────
async function suspendUser(req, res, next) {
  try {
    const { id } = req.params;

    // Admin não pode se auto-suspender
    if (id === req.user._id.toString()) {
      return next(new AppError('Você não pode suspender sua própria conta.', 400));
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    logger.warn(`Admin ${req.user._id} suspendeu usuário ${id}`);

    return res.json({ success: true, message: `Usuário ${user.nickname} suspenso.` });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /admin/users/:id/reactivate — reativa uma conta ───────────────────
async function reactivateUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true, loginAttempts: 0, $unset: { lockUntil: 1 } },
      { new: true }
    );

    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    logger.info(`Admin ${req.user._id} reativou usuário ${req.params.id}`);

    return res.json({ success: true, message: `Usuário ${user.nickname} reativado.` });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /admin/users/:id/role — altera o role de um usuário ───────────────
async function changeUserRole(req, res, next) {
  try {
    const { role } = req.body;
    const VALID_ROLES = ['user', 'moderator', 'admin'];

    if (!VALID_ROLES.includes(role)) {
      return next(new AppError(`Role inválido. Valores aceitos: ${VALID_ROLES.join(', ')}.`, 400));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    logger.warn(`Admin ${req.user._id} alterou role de ${req.params.id} para ${role}`);

    return res.json({
      success: true,
      message: `Role de ${user.nickname} alterado para ${role}.`,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /admin/users/:id/adjust-tokens — ajusta tokens manualmente ─────────
async function adjustTokens(req, res, next) {
  try {
    const amount = parseInt(req.body.amount);
    const reason = req.body.reason?.trim();

    if (isNaN(amount)) return next(new AppError('amount deve ser um número.', 400));
    if (!reason)       return next(new AppError('Informe o motivo do ajuste.', 400));
    if (Math.abs(amount) > 10_000) return next(new AppError('Ajuste máximo: ±10.000 tokens.', 400));

    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    const newBalance = user.tokens + amount;
    if (newBalance < 0) return next(new AppError('Saldo resultante não pode ser negativo.', 400));

    await User.findByIdAndUpdate(req.params.id, {
      $inc: { tokens: amount },
    });

    logger.warn(
      `Admin ${req.user._id} ajustou tokens de ${req.params.id}: ` +
      `${amount > 0 ? '+' : ''}${amount} (motivo: ${reason})`
    );

    return res.json({
      success: true,
      message: `${amount > 0 ? '+' : ''}${amount} tokens aplicados a ${user.nickname}.`,
      newBalance,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  listUsers,
  suspendUser,
  reactivateUser,
  changeUserRole,
  adjustTokens,
};
