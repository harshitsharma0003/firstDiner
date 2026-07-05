'use strict';
const config = require('../config');

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** "2026-07-01" -> "wed". Parsed in UTC to avoid timezone drift on the date key. */
function weekdayKey(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return WEEKDAY_KEYS[d.getUTCDay()];
}

/**
 * Is the offer active for this restaurant on this calendar date?
 * A day is active when BOTH are true:
 *   - its weekday is in the restaurant's activeOfferDays, and
 *   - there is no per-day override switching it off (dayOverrides[date] === false).
 * A per-day override can also force a normally-off day ON (dayOverrides[date] === true).
 */
function isDayActive(restaurant, dateStr) {
  const override = restaurant.dayOverrides && restaurant.dayOverrides[dateStr];
  if (override === false) return false;
  if (override === true) return true;
  const wk = weekdayKey(dateStr);
  return (restaurant.activeOfferDays || config.defaultActiveDays).includes(wk);
}

/**
 * Build availability for every time slot on a given date.
 * Returns one row per slot with remaining tables and a status:
 *   - "available"  -> bookable
 *   - "full"       -> capacity reached ("Tables not available")
 * If the whole day is inactive, returns dayActive:false and an empty slot list
 * (the customer app shows "No tables available").
 */
function buildDayAvailability(restaurant, dateStr, countForSlot) {
  if (!isDayActive(restaurant, dateStr)) {
    return { date: dateStr, dayActive: false, slots: [] };
  }
  const slots = (restaurant.timeSlots || []).map((slot) => {
    const booked = countForSlot(slot);
    const remaining = Math.max(0, restaurant.maxTables - booked);
    return {
      timeSlot: slot,
      booked,
      remaining,
      status: remaining > 0 ? 'available' : 'full',
    };
  });
  return { date: dateStr, dayActive: true, slots };
}

/**
 * Validate a booking attempt. Returns { ok:true } or { ok:false, code, message }.
 * `bookedCount` is the number of confirmed bookings already in this exact slot.
 */
function validateBooking(restaurant, { date, timeSlot, partySize }, bookedCount) {
  if (!restaurant || !restaurant.enabled) {
    return { ok: false, code: 'restaurant_unavailable', message: 'This restaurant is not accepting bookings.' };
  }
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > config.maxPartySize) {
    return { ok: false, code: 'party_size', message: `Party size must be between 1 and ${config.maxPartySize}.` };
  }
  if (!isDayActive(restaurant, date)) {
    return { ok: false, code: 'no_tables_available', message: 'No tables available on this day.' };
  }
  if (!(restaurant.timeSlots || []).includes(timeSlot)) {
    return { ok: false, code: 'invalid_slot', message: 'That time slot is not offered.' };
  }
  if (bookedCount >= restaurant.maxTables) {
    return { ok: false, code: 'tables_not_available', message: 'Tables not available for this hour.' };
  }
  return { ok: true };
}

module.exports = {
  WEEKDAY_KEYS,
  weekdayKey,
  isDayActive,
  buildDayAvailability,
  validateBooking,
};
