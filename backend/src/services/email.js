'use strict';
const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const config = require('../config');

// Bumped when the email transport logic changes, so a deploy can be confirmed.
const EMAIL_BUILD = 'ipv4-literal-1';

let transporterPromise;

/**
 * Build the SMTP transport, connecting to an explicit IPv4 address.
 * nodemailer resolves hostnames itself, so Node's dns result-order and the
 * `family` option don't reliably stop it picking an AAAA record — and hosts
 * like Render have no IPv6 route (ENETUNREACH). Resolving the A record here
 * and passing tls.servername keeps certificate validation correct.
 */
function getTransporter() {
  if (transporterPromise !== undefined) return transporterPromise;

  if (!(config.smtpHost && config.smtpUser)) {
    console.log(config.resendApiKey ? '[email] using Resend API' : '[email] not configured — logging only');
    transporterPromise = Promise.resolve(null);
    return transporterPromise;
  }

  transporterPromise = (async () => {
    let host = config.smtpHost;
    let servername;
    try {
      const [ipv4] = await dns.resolve4(config.smtpHost);
      if (ipv4) {
        servername = config.smtpHost; // keep TLS cert matching the real hostname
        host = ipv4;
        console.log(`[email] SMTP ${config.smtpHost} -> ${ipv4}:${config.smtpPort} as ${config.smtpUser} (IPv4)`);
      }
    } catch (err) {
      console.warn('[email] IPv4 resolve failed, falling back to hostname:', err.message);
    }
    return nodemailer.createTransport({
      host,
      port: config.smtpPort,
      secure: config.smtpPort === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: config.smtpUser, pass: config.smtpPass },
      family: 4,
      ...(servername ? { tls: { servername } } : {}),
      // Fail fast rather than hanging.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  })();
  return transporterPromise;
}

/** Which transport is active + its (non-secret) settings — for diagnostics. */
function describeTransport() {
  if (config.smtpHost && config.smtpUser) {
    return {
      build: EMAIL_BUILD,
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
  const t = await getTransporter();
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

/**
 * Diagnostics only: try a real SMTP send on a specific port, so we can tell
 * "the host blocks this port" apart from "the credentials are wrong".
 */
async function testSmtpPort(port, to) {
  if (!(config.smtpHost && config.smtpUser)) return { port, ok: false, error: 'SMTP not configured' };
  let host = config.smtpHost;
  let servername;
  try {
    const [ipv4] = await dns.resolve4(config.smtpHost);
    if (ipv4) { servername = config.smtpHost; host = ipv4; }
  } catch (_) { /* fall back to hostname */ }
  const t = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
    family: 4,
    ...(servername ? { tls: { servername } } : {}),
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
  const started = Date.now();
  try {
    await t.sendMail({ from: config.emailFrom, to, subject: `First Diner — SMTP test (port ${port})`, html: '<p>SMTP port test.</p>' });
    return { port, ok: true, tookMs: Date.now() - started };
  } catch (err) {
    return { port, ok: false, tookMs: Date.now() - started, error: err.message, code: err.code || null };
  } finally {
    try { t.close(); } catch (_) { /* ignore */ }
  }
}

module.exports = { sendEmail, describeTransport, testSmtpPort };
