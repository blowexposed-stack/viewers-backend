'use strict';
const User     = require('./User');
const Streamer = require('./Streamer');
const Payment  = require('./Payment');
const AppError = require('./AppError');
const logger   = require('./logger');

// ─── GET /admin/stats — estatísticas gerais ───────────────────────────────────
async function getStats(req, res, next) {
  try {
    const [totalUsers, onlineStreams, totalPayments, recentUsers] = await Promise.all([
      User.countDocuments({ isActive:true }),
      Streamer.countDocuments({ isLive:true }),
      Payment.countDocuments({ status:'completed' }),
      User.find({ isActive:true }).sort({ createdAt:-1 }).limit(5)
        .select('nickname email platform createdAt tokens activePlan').lean(),
    ]);
    return res.json({ success:true, data: { totalUsers, onlineStreams, totalPayments, recentUsers } });
  } catch(err) { next(err); }
}

// ─── GET /admin/users — lista todos os usuários ───────────────────────────────
async function getUsers(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const search = req.query.search || '';
    const filter = { isActive:true };
    if (search) filter.$or = [
      { nickname: { $regex: search, $options:'i' } },
      { email:    { $regex: search, $options:'i' } },
    ];
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt:-1 }).skip((page-1)*limit).limit(limit)
        .select('nickname email platform tokens activePlan createdAt lastLogin viewersReceived').lean(),
      User.countDocuments(filter),
    ]);
    return res.json({ success:true, data:users, pagination:{ page, limit, total, pages: Math.ceil(total/limit) } });
  } catch(err) { next(err); }
}

// ─── POST /admin/tokens/add — adiciona tokens a um usuário ───────────────────
async function addTokensToUser(req, res, next) {
  try {
    const { userId, amount, reason } = req.body;
    if (!userId || !amount || amount <= 0) return next(new AppError('userId e amount obrigatórios.', 400));

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { tokens: amount, totalTokensEarned: amount } },
      { new:true }
    );
    if (!user) return next(new AppError('Usuário não encontrado.', 404));

    logger.info(`[Admin] +${amount} tokens para ${user.nickname} | motivo: ${reason || 'manual'}`);
    return res.json({ success:true, message:`${amount} tokens adicionados para ${user.nickname}.`, newBalance: user.tokens });
  } catch(err) { next(err); }
}

// ─── POST /admin/tokens/event — MODO EVENTO: adiciona tokens a TODOS ─────────
async function eventTokens(req, res, next) {
  try {
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) return next(new AppError('amount obrigatório e maior que 0.', 400));

    const result = await User.updateMany(
      { isActive:true },
      { $inc: { tokens: amount, totalTokensEarned: amount } }
    );

    logger.info(`[Admin] EVENTO: +${amount} tokens para ${result.modifiedCount} usuários | ${reason}`);
    return res.json({
      success: true,
      message: `Evento realizado! +${amount} tokens adicionados para ${result.modifiedCount} usuários.`,
      usersUpdated: result.modifiedCount,
    });
  } catch(err) { next(err); }
}

// ─── PATCH /admin/users/:id/plan — muda plano do usuário ─────────────────────
async function setUserPlan(req, res, next) {
  try {
    const { plan } = req.body;
    const validPlans = ['none','starter','pro','elite'];
    if (!validPlans.includes(plan)) return next(new AppError('Plano inválido.', 400));

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { activePlan: plan, planExpiresAt: plan !== 'none' ? new Date(Date.now() + 30*24*60*60*1000) : null },
      { new:true }
    );
    if (!user) return next(new AppError('Usuário não encontrado.', 404));
    return res.json({ success:true, message:`Plano ${plan} ativado para ${user.nickname}.` });
  } catch(err) { next(err); }
}

// ─── DELETE /admin/users/:id — suspende usuário ───────────────────────────────
async function suspendUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive:false }, { new:true });
    if (!user) return next(new AppError('Usuário não encontrado.', 404));
    return res.json({ success:true, message:`Usuário ${user.nickname} suspenso.` });
  } catch(err) { next(err); }
}

module.exports = { getStats, getUsers, addTokensToUser, eventTokens, setUserPlan, suspendUser };
