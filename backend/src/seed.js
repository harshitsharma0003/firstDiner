'use strict';
const store = require('./data/store');
const config = require('./config');
const { hashPassword } = require('./auth/auth');

/** Idempotent-ish seed for development: admin + two demo restaurants. */
async function seed() {
  // Platform admin
  const existingAdmin = await store.findAdminByUsername(config.seedAdmin.username);
  if (!existingAdmin) {
    await store.createAdmin({
      username: config.seedAdmin.username,
      passwordHash: hashPassword(config.seedAdmin.password),
    });
  }

  // Demo restaurant 1 (owner login: spice / spice123)
  const r1 = await store.createRestaurant({
    name: 'Spice Route',
    description: 'Modern North Indian, family-friendly.',
    location: { address: 'Connaught Place', city: 'New Delhi', lat: 28.6315, lng: 77.2167 },
    images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'],
    maxTables: 3,
    discountPercent: 50,
    activeOfferDays: ['mon', 'tue', 'wed', 'thu'],
    dayOverrides: {},
    timeSlots: ['12:00', '13:00', '19:00', '20:00', '21:00'],
    enabled: true,
  });
  await store.createRestaurantUser({
    restaurantId: r1.id,
    username: 'spice',
    passwordHash: hashPassword('spice123'),
    role: 'owner',
  });

  // Demo restaurant 2 (owner login: olive / olive123)
  const r2 = await store.createRestaurant({
    name: 'Olive & Vine',
    description: 'Mediterranean small plates and wood-fired mains.',
    location: { address: 'Bandra West', city: 'Mumbai', lat: 19.0606, lng: 72.8365 },
    images: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0'],
    maxTables: 2,
    discountPercent: 55,
    activeOfferDays: ['mon', 'tue', 'wed', 'thu'],
    dayOverrides: {},
    timeSlots: ['19:00', '20:00', '21:00'],
    enabled: true,
  });
  await store.createRestaurantUser({
    restaurantId: r2.id,
    username: 'olive',
    passwordHash: hashPassword('olive123'),
    role: 'owner',
  });

  return { r1, r2 };
}

module.exports = { seed };

// Allow `npm run seed` to print credentials (useful when persisting to Firestore).
if (require.main === module) {
  seed().then(() => {
    console.log('Seeded admin + demo restaurants.');
    console.log('  Admin:        admin / admin123');
    console.log('  Restaurant 1: spice / spice123');
    console.log('  Restaurant 2: olive / olive123');
    process.exit(0);
  });
}
