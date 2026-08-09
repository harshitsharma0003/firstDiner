'use strict';
// Cloud Functions (2nd gen) entry point — wraps the same Express app used by
// src/index.js for local dev. Deployed via `firebase deploy --only functions`
// with this directory as the function source (see mobile/firebase.json).
//
// No service-account JSON here: firebase-admin's applicationDefault() resolves
// to the function's own runtime identity, which already has Firestore access
// in this project.
const { onRequest } = require('firebase-functions/v2/https');
const { createApp } = require('./app');

exports.api = onRequest({ region: 'asia-south1' }, createApp());
