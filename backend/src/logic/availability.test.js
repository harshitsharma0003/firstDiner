'use strict';
const assert = require('assert');
const { isDayActive, buildDayAvailability, validateBooking, weekdayKey } = require('./availability');

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const restaurant = {
  id: 'r1',
  enabled: true,
  maxTables: 2,
  discountPercent: 50,
  activeOfferDays: ['mon', 'tue', 'wed', 'thu'],
  dayOverrides: {},
  timeSlots: ['19:00', '20:00'],
};

console.log('Booking logic tests:');

// 2026-07-01 is a Wednesday, 2026-07-04 is a Saturday.
test('weekdayKey resolves correctly', () => {
  assert.strictEqual(weekdayKey('2026-07-01'), 'wed');
  assert.strictEqual(weekdayKey('2026-07-04'), 'sat');
});

test('Mon–Thu is active, weekend is not', () => {
  assert.strictEqual(isDayActive(restaurant, '2026-07-01'), true); // Wed
  assert.strictEqual(isDayActive(restaurant, '2026-07-04'), false); // Sat
});

test('per-day override can turn an active day OFF', () => {
  const r = { ...restaurant, dayOverrides: { '2026-07-01': false } };
  assert.strictEqual(isDayActive(r, '2026-07-01'), false);
});

test('per-day override can turn an inactive day ON', () => {
  const r = { ...restaurant, dayOverrides: { '2026-07-04': true } };
  assert.strictEqual(isDayActive(r, '2026-07-04'), true);
});

test('inactive day yields "No tables available" (empty slots)', () => {
  const avail = buildDayAvailability(restaurant, '2026-07-04', () => 0);
  assert.strictEqual(avail.dayActive, false);
  assert.deepStrictEqual(avail.slots, []);
});

test('slot fills up: remaining hits 0 and status becomes full', () => {
  // 19:00 has 2 bookings (== maxTables) -> full; 20:00 has 1 -> available(1 left)
  const counts = { '19:00': 2, '20:00': 1 };
  const avail = buildDayAvailability(restaurant, '2026-07-01', (slot) => counts[slot]);
  const s19 = avail.slots.find((s) => s.timeSlot === '19:00');
  const s20 = avail.slots.find((s) => s.timeSlot === '20:00');
  assert.strictEqual(s19.status, 'full');
  assert.strictEqual(s19.remaining, 0);
  assert.strictEqual(s20.status, 'available');
  assert.strictEqual(s20.remaining, 1);
});

test('validateBooking rejects party size > 4', () => {
  const r = validateBooking(restaurant, { date: '2026-07-01', timeSlot: '19:00', partySize: 5 }, 0);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'party_size');
});

test('validateBooking rejects booking on inactive day', () => {
  const r = validateBooking(restaurant, { date: '2026-07-04', timeSlot: '19:00', partySize: 2 }, 0);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'no_tables_available');
});

test('validateBooking rejects when slot is at capacity', () => {
  const r = validateBooking(restaurant, { date: '2026-07-01', timeSlot: '19:00', partySize: 2 }, 2);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'tables_not_available');
});

test('validateBooking accepts a valid booking', () => {
  const r = validateBooking(restaurant, { date: '2026-07-01', timeSlot: '19:00', partySize: 4 }, 1);
  assert.strictEqual(r.ok, true);
});

console.log(`\nAll ${passed} tests passed.`);
