import React, { useState } from 'react';
import { api, saveSession } from '../lib/api.js';

export default function Login({ onAuth }) {
  const [tab, setTab] = useState('restaurant');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const fn = tab === 'admin' ? api.adminLogin : api.restaurantLogin;
      const res = await fn(username.trim(), password);
      const session = { token: res.token, role: res.role, username: res.username, restaurantRole: res.restaurantRole };
      saveSession(res.token, session);
      onAuth(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="auth-card card">
        <div style={{ marginBottom: 18 }}>
          <span className="mark" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700 }}>
            first<b style={{ color: 'var(--honey-deep)' }}>Diner</b>
          </span>
          <p className="muted" style={{ margin: '6px 0 0' }}>Console sign-in</p>
        </div>

        <div className="tab-row">
          <div className={`tab ${tab === 'restaurant' ? 'active' : ''}`} onClick={() => setTab('restaurant')}>Restaurant</div>
          <div className={`tab ${tab === 'admin' ? 'active' : ''}`} onClick={() => setTab('admin')}>Admin</div>
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <hr className="soft" />
        <p className="muted" style={{ fontSize: '0.82rem', margin: 0 }}>
          Demo logins — Admin: <b>admin / admin123</b> · Restaurant: <b>spice / spice123</b>
        </p>
      </div>
    </div>
  );
}
