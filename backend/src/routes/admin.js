'use strict';
const express = require('express');
const store = require('../data/store');
const config = require('../config');
const { authenticate, requireRole } = require('../middleware/auth');
const { hashPassword, generatePassword } = require('../auth/auth');
const { sendEmail, describeTransport, testSmtpPort } = require('../services/email');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

// Create a restaurant + generate its owner login. Returns the plaintext
// password ONCE so the admin can hand it to the restaurant.
router.post('/restaurants', async (req, res) => {
  const { name, description, location, images, username, email } = req.body || {};
  if (!name || !username) return res.status(400).json({ error: 'Name and a login username are required.' });
  const ownerEmail = email ? String(email).trim().toLowerCase() : '';

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
    email: ownerEmail || undefined,
    passwordHash: hashPassword(password),
    role: 'owner',
  });

  // Email the owner their login (fire-and-forget) if an email was provided.
  if (ownerEmail) {
    sendEmail({
      to: ownerEmail,
      subject: `Your First Diner console login — ${name}`,
      html: `<div style="font-family:Arial,sans-serif;color:#241d2b">
        <h2 style="margin:0 0 10px">Welcome to First Diner</h2>
        <p>Your restaurant <b>${name}</b> is set up. Sign in to set your offer, capacity and see bookings:</p>
        <p><b>Username:</b> ${username}<br/>
           <b>Password:</b> <code style="background:#f5eee4;padding:2px 6px;border-radius:4px">${password}</code></p></div>`,
    }).catch(() => {});
  }

  res.status(201).json({ restaurant, credentials: { username, password } });
});

router.get('/restaurants', async (_req, res) => {
  const restaurants = await store.listRestaurants();
  res.json({ restaurants });
});

// Diagnostic: report the active email transport and attempt a real send so the
// underlying SMTP/API error is visible without digging through host logs.
router.post('/email-test', async (req, res) => {
  const transport = describeTransport();
  const to = (req.body && req.body.to) || config.adminEmail;
  if (!to) {
    return res.json({ transport, error: 'No recipient — pass { "to": "you@example.com" } or set ADMIN_EMAIL.' });
  }
  // { probe: true } tries each common SMTP port so we can tell a blocked port
  // (timeout) apart from bad credentials (auth error).
  if (req.body && req.body.probe) {
    const ports = req.body.ports || [465, 587, 25, 2525];
    const results = [];
    for (const p of ports) results.push(await testSmtpPort(p, to));
    return res.json({ transport, to, probe: results });
  }

  const started = Date.now();
  const result = await sendEmail({
    to,
    subject: 'First Diner — email test',
    html: '<p>If you are reading this, First Diner email delivery is working.</p>',
  });
  res.json({ transport, to, tookMs: Date.now() - started, result });
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
