import React, { useState } from 'react';
import { loadSession, clearSession } from './lib/api.js';
import Login from './views/Login.jsx';
import AdminDashboard from './views/AdminDashboard.jsx';
import RestaurantDashboard from './views/RestaurantDashboard.jsx';

export default function App() {
  const [session, setSession] = useState(loadSession());

  function logout() {
    clearSession();
    setSession(null);
  }

  if (!session) return <Login onAuth={setSession} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/logo.png" alt="" className="brand-logo" />
          <span className="mark">First <b>Diner</b></span>
          <span className="role">{session.role === 'admin' ? 'Admin console' : 'Restaurant console'}</span>
        </div>
        <div className="spread">
          <span className="muted" style={{ fontSize: '0.85rem' }}>{session.username}</span>
          <button className="ghost sm" onClick={logout}>Sign out</button>
        </div>
      </header>
      {session.role === 'admin' ? (
        <AdminDashboard session={session} />
      ) : (
        <RestaurantDashboard session={session} />
      )}
    </div>
  );
}
