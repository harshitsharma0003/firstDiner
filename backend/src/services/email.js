'use strict';
const nodemailer = require('nodemailer');
const config = require('../config');

let transporter;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  if (config.smtpHost && config.smtpUser) {
    console.log(`[email] using SMTP ${config.smtpHost}:${config.smtpPort} as ${config.smtpUser}`);
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: config.smtpUser, pass: config.smtpPass },
      // Fail fast instead of hanging when the host blocks outbound SMTP.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  } else {
    console.log(config.resendApiKey ? '[email] using Resend API' : '[email] not configured — logging only');
    transporter = null;
  }
  return transporter;
}

/** Which transport is active + its (non-secret) settings — for diagnostics. */
function describeTransport() {
  if (config.smtpHost && config.smtpUser) {
    return {
      mode: 'smtp',
      host: config.smtpHost,
      port: config.smtpPort,
      user: config.smtpUser,
      passSet: Boolean(config.smtpPass),
      from: config.emailFrom,
    };
  }
  if (config.resendApiKey) return { mode: 'resend', from: config.emailFrom };
  return { mode: 'disabled', from: config.emailFrom };
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
      return { ok: true, via: 'smtp' };
    } catch (err) {
      console.error('[email] SMTP send failed:', err.message);
      return { ok: false, via: 'smtp', error: err.message, code: err.code || null };
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
        const body = (await res.text().catch(() => '')).slice(0, 300);
        console.error('[email] Resend failed', res.status, body);
        return { ok: false, via: 'resend', error: `HTTP ${res.status} ${body}` };
      }
      return { ok: true, via: 'resend' };
    } catch (err) {
      console.error('[email] Resend error:', err.message);
      return { ok: false, via: 'resend', error: err.message };
    }
  }

  // 3. Not configured — log only.
  console.log(`[email] disabled (no SMTP/Resend) — would send to ${to}: "${subject}"`);
  return { skipped: true };
}

module.exports = { sendEmail, describeTransport };
