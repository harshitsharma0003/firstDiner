'use strict';
require('dotenv').config();

const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiry: '30d',

  // Which data store to use: 'memory' (default, runs instantly) or 'firestore'.
  dataStore: process.env.DATA_STORE || 'memory',

  // Default offer rules (a restaurant can override these).
  defaultActiveDays: ['mon', 'tue', 'wed', 'thu'],
  defaultDiscount: 50,
  minDiscount: 40,
  maxDiscount: 60,
  maxPartySize: 4,

  // In dev we return the OTP in the API response so you can test without SMS.
  // In production set this to false and wire Firebase Phone Auth on the client.
  exposeOtpInResponse: process.env.EXPOSE_OTP !== 'false',

  // Seeded platform admin (change before deploying).
  seedAdmin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
};

module.exports = config;
