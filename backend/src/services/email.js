'use strict';
const nodemailer = require('nodemailer');
const config = require('../config');

let transporter;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  if (config.smtpHost && config.smtpUser) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: config.smtpUser, pass: config.smtpPass },
    });
  } else {
    transporter = null;
  }
  return transporter;
}

/**
 * Send a transactional email. Uses SMTP (e.g. your Hostinger mailbox) when
 * SMTP_HOST is configured; otherwise the Resend API; otherwise no-ops (logs).
 * Never throws — email must not break the request that triggered it.
 */
async function sendEmail({ to, subject, html }) {
  if (!to) return { skipped: true };

  // 1. SMTP (preferred — sends from your own domain mailbox).
  const t = getTransporter();
  if (t) {
    try {
      await t.sendMail({ from: config.emailFrom, to, subject, html });
      return { ok: true };
    } catch (err) {
      console.error('[email] SMTP send failed:', err.message);
      return { ok: false };
    }
  }

  // 2. Resend API fallback.
  if (config.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.emailFrom, to, subject, html }),
      });
      if (!res.ok) {
        console.error('[email] Resend failed', res.status, (await res.text().catch(() => '')).slice(0, 300));
        return { ok: false };
      }
      return { ok: true };
    } catch (err) {
      console.error('[email] Resend error:', err.message);
      return { ok: false };
    }
  }

  // 3. Not configured — log only.
  console.log(`[email] disabled (no SMTP/Resend) — would send to ${to}: "${subject}"`);
  return { skipped: true };
}

module.exports = { sendEmail };
