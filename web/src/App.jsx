import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { loadSession, clearSession } from './lib/api.js';
import Login from './views/Login.jsx';
import AdminDashboard from './views/AdminDashboard.jsx';
import RestaurantDashboard from './views/RestaurantDashboard.jsx';

const logoUrl = import.meta.env.BASE_URL + 'logo.png';

export default function App() {
  const [session, setSession] = useState(loadSession());
  const logout = () => { clearSession(); setSession(null); };

  return (
    // basename keeps every route under /web (thefirstdiner.com/web/login, /web, ...)
    <BrowserRouter basename="/web">
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login onAuth={setSession} />} />
        <Route path="/" element={session ? <Shell session={session} logout={logout} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function Shell({ session, logout }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src={logoUrl} alt="" className="brand-logo" />
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
