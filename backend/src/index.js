'use strict';
const { createApp } = require('./app');
const { seed } = require('./seed');
const config = require('./config');

async function main() {
  // With the in-memory store, seed demo data on every boot.
  if (config.dataStore === 'memory') {
    await seed();
    console.log('[firstDiner] In-memory store seeded. Logins:');
    console.log('  Admin: admin / admin123 | Restaurants: spice/spice123, olive/olive123');
  }
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[firstDiner] API listening on http://localhost:${config.port}`);
  });
}

main();
