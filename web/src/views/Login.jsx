import React, { useState } from 'react';
import { api, saveSession } from '../lib/api.js';

export default function Login({ onAuth }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'forgot'
  const [tab, setTab] = useState('restaurant');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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

  async function sendReset(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await api.forgotPassword(email.trim());
      setNotice(res.message || 'If that email is registered, a new password has been sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    setNotice('');
  }

  return (
    <div className="center-screen">
      <div className="auth-card card">
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt="First Diner" style={{ height: 64, marginBottom: 12 }} />
          <span className="mark" style={{ fontFamily: 'Fraunces, serif', fontSize: '1.6rem', fontWeight: 700 }}>
            First <b style={{ color: 'var(--honey-deep)' }}>Diner</b>
          </span>
          <p className="muted" style={{ margin: '4px 0 0' }}>{mode === 'forgot' ? 'Reset your password' : 'Console sign-in'}</p>
        </div>

        {error && <div className="error">{error}</div>}
        {notice && <div className="notice">{notice}</div>}

        {mode === 'signin' ? (
          <>
            <div className="tab-row">
              <div className={`tab ${tab === 'restaurant' ? 'active' : ''}`} onClick={() => setTab('restaurant')}>Restaurant</div>
              <div className={`tab ${tab === 'admin' ? 'active' : ''}`} onClick={() => setTab('admin')}>Admin</div>
            </div>

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

            <p style={{ textAlign: 'center', margin: '14px 0 0' }}>
              <a href="#" onClick={(e) => { e.preventDefault(); switchMode('forgot'); }} style={{ fontSize: '0.85rem' }}>
                Forgot password?
              </a>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={sendReset}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@restaurant.com" autoFocus />
              </div>
              <button type="submit" disabled={busy} style={{ width: '100%' }}>
                {busy ? 'Sending…' : 'Email me a new password'}
              </button>
            </form>
            <p className="muted" style={{ fontSize: '0.8rem', margin: '12px 0 0' }}>
              Enter the email on your account and we’ll send a new password to sign in with.
            </p>
            <p style={{ textAlign: 'center', margin: '10px 0 0' }}>
              <a href="#" onClick={(e) => { e.preventDefault(); switchMode('signin'); }} style={{ fontSize: '0.85rem' }}>
                ← Back to sign in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
