'use strict';
const express = require('express');
const store = require('../data/store');
const config = require('../config');
const { authenticate, requireRole } = require('../middleware/auth');
const { hashPassword, generatePassword } = require('../auth/auth');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

// Create a restaurant + generate its owner login. Returns the plaintext
// password ONCE so the admin can hand it to the restaurant.
router.post('/restaurants', async (req, res) => {
  const { name, description, location, images, username } = req.body || {};
  if (!name || !username) return res.status(400).json({ error: 'Name and a login username are required.' });

  const existing = await store.findRestaurantUserByUsername(username);
  if (existing) return res.status(409).json({ error: 'That username is already taken.' });

  const restaurant = await store.createRestaurant({
    name,
    description: description || '',
    location: location || { address: '', city: '', lat: null, lng: null },
    images: images || [],
    maxTables: 5,
    discountPercent: config.defaultDiscount,
    activeOfferDays: [...config.defaultActiveDays],
    dayOverrides: {},
    timeSlots: ['12:00', '13:00', '19:00', '20:00', '21:00'],
    enabled: true,
  });

  const password = generatePassword();
  await store.createRestaurantUser({
    restaurantId: restaurant.id,
    username,
    passwordHash: hashPassword(password),
    role: 'owner',
  });

  res.status(201).json({ restaurant, credentials: { username, password } });
});

router.get('/restaurants', async (_req, res) => {
  const restaurants = await store.listRestaurants();
  res.json({ restaurants });
});

// Edit details, or enable/disable.
router.patch('/restaurants/:id', async (req, res) => {
  const allowed = ['name', 'description', 'location', 'images', 'enabled'];
  const patch = {};
  for (const key of allowed) if (key in (req.body || {})) patch[key] = req.body[key];
  const updated = await store.updateRestaurant(req.params.id, patch);
  if (!updated) return res.status(404).json({ error: 'Restaurant not found.' });
  res.json({ restaurant: updated });
});

// Reset an owner password (generates a new one).
router.post('/restaurants/:id/reset-password', async (req, res) => {
  const users = await store.listRestaurantUsers(req.params.id);
  const owner = users.find((u) => u.role === 'owner');
  if (!owner) return res.status(404).json({ error: 'Owner account not found.' });
  const password = generatePassword();
  owner.passwordHash = hashPassword(password);
  await store.createRestaurantUser(owner); // overwrite by id
  res.json({ credentials: { username: owner.username, password } });
});

module.exports = router;
