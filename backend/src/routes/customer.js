'use strict';
const express = require('express');
const store = require('../data/store');
const { authenticate, requireRole } = require('../middleware/auth');
const { buildDayAvailability, validateBooking } = require('../logic/availability');

const router = express.Router();

/** Strip internal/owner fields before sending a restaurant to a customer. */
function publicRestaurant(r) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    location: r.location,
    images: r.images,
    discountPercent: r.discountPercent,
    activeOfferDays: r.activeOfferDays,
    timeSlots: r.timeSlots,
  };
}

// ---- Search restaurants by location and/or name ----
router.get('/restaurants', async (req, res) => {
  const q = (req.query.q || '').toString().trim().toLowerCase();
  const location = (req.query.location || '').toString().trim().toLowerCase();
  let list = await store.listRestaurants({ onlyEnabled: true });

  if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
  if (location) {
    list = list.filter((r) => {
      const loc = r.location || {};
      return (
        (loc.city || '').toLowerCase().includes(location) ||
        (loc.address || '').toLowerCase().includes(location)
      );
    });
  }
  res.json({ restaurants: list.map(publicRestaurant) });
});

router.get('/restaurants/:id', async (req, res) => {
  const r = await store.getRestaurant(req.params.id);
  if (!r || !r.enabled) return res.status(404).json({ error: 'Restaurant not found.' });
  res.json({ restaurant: publicRestaurant(r) });
});

// ---- Availability for a given date ----
router.get('/restaurants/:id/availability', async (req, res) => {
  const date = (req.query.date || '').toString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Provide a date as YYYY-MM-DD.' });
  const r = await store.getRestaurant(req.params.id);
  if (!r || !r.enabled) return res.status(404).json({ error: 'Restaurant not found.' });

  // Fetch booked counts for every slot first, then run the (sync) availability logic.
  const counts = await Promise.all(
    (r.timeSlots || []).map(async (slot) => [slot, await store.countBookingsForSlot(r.id, date, slot)])
  );
  const countMap = Object.fromEntries(counts);
  const availability = buildDayAvailability(r, date, (slot) => countMap[slot] || 0);
  res.json({ ...availability, discountPercent: r.discountPercent });
});

// ---- Create a booking (customer) ----
router.post('/bookings', authenticate, requireRole('customer'), async (req, res) => {
  const { restaurantId, date, timeSlot, partySize, bookingName, contactNumber, acceptedTerms } = req.body || {};
  if (!acceptedTerms) return res.status(400).json({ error: 'You must accept the terms to book.' });
  if (!bookingName || !contactNumber) return res.status(400).json({ error: 'Booking name and contact number are required.' });

  const restaurant = await store.getRestaurant(restaurantId);
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' });

  const bookedCount = await store.countBookingsForSlot(restaurantId, date, timeSlot);
  const check = validateBooking(restaurant, { date, timeSlot, partySize: Number(partySize) }, bookedCount);
  if (!check.ok) return res.status(409).json({ error: check.message, code: check.code });

  const booking = await store.createBooking({
    restaurantId,
    customerId: req.user.sub,
    customerPhone: req.user.phone,
    bookingName,
    contactNumber,
    date,
    timeSlot,
    partySize: Number(partySize),
    discountApplied: restaurant.discountPercent,
    status: 'confirmed',
  });
  res.status(201).json({ booking });
});

// ---- A customer's own bookings ----
router.get('/bookings/mine', authenticate, requireRole('customer'), async (req, res) => {
  const bookings = await store.listBookingsForCustomer(req.user.sub);
  // Attach restaurant names for display.
  const withNames = await Promise.all(
    bookings.map(async (b) => {
      const r = await store.getRestaurant(b.restaurantId);
      return { ...b, restaurantName: r ? r.name : 'Restaurant' };
    })
  );
  res.json({ bookings: withNames });
});

// ---- Cancel own booking ----
router.patch('/bookings/:id/cancel', authenticate, requireRole('customer'), async (req, res) => {
  const booking = await store.getBooking(req.params.id);
  if (!booking || booking.customerId !== req.user.sub) {
    return res.status(404).json({ error: 'Booking not found.' });
  }
  const updated = await store.updateBooking(req.params.id, { status: 'cancelled' });
  res.json({ booking: updated });
});

module.exports = router;
