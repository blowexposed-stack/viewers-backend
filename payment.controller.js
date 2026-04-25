'use strict';
const User           = require('./User');
const PaymentModel   = require('./Payment');
const paymentService = require('./payment.service');
const emailService   = require('./email.service');
const AppError       = require('./AppError');
const logger         = require('./logger');

// Plano ativado por valor pago
const PLAN_BY_AMOUNT = { 990:'starter', 2490:'pro', 6990:'elite' };

function getPlans(req, res) {
  const plans = Object.entries(paymentService.PLANS).map(([id, p]) => ({
    id, name:p.name, tokens:p.tokens, amountBRL:p.amountBRL,
    amountFormatted: `R$ ${(p.amountBRL/100).toFixed(2).replace('.',',')}`,
    description: p.description, checkoutUrl: p.mpUrl,
  }));
  return res.json({ success:true, data:plans });
}

async function mpWebhook(req, res) {
  res.status(200).json({ received:true });
  try {
    const body = req.body;
    let paymentId = null;
    if (body.type === 'payment' && body.data?.id)          paymentId = String(body.data.id);
    else if (body.topic === 'payment' && body.id)          paymentId = String(body.id);
    else if (body.action?.startsWith('payment') && body.data?.id) paymentId = String(body.data.id);
    if (!paymentId) return;

    const existing = await PaymentModel.findOne({ externalId:paymentId, status:'completed' });
    if (existing) return;

    let paymentData;
    try { paymentData = await paymentService.getPaymentDetails(paymentId); }
    catch(e) { logger.error('[MP] Erro buscar payment:', e.message); return; }

    if (paymentData.status !== 'approved') return;

    const payerEmail = paymentData.payer?.email;
    if (!payerEmail) return;

    const user = await User.findOne({ email: payerEmail.toLowerCase() });
    if (!user) { logger.error('[MP] Usuário não encontrado:', payerEmail); return; }

    const planId = paymentService.detectPlanFromPayment(paymentData);
    if (!planId) return;

    const plan        = paymentService.PLANS[planId];
    const tokensToAdd = plan.tokens;

    await Promise.all([
      User.findByIdAndUpdate(user._id, {
        $inc: { tokens: tokensToAdd, totalTokensEarned: tokensToAdd },
        activePlan:    planId,
        planExpiresAt: new Date(Date.now() + 30*24*60*60*1000),
      }),
      PaymentModel.findOneAndUpdate(
        { externalId: paymentId },
        { $setOnInsert: { user:user._id, externalId:paymentId, planId, amountBRL: Math.round(paymentData.transaction_amount*100), tokens:tokensToAdd, gateway:'mercadopago', webhookPayload:paymentData },
          $set: { status:'completed', paidAt: new Date() } },
        { upsert:true, new:true }
      ),
    ]);

    logger.info(`[MP] Pagamento OK: ${user.nickname} plano=${planId} +${tokensToAdd} tokens`);

    const io = global._io;
    if (io) io.to(`user:${user._id}`).emit('payment:completed', { tokens:tokensToAdd, plan:planId });

    emailService.sendPaymentConfirmation(user.email, user.nickname, plan.name, Math.round(paymentData.transaction_amount*100))
      .catch(()=>{});
  } catch(err) { logger.error('[MP] Webhook erro:', err); }
}

async function getHistory(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const [payments, total] = await Promise.all([
      PaymentModel.find({ user:req.user._id, status:'completed' })
        .sort({ createdAt:-1 }).skip((page-1)*limit).limit(limit).lean(),
      PaymentModel.countDocuments({ user:req.user._id, status:'completed' }),
    ]);
    return res.json({ success:true, data:payments, pagination:{ page, limit, total, pages:Math.ceil(total/limit) } });
  } catch(err) { next(err); }
}

module.exports = { getPlans, mpWebhook, getHistory };
