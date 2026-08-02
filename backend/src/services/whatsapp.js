'use strict';
const config = require('../config');

// Interakt wants the number split into a country code and a local number.
function splitPhone(e164) {
  const digits = String(e164 || '').replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length >= 12) return { countryCode: '+91', phoneNumber: digits.slice(2) };
  if (digits.length === 10) return { countryCode: '+91', phoneNumber: digits };
  return { countryCode: `+${digits.slice(0, Math.max(0, digits.length - 10))}` || '+91', phoneNumber: digits.slice(-10) };
}

/**
 * Send an approved WhatsApp template via the Interakt API.
 * No-ops (logs) when INTERAKT_API_KEY is unset. Never throws — a WhatsApp
 * failure must not break the booking that triggered it. Bounded by a timeout.
 * Docs: https://www.interakt.shop/resource-center/send-whatsapp-messages-using-api/
 */
async function sendWhatsAppTemplate({ to, templateName, languageCode, bodyValues }) {
  if (!to) return { skipped: true };
  if (!config.interaktApiKey) {
    console.log(`[whatsapp] disabled (no INTERAKT_API_KEY) — would send "${templateName}" to ${to}`);
    return { skipped: true };
  }
  const { countryCode, phoneNumber } = splitPhone(to);
  try {
    const res = await fetch('https://api.interakt.ai/v1/public/message/', {
      method: 'POST',
      headers: { Authorization: `Basic ${config.interaktApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode,
        phoneNumber,
        type: 'Template',
        template: {
          name: templateName,
          languageCode,
          bodyValues: (bodyValues || []).map((v) => String(v)),
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      console.error('[whatsapp] send failed', res.status, text.slice(0, 300));
      return { ok: false, status: res.status, error: text.slice(0, 300) };
    }
    return { ok: true, response: text.slice(0, 200) };
  } catch (err) {
    console.error('[whatsapp] error', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Booking alert to a restaurant. The approved template must have 5 body
 * variables in this order: {{1}} restaurant, {{2}} guest name, {{3}} party
 * size, {{4}} date, {{5}} time.
 */
async function sendBookingWhatsApp({ phone, restaurantName, bookingName, partySize, date, timeSlot }) {
  return sendWhatsAppTemplate({
    to: phone,
    templateName: config.whatsappBookingTemplate,
    languageCode: config.whatsappTemplateLang,
    bodyValues: [restaurantName, bookingName, partySize, date, timeSlot],
  });
}

function whatsappConfigured() {
  return Boolean(config.interaktApiKey);
}

module.exports = { sendWhatsAppTemplate, sendBookingWhatsApp, whatsappConfigured, splitPhone };
