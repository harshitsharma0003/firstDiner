'use strict';
const { nanoid } = require('nanoid');

/**
 * In-memory data store. Implements the same interface a Firestore adapter would.
 * Data lives only while the process runs — perfect for development and demos.
 * To persist across restarts, swap this for ./firestoreStore.js (see that file).
 */
function createMemoryStore() {
  const db = {
    restaurants: new Map(),
    restaurantUsers: new Map(),
    bookings: new Map(),
    admins: new Map(),
    customers: new Map(),
    otps: new Map(), // phone -> { code, expiresAt }
    notifications: new Map(),
  };

  const all = (col) => Array.from(db[col].values());

  return {
    // ---- generic ----
    _raw: db,

    // ---- admins ----
    async createAdmin(admin) {
      const id = admin.id || nanoid();
      const rec = { id, ...admin };
      db.admins.set(id, rec);
      return rec;
    },
    async findAdminByUsername(username) {
      return all('admins').find((a) => a.username === username) || null;
    },

    // ---- restaurants ----
    async createRestaurant(data) {
      const id = data.id || nanoid();
      const rec = { id, createdAt: Date.now(), ...data };
      db.restaurants.set(id, rec);
      return rec;
    },
    async getRestaurant(id) {
      return db.restaurants.get(id) || null;
    },
    async updateRestaurant(id, patch) {
      const cur = db.restaurants.get(id);
      if (!cur) return null;
      const next = { ...cur, ...patch };
      db.restaurants.set(id, next);
      return next;
    },
    async listRestaurants({ onlyEnabled = false } = {}) {
      let list = all('restaurants');
      if (onlyEnabled) list = list.filter((r) => r.enabled);
      return list;
    },

    // ---- restaurant users (owner + staff) ----
    async createRestaurantUser(user) {
      const id = user.id || nanoid();
      const rec = { id, ...user };
      db.restaurantUsers.set(id, rec);
      return rec;
    },
    async findRestaurantUserByUsername(username) {
      return all('restaurantUsers').find((u) => u.username === username) || null;
    },
    async listRestaurantUsers(restaurantId) {
      return all('restaurantUsers').filter((u) => u.restaurantId === restaurantId);
    },

    // ---- customers ----
    async upsertCustomerByPhone(phone) {
      let cust = all('customers').find((c) => c.phoneNumber === phone);
      if (!cust) {
        cust = { id: nanoid(), phoneNumber: phone, createdAt: Date.now() };
        db.customers.set(cust.id, cust);
      }
      return cust;
    },

    // ---- otp ----
    async saveOtp(phone, record) {
      db.otps.set(phone, record);
    },
    async getOtp(phone) {
      return db.otps.get(phone) || null;
    },
    async clearOtp(phone) {
      db.otps.delete(phone);
    },

    // ---- bookings ----
    async createBooking(booking) {
      const id = booking.id || nanoid();
      const rec = { id, createdAt: Date.now(), ...booking };
      db.bookings.set(id, rec);
      return rec;
    },
    async getBooking(id) {
      return db.bookings.get(id) || null;
    },
    async updateBooking(id, patch) {
      const cur = db.bookings.get(id);
      if (!cur) return null;
      const next = { ...cur, ...patch };
      db.bookings.set(id, next);
      return next;
    },
    async listBookingsForRestaurant(restaurantId) {
      return all('bookings')
        .filter((b) => b.restaurantId === restaurantId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    async listBookingsForCustomer(customerId) {
      return all('bookings')
        .filter((b) => b.customerId === customerId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    // ---- notifications ----
    async createNotification(n) {
      const id = n.id || nanoid();
      const rec = { id, createdAt: Date.now(), read: false, ...n };
      db.notifications.set(id, rec);
      return rec;
    },
    async listNotificationsForUser(userId) {
      return all('notifications')
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    async markNotificationsRead(userId) {
      for (const n of all('notifications')) {
        if (n.userId === userId && !n.read) db.notifications.set(n.id, { ...n, read: true });
      }
    },

    // Count confirmed bookings for a specific slot — the capacity check.
    async countBookingsForSlot(restaurantId, date, timeSlot) {
      return all('bookings').filter(
        (b) =>
          b.restaurantId === restaurantId &&
          b.date === date &&
          b.timeSlot === timeSlot &&
          b.status === 'confirmed'
      ).length;
    },
  };
}

module.exports = { createMemoryStore };
