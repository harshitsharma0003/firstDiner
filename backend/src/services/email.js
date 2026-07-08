'use strict';
const config = require('../config');

/**
 * Send a transactional email via the Resend API (https://resend.com).
 * No-ops (just logs) when RESEND_API_KEY is unset, so the app runs fine in dev
 * without email configured. Uses Node 18+ global fetch.
 */
async function sendEmail({ to, subject, html }) {
  if (!to) return { skipped: true };
  if (!config.resendApiKey) {
    console.log(`[email] disabled (no RESEND_API_KEY) — would send to ${to}: "${subject}"`);
    return { skipped: true };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: config.resendFrom, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[email] send failed', res.status, body.slice(0, 300));
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email] error', err.message);
    return { ok: false };
  }
}

module.exports = { sendEmail };
