'use strict';
/**
 * Firestore implementation of the data-store interface.
 *
 * Every method mirrors ./memoryStore.js exactly (same name, args, and return
 * shape), so nothing else in the codebase changes — store.js picks this when
 * DATA_STORE=firestore.
 *
 * To go to production:
 *   1. npm install firebase-admin
 *   2. Create a Firebase project, enable Firestore (+ Phone Auth for SMS).
 *   3. Provide credentials via GOOGLE_APPLICATION_CREDENTIALS (a service-account
 *      JSON key path) and set DATA_STORE=firestore in .env.
 *
 * Collections used: admins, restaurants, restaurantUsers, customers, bookings,
 * otps (one doc per phone number).
 *
 * Required composite index (for countBookingsForSlot's aggregate query):
 *   bookings: restaurantId ASC, date ASC, timeSlot ASC, status ASC
 * Firestore will also print a console link to auto-create it on first run.
 *
 * NOTE: firebase-admin is required lazily inside the factory below — it is an
 * optional dependency, so memory mode must keep working without it installed.
 */
function createFirestoreStore() {
  let appMod, firestoreMod;
  try {
    // Modular API (firebase-admin v12+). The root export no longer exposes
    // `admin.apps` / `admin.firestore()`.
    appMod = require('firebase-admin/app');
    firestoreMod = require('firebase-admin/firestore');
  } catch (err) {
    throw new Error(
      'DATA_STORE=firestore needs the firebase-admin package. Run ' +
        '`npm install firebase-admin` in backend/, or use DATA_STORE=memory.'
    );
  }
  const { getApps, initializeApp, applicationDefault } = appMod;
  const { getFirestore } = firestoreMod;
  const { nanoid } = require('nanoid');

  // Initialize once. Credentials come from GOOGLE_APPLICATION_CREDENTIALS.
  if (!getApps().length) initializeApp({ credential: applicationDefault() });
  const fs = getFirestore();

  const col = (name) => fs.collection(name);

  /** Read one document by id; returns { id, ...data } or null. */
  async function getDoc(name, id) {
    if (!id) return null;
    const snap = await col(name).doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  /** Create-or-overwrite a record by id (respects a caller-supplied id). */
  async function setDoc(name, data, extra = {}) {
    const id = data.id || nanoid();
    const rec = { id, ...extra, ...data };
    await col(name).doc(id).set(rec);
    return rec;
  }

  /**
   * Patch a document, mirroring memoryStore: returns the merged record, or null
   * if the document does not exist. Uses update() so object fields (e.g.
   * dayOverrides) are replaced wholesale, not deep-merged.
   */
  async function patchDoc(name, id, patch) {
    const ref = col(name).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.update(patch);
    return { id: snap.id, ...snap.data(), ...patch };
  }

  /** Map a query snapshot to plain { id, ...data } records. */
  function rows(snap) {
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  const byNewest = (a, b) => b.createdAt - a.createdAt;

  return {
    // ---- admins ----
    async createAdmin(adminRec) {
      return setDoc('admins', adminRec);
    },
    async findAdminByUsername(username) {
      const snap = await col('admins').where('username', '==', username).limit(1).get();
      return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
    },

    // ---- restaurants ----
    async createRestaurant(data) {
      return setDoc('restaurants', data, { createdAt: Date.now() });
    },
    async getRestaurant(id) {
      return getDoc('restaurants', id);
    },
    async updateRestaurant(id, patch) {
      return patchDoc('restaurants', id, patch);
    },
    async listRestaurants({ onlyEnabled = false } = {}) {
      const query = onlyEnabled ? col('restaurants').where('enabled', '==', true) : col('restaurants');
      return rows(await query.get());
    },

    // ---- restaurant users (owner + staff) ----
    async createRestaurantUser(user) {
      // setDoc respects a supplied id, so this also overwrites by id
      // (used by the admin reset-password route).
      return setDoc('restaurantUsers', user);
    },
    async findRestaurantUserByUsername(username) {
      const snap = await col('restaurantUsers').where('username', '==', username).limit(1).get();
      return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
    },
    async listRestaurantUsers(restaurantId) {
      const snap = await col('restaurantUsers').where('restaurantId', '==', restaurantId).get();
      return rows(snap);
    },

    // ---- customers ----
    async upsertCustomerByPhone(phone) {
      // Read-then-create: a phone is effectively unique. The window between the
      // query and the write is tiny; if you need a hard guarantee, key the
      // customer document by phone instead.
      const snap = await col('customers').where('phoneNumber', '==', phone).limit(1).get();
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
      return setDoc('customers', { phoneNumber: phone }, { createdAt: Date.now() });
    },

    // ---- otp (one document per phone number) ----
    async saveOtp(phone, record) {
      await col('otps').doc(phone).set(record);
    },
    async getOtp(phone) {
      const snap = await col('otps').doc(phone).get();
      return snap.exists ? snap.data() : null;
    },
    async clearOtp(phone) {
      await col('otps').doc(phone).delete();
    },

    // ---- bookings ----
    async createBooking(booking) {
      return setDoc('bookings', booking, { createdAt: Date.now() });
    },
    async getBooking(id) {
      return getDoc('bookings', id);
    },
    async updateBooking(id, patch) {
      return patchDoc('bookings', id, patch);
    },
    async listBookingsForRestaurant(restaurantId) {
      const snap = await col('bookings').where('restaurantId', '==', restaurantId).get();
      return rows(snap).sort(byNewest);
    },
    async listBookingsForCustomer(customerId) {
      const snap = await col('bookings').where('customerId', '==', customerId).get();
      return rows(snap).sort(byNewest);
    },
    // Count confirmed bookings for a specific slot — the capacity check.
    // Needs the composite index documented at the top of this file.
    async countBookingsForSlot(restaurantId, date, timeSlot) {
      const snap = await col('bookings')
        .where('restaurantId', '==', restaurantId)
        .where('date', '==', date)
        .where('timeSlot', '==', timeSlot)
        .where('status', '==', 'confirmed')
        .count()
        .get();
      return snap.data().count;
    },
  };
}

module.exports = { createFirestoreStore };
