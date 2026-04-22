'use strict';

const nodemailer = require('nodemailer');
const logger     = require('./logger');

// ─── Cria transporter (reutilizável) ─────────────────────────────────────────
function createTransporter() {
  // Em dev/test: usa Ethereal (e-mail fake, sem envio real)
  if (process.env.NODE_ENV !== 'production') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass',
      },
    });
  }

  // Produção: SMTP real (Gmail, SendGrid, etc.)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,          // reutiliza conexões
    maxConnections: 5,
    rateDelta: 1000,
    rateLimit: 5,        // máx 5 e-mails/segundo
  });
}

const transporter = createTransporter();

// ─── Template base HTML ───────────────────────────────────────────────────────
function baseTemplate({ title, heading, body, ctaText, ctaUrl }) {
  const cta = ctaText && ctaUrl
    ? `<a href="${ctaUrl}" style="
        display:inline-block;
        margin:24px 0;
        padding:14px 32px;
        background:#7C3AED;
        color:#fff;
        text-decoration:none;
        border-radius:8px;
        font-weight:600;
        font-size:15px;
      ">${ctaText}</a>`
    : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f23;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C3AED,#06B6D4);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:1px;">
                🎮 Comunidade Viewrs
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 36px;color:#e2e8f0;">
              <h2 style="margin:0 0 16px;color:#fff;font-size:20px;">${heading}</h2>
              ${body}
              ${cta}
              <p style="margin:24px 0 0;font-size:12px;color:#64748b;border-top:1px solid #2d2d4e;padding-top:20px;">
                Este e-mail foi enviado automaticamente. Não responda a esta mensagem.<br>
                © ${new Date().getFullYear()} Comunidade Viewrs. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Função central de envio ──────────────────────────────────────────────────
async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"Comunidade Viewrs" <${process.env.SMTP_USER || 'noreply@comunidadeviewrs.com.br'}>`,
      to,
      subject,
      html,
      text: text || subject,
    });

    logger.info(`E-mail enviado para ${to}: ${info.messageId}`);

    // Em dev, loga a URL de preview do Ethereal
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) logger.info(`Preview do e-mail: ${previewUrl}`);
    }

    return info;
  } catch (err) {
    logger.error(`Falha ao enviar e-mail para ${to}:`, err);
    throw err;
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  TEMPLATES TRANSACIONAIS
// ════════════════════════════════════════════════════════════════════════════

// ─── Boas-vindas ──────────────────────────────────────────────────────────────
async function sendWelcomeEmail({ to, nickname }) {
  const html = baseTemplate({
    title: 'Bem-vindo à Comunidade Viewrs!',
    heading: `Bem-vindo, ${nickname}! 🎉`,
    body: `
      <p style="line-height:1.7;margin:0 0 16px;">
        Sua conta foi criada com sucesso. Agora você faz parte da maior
        comunidade de suporte a streamers do Brasil!
      </p>
      <p style="line-height:1.7;margin:0 0 16px;">
        <strong style="color:#7C3AED;">Como funciona:</strong>
      </p>
      <ul style="padding-left:20px;line-height:2;margin:0 0 16px;">
        <li>🎯 Assista lives e ganhe <strong>Tokens</strong></li>
        <li>🚀 Gaste tokens para receber <strong>viewers</strong> na sua live</li>
        <li>🏆 Suba no <strong>ranking</strong> da comunidade</li>
      </ul>
    `,
    ctaText: 'Acessar minha conta',
    ctaUrl: `${process.env.FRONTEND_URL || 'https://comunidadeviewrs.com.br'}/dashboard`,
  });

  return sendEmail({ to, subject: '🎮 Bem-vindo à Comunidade Viewrs!', html });
}

// ─── Reset de senha ───────────────────────────────────────────────────────────
async function sendPasswordResetEmail({ to, nickname, resetUrl }) {
  const html = baseTemplate({
    title: 'Redefinição de Senha',
    heading: 'Redefinir sua senha',
    body: `
      <p style="line-height:1.7;margin:0 0 16px;">
        Olá, <strong>${nickname}</strong>! Recebemos uma solicitação para
        redefinir a senha da sua conta.
      </p>
      <p style="line-height:1.7;margin:0 0 16px;">
        Clique no botão abaixo para criar uma nova senha. Este link é válido por
        <strong>10 minutos</strong>.
      </p>
      <p style="line-height:1.7;margin:16px 0 0;font-size:13px;color:#94a3b8;">
        Se você não solicitou a redefinição, ignore este e-mail. Sua senha
        permanece a mesma.
      </p>
    `,
    ctaText: 'Redefinir senha',
    ctaUrl: resetUrl,
  });

  return sendEmail({ to, subject: '🔐 Redefinição de senha — Comunidade Viewrs', html });
}

// ─── Conta bloqueada (alerta de segurança) ────────────────────────────────────
async function sendAccountLockedEmail({ to, nickname, ip }) {
  const html = baseTemplate({
    title: 'Alerta de Segurança',
    heading: '⚠️ Conta temporariamente bloqueada',
    body: `
      <p style="line-height:1.7;margin:0 0 16px;">
        Olá, <strong>${nickname}</strong>. Detectamos várias tentativas de login
        incorretas na sua conta e ela foi temporariamente bloqueada por
        <strong>30 minutos</strong>.
      </p>
      <table style="width:100%;background:#0f0f23;border-radius:8px;padding:16px;margin:16px 0;">
        <tr><td style="color:#94a3b8;font-size:13px;">IP detectado:</td><td style="color:#e2e8f0;font-size:13px;">${ip}</td></tr>
        <tr><td style="color:#94a3b8;font-size:13px;">Horário:</td><td style="color:#e2e8f0;font-size:13px;">${new Date().toLocaleString('pt-BR')}</td></tr>
      </table>
      <p style="line-height:1.7;margin:0;font-size:13px;color:#94a3b8;">
        Se foi você, não se preocupe — aguarde 30 minutos e tente novamente.
        Se não foi você, recomendamos alterar sua senha imediatamente.
      </p>
    `,
    ctaText: 'Alterar minha senha',
    ctaUrl: `${process.env.FRONTEND_URL || 'https://comunidadeviewrs.com.br'}/forgot-password`,
  });

  return sendEmail({ to, subject: '⚠️ Alerta de segurança — Comunidade Viewrs', html });
}

// ─── Conquista / Milestone de tokens ─────────────────────────────────────────
async function sendMilestoneEmail({ to, nickname, milestone }) {
  const milestones = {
    100:  { emoji: '🥉', label: 'Iniciante',   desc: 'Você acumulou 100 tokens!' },
    500:  { emoji: '🥈', label: 'Colaborador', desc: 'Você acumulou 500 tokens!' },
    1000: { emoji: '🥇', label: 'Veterano',    desc: 'Você acumulou 1.000 tokens!' },
    5000: { emoji: '💎', label: 'Lenda',        desc: 'Você acumulou 5.000 tokens!' },
  };

  const info = milestones[milestone] || { emoji: '🏆', label: 'Conquista', desc: `Você acumulou ${milestone} tokens!` };

  const html = baseTemplate({
    title: `Conquista desbloqueada: ${info.label}`,
    heading: `${info.emoji} Conquista desbloqueada!`,
    body: `
      <p style="line-height:1.7;margin:0 0 16px;">
        Parabéns, <strong>${nickname}</strong>! ${info.desc}
      </p>
      <div style="text-align:center;padding:24px;background:#0f0f23;border-radius:12px;margin:16px 0;">
        <div style="font-size:48px;">${info.emoji}</div>
        <div style="color:#7C3AED;font-size:22px;font-weight:700;margin-top:8px;">${info.label}</div>
        <div style="color:#94a3b8;font-size:14px;margin-top:4px;">${milestone} tokens acumulados</div>
      </div>
      <p style="line-height:1.7;margin:0;color:#94a3b8;font-size:13px;">
        Continue assistindo lives e acumulando tokens para subir ainda mais no ranking!
      </p>
    `,
    ctaText: 'Ver meu ranking',
    ctaUrl: `${process.env.FRONTEND_URL || 'https://comunidadeviewrs.com.br'}/ranking`,
  });

  return sendEmail({ to, subject: `${info.emoji} Conquista desbloqueada: ${info.label}!`, html });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAccountLockedEmail,
  sendMilestoneEmail,
};
