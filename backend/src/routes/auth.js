'use strict';
const express = require('express');
const store = require('../data/store');
const config = require('../config');
const { verifyPassword, signToken } = require('../auth/auth');
const { verifyFirebaseIdToken } = require('../auth/firebaseAuth');

const router = express.Router();

// ---- Admin login ----
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  const admin = await store.findAdminByUsername(username);
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  const token = signToken({ sub: admin.id, role: 'admin', username: admin.username });
  res.json({ token, role: 'admin', username: admin.username });
});

// ---- Restaurant login (owner or staff) ----
router.post('/restaurant/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = await store.findRestaurantUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  const token = signToken({
    sub: user.id,
    role: 'restaurant',
    restaurantId: user.restaurantId,
    restaurantRole: user.role, // 'owner' | 'staff'
    username: user.username,
  });
  res.json({ token, role: 'restaurant', restaurantRole: user.role, username: user.username });
});

// ---- Customer: sign in with a Firebase ID token (PRODUCTION phone auth) ----
// The app verifies the phone via the Firebase Auth SDK (real SMS) and sends us
// the resulting ID token. We verify it and trust its phone_number claim.
router.post('/customer/firebase', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'Missing Firebase ID token.' });
  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired Firebase token.' });
  }
  const phone = decoded.phone_number;
  if (!phone) return res.status(400).json({ error: 'This sign-in has no phone number.' });
  try {
    const customer = await store.upsertCustomerByPhone(phone);
    const token = signToken({ sub: customer.id, role: 'customer', phone });
    res.json({ token, role: 'customer', phone });
  } catch (err) {
    res.status(503).json({ error: 'Could not reach the database. Please try again.' });
  }
});

// ---- Customer: demo test login (static OTP, no SMS) ----
// For a hardcoded demo number, skip Firebase and accept the paired static code.
// DEMO ONLY: anyone who knows the number + code can sign in as it.
router.post('/customer/test-verify', async (req, res) => {
  const { phone, code } = req.body || {};
  const expected = config.testPhoneNumbers[phone];
  if (!expected || String(code) !== expected) {
    return res.status(401).json({ error: 'That code is wrong.' });
  }
  try {
    const customer = await store.upsertCustomerByPhone(phone);
    const token = signToken({ sub: customer.id, role: 'customer', phone });
    res.json({ token, role: 'customer', phone });
  } catch (err) {
    res.status(503).json({ error: 'Could not reach the database. Please try again.' });
  }
});

// ---- Customer: request OTP (DEV ONLY) ----
// Returns the code in the response so you can test without SMS. Disabled when
// EXPOSE_OTP=false — production uses POST /customer/firebase above.
router.post('/customer/request-otp', async (req, res) => {
  if (!config.exposeOtpInResponse) {
    return res.status(410).json({ error: 'Dev OTP is disabled. Use Firebase Phone Auth (POST /auth/customer/firebase).' });
  }
  const { phone } = req.body || {};
  if (!phone || phone.length < 8) return res.status(400).json({ error: 'Enter a valid phone number.' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await store.saveOtp(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
  const body = { sent: true };
  if (config.exposeOtpInResponse) body.devCode = code; // visible only in dev
  res.json(body);
});

// ---- Customer: verify OTP -> JWT (DEV ONLY) ----
router.post('/customer/verify-otp', async (req, res) => {
  if (!config.exposeOtpInResponse) {
    return res.status(410).json({ error: 'Dev OTP is disabled. Use Firebase Phone Auth (POST /auth/customer/firebase).' });
  }
  const { phone, code } = req.body || {};
  const record = await store.getOtp(phone);
  if (!record || record.code !== String(code) || record.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'That code is wrong or has expired.' });
  }
  await store.clearOtp(phone);
  const customer = await store.upsertCustomerByPhone(phone);
  const token = signToken({ sub: customer.id, role: 'customer', phone });
  res.json({ token, role: 'customer', phone });
});

module.exports = router;
