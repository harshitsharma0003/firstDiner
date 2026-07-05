import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function AdminDashboard({ session }) {
  const [restaurants, setRestaurants] = useState([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newCreds, setNewCreds] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', city: '', address: '', description: '' });

  async function refresh() {
    try {
      const { restaurants } = await api.listRestaurants(session.token);
      setRestaurants(restaurants);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    setNewCreds(null);
    try {
      const res = await api.createRestaurant(session.token, {
        name: form.name,
        username: form.username,
        description: form.description,
        location: { city: form.city, address: form.address, lat: null, lng: null },
      });
      setNewCreds(res.credentials);
      setForm({ name: '', username: '', city: '', address: '', description: '' });
      setCreating(false);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleEnabled(r) {
    await api.updateRestaurant(session.token, r.id, { enabled: !r.enabled });
    refresh();
  }

  async function resetPw(r) {
    const res = await api.resetPassword(session.token, r.id);
    setNewCreds(res.credentials);
  }

  return (
    <main className="container">
      <div className="spread" style={{ marginBottom: 20 }}>
        <div>
          <span className="eyebrow">Platform</span>
          <h1>Restaurants</h1>
        </div>
        <button onClick={() => { setCreating((v) => !v); setNewCreds(null); }}>
          {creating ? 'Cancel' : 'Onboard a restaurant'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {newCreds && (
        <div className="card">
          <div className="eyebrow">Hand these to the restaurant</div>
          <h2 style={{ margin: '4px 0 12px' }}>Login created</h2>
          <p className="muted" style={{ marginTop: 0 }}>This password is shown once. Copy it now.</p>
          <div className="cred-box">username: {newCreds.username}<br />password: {newCreds.password}</div>
        </div>
      )}

      {creating && (
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>New restaurant</h2>
          <form onSubmit={create}>
            <div className="row">
              <div className="field"><label>Restaurant name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="field"><label>Login username</label>
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></div>
            </div>
            <div className="row">
              <div className="field"><label>City</label>
                <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="field"><label>Address / area</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <div className="field"><label>Short description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <button type="submit">Create & generate login</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h2>All restaurants</h2><span className="muted">{restaurants.length} total</span></div>
        {restaurants.length === 0 && <p className="muted">No restaurants yet. Onboard your first one above.</p>}
        {restaurants.map((r) => (
          <div className="list-item" key={r.id}>
            <div>
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <div className="muted" style={{ fontSize: '0.85rem' }}>
                {r.location?.city || '—'} · {r.discountPercent}% off · {r.maxTables} tables
              </div>
            </div>
            <div className="spread">
              <span className={`chip ${r.enabled ? 'on' : 'off'}`}>{r.enabled ? 'Live' : 'Disabled'}</span>
              <button className="ghost sm" onClick={() => resetPw(r)}>Reset password</button>
              <button className={`sm ${r.enabled ? 'danger' : ''}`} onClick={() => toggleEnabled(r)}>
                {r.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
