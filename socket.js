'use strict';

const crypto         = require('crypto');
const UserModel      = require('../models/User');
const PaymentModel   = require('../models/Payment');
const paymentService = require('../services/payment.service');
const emailService   = require('../services/email.service');
const AppError       = require('../utils/AppError');
const logger         = require('../utils/logger');

// ════════════════════════════════════════════════════════════════════
//  GET /payments/plans — lista planos com links do MP
// ════════════════════════════════════════════════════════════════════
function getPlans(req, res) {
  const plans = Object.entries(paymentService.PLANS).map(([id, plan]) => ({
    id,
    name:             plan.name,
    tokens:           plan.tokens,
    amountBRL:        plan.amountBRL,
    amountFormatted:  `R$ ${(plan.amountBRL / 100).toFixed(2).replace('.', ',')}`,
    description:      plan.description,
    checkoutUrl:      plan.mpUrl,
  }));
  return res.json({ success: true, data: plans });
}

// ════════════════════════════════════════════════════════════════════
//  POST /payments/webhook — recebe notificações do Mercado Pago
//
//  O MP envia dois formatos:
//  1) IPN clássico:  { id, topic: "payment" }
//  2) Webhooks v2:   { type: "payment", data: { id: "..." } }
// ════════════════════════════════════════════════════════════════════
async function mpWebhook(req, res) {
  // Responde 200 imediatamente — MP requer resposta rápida
  res.status(200).json({ received: true });

  try {
    const body = req.body;

    // ── Extrai payment_id dos dois formatos ──────────────────────────
    let paymentId = null;

    if (body.type === 'payment' && body.data?.id) {
      paymentId = String(body.data.id);                 // Webhooks v2
    } else if (body.topic === 'payment' && body.id) {
      paymentId = String(body.id);                      // IPN clássico
    } else if (body.action === 'payment.created' || body.action === 'payment.updated') {
      paymentId = String(body.data?.id || '');          // Webhooks v1
    }

    if (!paymentId) {
      logger.info(`[MP Webhook] Evento ignorado: ${JSON.stringify(body).slice(0, 100)}`);
      return;
    }

    logger.info(`[MP Webhook] Processando payment_id: ${paymentId}`);

    // ── Idempotência: já processamos este pagamento? ──────────────────
    const existing = await PaymentModel.findOne({
      externalId: paymentId,
      status: 'completed',
    });
    if (existing) {
      logger.warn(`[MP Webhook] Pagamento ja processado: ${paymentId}`);
      return;
    }

    // ── Busca detalhes na API do MP ───────────────────────────────────
    let paymentData;
    try {
      paymentData = await paymentService.getPaymentDetails(paymentId);
    } catch (err) {
      logger.error(`[MP Webhook] Erro ao buscar payment ${paymentId}:`, err.message);
      return;
    }

    logger.info(`[MP Webhook] Status: ${paymentData.status} | Valor: R$${paymentData.transaction_amount}`);

    // ── Só processa pagamentos aprovados ─────────────────────────────
    if (paymentData.status !== 'approved') {
      logger.info(`[MP Webhook] Pagamento nao aprovado (${paymentData.status}), ignorando.`);

      // Registra rejeicoes para auditoria
      if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
        await PaymentModel.findOneAndUpdate(
          { externalId: paymentId },
          { status: paymentData.status === 'rejected' ? 'rejected' : 'expired' },
          { upsert: false }
        );
      }
      return;
    }

    // ── Identifica o pagador pelo e-mail ──────────────────────────────
    const payerEmail = paymentData.payer?.email;
    if (!payerEmail) {
      logger.error(`[MP Webhook] E-mail do pagador ausente para payment_id=${paymentId}`);
      return;
    }

    const user = await UserModel.findOne({ email: payerEmail.toLowerCase() });
    if (!user) {
      logger.error(`[MP Webhook] Usuario nao encontrado para e-mail: ${payerEmail}`);
      // Salva o pagamento órfão para resolver manualmente
      await PaymentModel.create({
        user:           '000000000000000000000000', // placeholder
        externalId:     paymentId,
        planId:         'starter',
        amountBRL:      Math.round(paymentData.transaction_amount * 100),
        tokens:         0,
        gateway:        'mercadopago',
        status:         'pending', // admin resolve
        webhookPayload: paymentData,
        paidAt:         new Date(),
      }).catch(() => {});
      return;
    }

    // ── Detecta qual plano foi comprado ───────────────────────────────
    const planId = paymentService.detectPlanFromPayment(paymentData);
    if (!planId) {
      logger.error(`[MP Webhook] Plano nao detectado para payment_id=${paymentId}`);
      return;
    }

    const plan       = paymentService.PLANS[planId];
    const tokensToAdd = plan.tokens;

    // ── Credita tokens + registra pagamento (atomico) ─────────────────
    const [updatedUser] = await Promise.all([
      UserModel.findByIdAndUpdate(
        user._id,
        { $inc: { tokens: tokensToAdd, totalTokensEarned: tokensToAdd } },
        { new: true }
      ),
      PaymentModel.findOneAndUpdate(
        { externalId: paymentId },
        {
          $setOnInsert: {
            user:           user._id,
            externalId:     paymentId,
            planId,
            amountBRL:      Math.round(paymentData.transaction_amount * 100),
            tokens:         tokensToAdd,
            gateway:        'mercadopago',
            webhookPayload: paymentData,
          },
          $set: {
            status:  'completed',
            paidAt:  new Date(),
          },
        },
        { upsert: true, new: true }
      ),
    ]);

    logger.info(`[MP Webhook] SUCESSO: userId=${user._id} plano=${planId} tokens=+${tokensToAdd} saldo=${updatedUser.tokens}`);

    // ── Notifica via WebSocket (tempo real) ───────────────────────────
    const io = global._io;
    if (io) {
      io.to(`user:${user._id}`).emit('payment:completed', {
        tokens:  tokensToAdd,
        balance: updatedUser.tokens,
        plan:    planId,
      });
    }

    // ── Envia e-mail de confirmacao ───────────────────────────────────
    emailService.sendPaymentConfirmation(
      user.email,
      user.nickname,
      plan.name,
      Math.round(paymentData.transaction_amount * 100)
    ).catch(err => logger.error('[Email] Falha confirmacao pagamento:', err.message));

  } catch (err) {
    logger.error('[MP Webhook] Erro inesperado:', err);
  }
}

