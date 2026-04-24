'use strict';

const nodemailer = require('nodemailer');
const logger     = require('./logger');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool:   true,
  });
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    logger.warn(`[Email] SMTP não configurado. E-mail para ${to} ignorado.`);
    return;
  }
  try {
    const info = await getTransporter().sendMail({
      from: `"Comunidade Viewers" <${process.env.SMTP_USER}>`,
      to, subject, html,
    });
    logger.info(`[Email] Enviado para ${to} | ${info.messageId}`);
    return info;
  } catch(err) {
    logger.error(`[Email] Falha ao enviar para ${to}:`, err.message);
  }
}

// ─── E-mail de boas-vindas para o novo usuário ────────────────────────────────
async function sendWelcomeEmail({ to, nickname, platform }) {
  const html = `
  <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
  <body style="background:#0d0d0d;font-family:Inter,Arial,sans-serif;padding:40px 20px">
    <div style="max-width:560px;margin:0 auto;background:#1e1e1e;border-radius:16px;overflow:hidden;border:1px solid #2e2e2e">
      <div style="background:linear-gradient(135deg,#5b21b6,#7c3aed);padding:32px;text-align:center">
        <div style="font-size:32px;margin-bottom:8px">👁️</div>
        <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-0.5px">Comunidade Viewers</h1>
        <p style="color:rgba(255,255,255,.7);margin:6px 0 0;font-size:13px">Viewers reais para sua live</p>
      </div>
      <div style="padding:32px">
        <h2 style="color:#f2f2f2;font-size:18px;margin:0 0 12px">Bem-vindo, ${nickname}! 🎉</h2>
        <p style="color:#999;font-size:14px;line-height:1.7">Sua conta foi criada com sucesso. Agora você faz parte da comunidade!</p>
        <div style="background:#252525;border-radius:10px;padding:16px;margin:20px 0">
          <p style="color:#f2f2f2;font-size:13px;margin:0 0 8px;font-weight:600">🚀 Próximos passos:</p>
          <ol style="color:#999;font-size:13px;line-height:1.8;margin:0;padding-left:18px">
            <li>Vá em <strong style="color:#9d5cf7">Minhas Transmissões</strong> e cadastre seu canal</li>
            <li>Ative o status <strong style="color:#22c55e">Online</strong> para receber viewers</li>
            <li>Clique em <strong style="color:#9d5cf7">Assistir Transmissões</strong> para ganhar tokens</li>
            <li>Use seus tokens para receber viewers na sua live!</li>
          </ol>
        </div>
        <p style="color:#555;font-size:12px;margin:0">Plataforma cadastrada: <strong style="color:#9d5cf7">${platform || 'não informada'}</strong></p>
      </div>
      <div style="background:#141414;padding:16px;text-align:center;border-top:1px solid #2e2e2e">
        <p style="color:#555;font-size:11px;margin:0">© 2025 Comunidade Viewers. Todos os direitos reservados.</p>
      </div>
    </div>
  </body></html>`;

  return sendEmail({ to, subject: '🎉 Bem-vindo à Comunidade Viewers!', html });
}

// ─── Notificação de novo cadastro para o ADMIN ────────────────────────────────
async function sendAdminNewUserNotification({ nickname, email, platform }) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'blowexposed@gmail.com';
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const html = `
  <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
  <body style="background:#f5f5f5;font-family:Arial,sans-serif;padding:24px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5">
      <div style="background:#7c3aed;padding:20px 24px">
        <h2 style="color:#fff;margin:0;font-size:16px">🆕 Novo cadastro no site!</h2>
      </div>
      <div style="padding:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#666;font-size:13px;width:120px">👤 Nickname</td><td style="padding:8px 0;font-weight:700;font-size:13px">${nickname}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:13px">📧 E-mail</td><td style="padding:8px 0;font-size:13px">${email}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:13px">📡 Plataforma</td><td style="padding:8px 0;font-size:13px">${platform || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:13px">🕐 Horário</td><td style="padding:8px 0;font-size:13px">${now}</td></tr>
        </table>
      </div>
      <div style="background:#f9f9f9;padding:14px 24px;border-top:1px solid #e5e5e5">
        <p style="color:#999;font-size:11px;margin:0">Comunidade Viewers — Notificação automática</p>
      </div>
    </div>
  </body></html>`;

  return sendEmail({ to: ADMIN_EMAIL, subject: `🆕 Novo usuário: ${nickname} (${email})`, html });
}

// ─── Confirmação de pagamento ─────────────────────────────────────────────────
async function sendPaymentConfirmation(to, nickname, plan, amountBRL) {
  const html = `
  <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
  <body style="background:#0d0d0d;font-family:Arial,sans-serif;padding:40px 20px">
    <div style="max-width:480px;margin:0 auto;background:#1e1e1e;border-radius:16px;overflow:hidden;border:1px solid #2e2e2e">
      <div style="background:linear-gradient(135deg,#166534,#22c55e);padding:28px;text-align:center">
        <div style="font-size:36px;margin-bottom:8px">✅</div>
        <h1 style="color:#fff;margin:0;font-size:20px">Pagamento Confirmado!</h1>
      </div>
      <div style="padding:28px">
        <p style="color:#f2f2f2;font-size:15px">Olá, <strong>${nickname}</strong>! Seu pagamento foi processado.</p>
        <div style="background:#252525;border-radius:10px;padding:16px;margin:16px 0">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#999;font-size:13px">Plano</span>
            <span style="color:#f2f2f2;font-weight:700;font-size:13px">${plan}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#999;font-size:13px">Valor pago</span>
            <span style="color:#22c55e;font-weight:700;font-size:13px">R$ ${(amountBRL/100).toFixed(2)}</span>
          </div>
        </div>
        <p style="color:#999;font-size:13px">Seus tokens foram creditados e seus benefícios estão ativos!</p>
      </div>
    </div>
  </body></html>`;

  return sendEmail({ to, subject: '✅ Pagamento confirmado — Comunidade Viewers', html });
}

// ─── Reset de senha ───────────────────────────────────────────────────────────
async function sendPasswordResetEmail({ to, nickname, resetUrl }) {
  const html = `
  <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="background:#0d0d0d;font-family:Arial,sans-serif;padding:40px 20px">
    <div style="max-width:480px;margin:0 auto;background:#1e1e1e;border-radius:16px;overflow:hidden;border:1px solid #2e2e2e">
      <div style="background:#7c3aed;padding:28px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:20px">🔐 Redefinir Senha</h1>
      </div>
      <div style="padding:28px">
        <p style="color:#f2f2f2">Olá, <strong>${nickname}</strong>!</p>
        <p style="color:#999;font-size:14px">Clique no botão abaixo para redefinir sua senha. O link expira em 10 minutos.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${resetUrl}" style="background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Redefinir senha</a>
        </div>
        <p style="color:#555;font-size:12px">Se não solicitou, ignore este e-mail.</p>
      </div>
    </div>
  </body></html>`;

  return sendEmail({ to, subject: '🔐 Redefinição de senha — Comunidade Viewers', html });
}

async function sendAccountLockedEmail({ to, nickname }) {
  return sendEmail({
    to,
    subject: '⚠️ Conta temporariamente bloqueada — Comunidade Viewers',
    html: `<p>Olá ${nickname}, sua conta foi temporariamente bloqueada por múltiplas tentativas de login. Tente novamente em 30 minutos.</p>`,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendAdminNewUserNotification,
  sendPaymentConfirmation,
  sendPasswordResetEmail,
  sendAccountLockedEmail,
};
