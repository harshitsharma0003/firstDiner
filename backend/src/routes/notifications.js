'use strict';
const express = require('express');
const store = require('../data/store');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// The signed-in user's notifications (works for customers and restaurant users;
// both carry their user id in the JWT `sub`).
router.get('/', async (req, res) => {
  const notifications = await store.listNotificationsForUser(req.user.sub);
  const unread = notifications.filter((n) => !n.read).length;
  res.json({ notifications, unread });
});

// Mark all of the user's notifications as read.
router.post('/read', async (req, res) => {
  await store.markNotificationsRead(req.user.sub);
  res.json({ ok: true });
});

module.exports = router;