// ════════════════════════════════════════════════════════════════════
//  GET /payments/history — historico do usuario logado
// ════════════════════════════════════════════════════════════════════
async function getHistory(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);

    const [payments, total] = await Promise.all([
      PaymentModel.find({ user: req.user._id, status: 'completed' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PaymentModel.countDocuments({ user: req.user._id, status: 'completed' }),
    ]);

    return res.json({
      success: true,
      data: payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// ════════════════════════════════════════════════════════════════════
//  POST /payments/manual — admin credita tokens manualmente
// ════════════════════════════════════════════════════════════════════
async function manualCredit(req, res, next) {
  try {
    const { userId, planId, reason } = req.body;

    const plan = paymentService.PLANS[planId];
    if (!plan) return next(new AppError('Plano invalido.', 400));

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { tokens: plan.tokens, totalTokensEarned: plan.tokens } },
      { new: true }
    );
    if (!user) return next(new AppError('Usuario nao encontrado.', 404));

    await PaymentModel.create({
      user:      userId,
      externalId: `manual_${Date.now()}_${userId}`,
      planId,
      amountBRL:  plan.amountBRL,
      tokens:     plan.tokens,
      gateway:    'manual',
      status:     'completed',
      paidAt:     new Date(),
    });

    logger.info(`[Manual] Admin creditou ${plan.tokens} tokens para userId=${userId} motivo=${reason}`);

    const io = global._io;
    if (io) {
      io.to(`user:${userId}`).emit('payment:completed', {
        tokens:  plan.tokens,
        balance: user.tokens,
        plan:    planId,
      });
    }

    return res.json({
      success: true,
      message: `${plan.tokens} tokens creditados para ${user.nickname}.`,
      newBalance: user.tokens,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPlans, mpWebhook, getHistory, manualCredit };
