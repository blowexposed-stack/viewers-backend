'use strict';

const { MercadoPagoConfig, Payment } = require('mercadopago');
const logger = require('./logger');

// ─── Planos — sincronizados com os links do MP ────────────────────────────────
const PLANS = {
  starter: {
    name:        'Starter',
    tokens:      100,
    amountBRL:   990,   // centavos
    mpLinkId:    '2ijhdqV',
    mpUrl:       'https://mpago.la/2ijhdqV',
    description: '100 tokens para boostar suas lives',
  },
  pro: {
    name:        'Pro',
    tokens:      300,
    amountBRL:   2490,
    mpLinkId:    '25aBBfq',
    mpUrl:       'https://mpago.la/25aBBfq',
    description: '300 tokens + prioridade no ranking',
  },
  elite: {
    name:        'Elite',
    tokens:      1000,
    amountBRL:   6990,
    mpLinkId:    '2kMbtut',
    mpUrl:       'https://mpago.la/2kMbtut',
    description: '1000 tokens + badge exclusiva',
  },
};

// Mapa reverso: mpLinkId -> planId (para lookup no webhook)
const LINK_TO_PLAN = {};
Object.entries(PLANS).forEach(([planId, plan]) => {
  LINK_TO_PLAN[plan.mpLinkId] = planId;
});

// ─── Cliente MP (lazy init) ───────────────────────────────────────────────────
let _mpPayment = null;

function getMPClient() {
  if (_mpPayment) return _mpPayment;
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN não definido nas variáveis de ambiente.');
  const client = new MercadoPagoConfig({ accessToken: token });
  _mpPayment = new Payment(client);
  return _mpPayment;
}

// ─── Busca detalhes de um pagamento MP pelo payment_id ───────────────────────
async function getPaymentDetails(paymentId) {
  const mp = getMPClient();
  const result = await mp.get({ id: paymentId });
  return result;
}

// ─── Detecta qual plano foi pago pelo valor ou pela URL de origem ─────────────
function detectPlanFromPayment(paymentData) {
  const amount = Math.round((paymentData.transaction_amount || 0) * 100); // converte para centavos

  // Tenta bater pelo valor exato
  for (const [planId, plan] of Object.entries(PLANS)) {
    if (plan.amountBRL === amount) return planId;
  }

  // Tenta bater pela URL de origem (metadata ou additional_info)
  const originUrl = paymentData.additional_info?.items?.[0]?.id || '';
  for (const [linkId, planId] of Object.entries(LINK_TO_PLAN)) {
    if (originUrl.includes(linkId)) return planId;
  }

  logger.warn(`[MP] Nao foi possivel detectar plano para pagamento valor=${amount}`);
  return null;
}

module.exports = {
  PLANS,
  LINK_TO_PLAN,
  getPaymentDetails,
  detectPlanFromPayment,
};
