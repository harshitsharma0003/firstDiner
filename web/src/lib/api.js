// Tiny API client. Token is kept in memory + localStorage so a refresh keeps you logged in.
const TOKEN_KEY = 'firstdiner_token';
const SESSION_KEY = 'firstdiner_session';

// API base: set VITE_API_BASE to the hosted backend (e.g. https://firstdiner-api.onrender.com/api)
// when building for production. Falls back to '/api' so the Vite dev proxy works locally.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export function saveSession(token, session) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export function loadSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(SESSION_KEY);
  if (!token || !raw) return null;
  try {
    return { token, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  adminLogin: (username, password) => request('/auth/admin/login', { method: 'POST', body: { username, password } }),
  restaurantLogin: (username, password) =>
    request('/auth/restaurant/login', { method: 'POST', body: { username, password } }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),

  // admin
  listRestaurants: (token) => request('/admin/restaurants', { token }),
  createRestaurant: (token, body) => request('/admin/restaurants', { method: 'POST', body, token }),
  updateRestaurant: (token, id, body) => request(`/admin/restaurants/${id}`, { method: 'PATCH', body, token }),
  resetPassword: (token, id) => request(`/admin/restaurants/${id}/reset-password`, { method: 'POST', token }),

  // restaurant
  me: (token) => request('/restaurant/me', { token }),
  updateSettings: (token, body) => request('/restaurant/settings', { method: 'PATCH', body, token }),
  dayToggle: (token, body) => request('/restaurant/day-toggle', { method: 'POST', body, token }),
  bookings: (token) => request('/restaurant/bookings', { token }),
  staff: (token) => request('/restaurant/staff', { token }),
  addStaff: (token, username) => request('/restaurant/staff', { method: 'POST', body: { username }, token }),
};
