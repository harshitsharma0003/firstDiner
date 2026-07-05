'use strict';
const express = require('express');
const store = require('../data/store');
const config = require('../config');
const { authenticate, requireRole } = require('../middleware/auth');
const { hashPassword, generatePassword } = require('../auth/auth');

const router = express.Router();
router.use(authenticate, requireRole('restaurant'));

// The restaurant this logged-in user belongs to.
router.get('/me', async (req, res) => {
  const restaurant = await store.getRestaurant(req.user.restaurantId);
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' });
  res.json({ restaurant, restaurantRole: req.user.restaurantRole });
});

// Update offer + capacity + slots + days. Discount is clamped to 40–60%.
router.patch('/settings', async (req, res) => {
  const body = req.body || {};
  const patch = {};

  if ('discountPercent' in body) {
    const d = Number(body.discountPercent);
    if (Number.isNaN(d) || d < config.minDiscount || d > config.maxDiscount) {
      return res.status(400).json({ error: `Discount must be between ${config.minDiscount}% and ${config.maxDiscount}%.` });
    }
    patch.discountPercent = d;
  }
  if ('maxTables' in body) {
    const t = Number(body.maxTables);
    if (!Number.isInteger(t) || t < 1) return res.status(400).json({ error: 'Max tables must be 1 or more.' });
    patch.maxTables = t;
  }
  if ('activeOfferDays' in body) {
    const valid = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    if (!Array.isArray(body.activeOfferDays) || body.activeOfferDays.some((d) => !valid.includes(d))) {
      return res.status(400).json({ error: 'Active days are invalid.' });
    }
    patch.activeOfferDays = body.activeOfferDays;
  }
  if ('timeSlots' in body) {
    if (!Array.isArray(body.timeSlots)) return res.status(400).json({ error: 'Time slots must be a list.' });
    patch.timeSlots = body.timeSlots;
  }
  if ('dayOverrides' in body) patch.dayOverrides = body.dayOverrides;

  const updated = await store.updateRestaurant(req.user.restaurantId, patch);
  res.json({ restaurant: updated });
});

// Toggle a single calendar date on/off (the per-day override).
router.post('/day-toggle', async (req, res) => {
  const { date, enabled } = req.body || {};
  if (!date) return res.status(400).json({ error: 'A date is required.' });
  const restaurant = await store.getRestaurant(req.user.restaurantId);
  const dayOverrides = { ...(restaurant.dayOverrides || {}) };
  if (enabled === null) delete dayOverrides[date]; // back to default rule
  else dayOverrides[date] = !!enabled;
  const updated = await store.updateRestaurant(req.user.restaurantId, { dayOverrides });
  res.json({ restaurant: updated });
});

// Live booking queue for this restaurant.
router.get('/bookings', async (req, res) => {
  const bookings = await store.listBookingsForRestaurant(req.user.restaurantId);
  res.json({ bookings });
});

// Staff management (owner only).
router.get('/staff', requireRole('restaurant'), async (req, res) => {
  const users = await store.listRestaurantUsers(req.user.restaurantId);
  res.json({ staff: users.map((u) => ({ id: u.id, username: u.username, role: u.role })) });
});

router.post('/staff', async (req, res) => {
  if (req.user.restaurantRole !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can add staff.' });
  }
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'A username is required.' });
  const existing = await store.findRestaurantUserByUsername(username);
  if (existing) return res.status(409).json({ error: 'That username is already taken.' });
  const password = generatePassword();
  await store.createRestaurantUser({
    restaurantId: req.user.restaurantId,
    username,
    passwordHash: hashPassword(password),
    role: 'staff',
  });
  res.status(201).json({ credentials: { username, password } });
});

module.exports = router;
