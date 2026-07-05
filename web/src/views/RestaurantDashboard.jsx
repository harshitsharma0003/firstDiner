import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const DAYS = [
  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'],
  ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun'],
];

export default function RestaurantDashboard({ session }) {
  const [restaurant, setRestaurant] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [slotInput, setSlotInput] = useState('');
  const [overrideDate, setOverrideDate] = useState('');
  const [staffName, setStaffName] = useState('');
  const [newStaffCreds, setNewStaffCreds] = useState(null);

  const isOwner = session.restaurantRole === 'owner';

  async function loadAll() {
    try {
      const me = await api.me(session.token);
      setRestaurant(me.restaurant);
      const b = await api.bookings(session.token);
      setBookings(b.bookings);
      if (isOwner) {
        const s = await api.staff(session.token);
        setStaff(s.staff);
      }
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    loadAll();
    // Poll bookings every 8s so new ones appear (stand-in for Firestore live listeners).
    const t = setInterval(async () => {
      try {
        const b = await api.bookings(session.token);
        setBookings(b.bookings);
      } catch { /* ignore */ }
    }, 8000);
    return () => clearInterval(t);
  }, []);

  async function patch(body, msg) {
    setError(''); setNotice('');
    try {
      const res = await api.updateSettings(session.token, body);
      setRestaurant(res.restaurant);
      if (msg) setNotice(msg);
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleDay(day) {
    const set = new Set(restaurant.activeOfferDays);
    set.has(day) ? set.delete(day) : set.add(day);
    patch({ activeOfferDays: Array.from(set) }, 'Offer days updated.');
  }

  function addSlot() {
    if (!/^\d{2}:\d{2}$/.test(slotInput)) { setError('Use HH:MM, e.g. 19:00'); return; }
    if (restaurant.timeSlots.includes(slotInput)) return;
    const next = [...restaurant.timeSlots, slotInput].sort();
    patch({ timeSlots: next }, 'Time slot added.');
    setSlotInput('');
  }
  function removeSlot(slot) {
    patch({ timeSlots: restaurant.timeSlots.filter((s) => s !== slot) });
  }

  async function setOverride(enabled) {
    if (!overrideDate) { setError('Pick a date first.'); return; }
    try {
      const res = await api.dayToggle(session.token, { date: overrideDate, enabled });
      setRestaurant(res.restaurant);
      setNotice(enabled === false ? `${overrideDate} switched off.` : enabled === true ? `${overrideDate} forced on.` : `${overrideDate} reset to normal.`);
    } catch (err) { setError(err.message); }
  }

  async function addStaff(e) {
    e.preventDefault();
    setNewStaffCreds(null);
    try {
      const res = await api.addStaff(session.token, staffName.trim());
      setNewStaffCreds(res.credentials);
      setStaffName('');
      const s = await api.staff(session.token);
      setStaff(s.staff);
    } catch (err) { setError(err.message); }
  }

  if (!restaurant) return <main className="container"><p className="muted">Loading…</p></main>;

  const overrides = Object.entries(restaurant.dayOverrides || {});
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <main className="container">
      <span className="eyebrow">Your venue</span>
      <h1 style={{ marginBottom: 4 }}>{restaurant.name}</h1>
      <p className="muted" style={{ marginTop: 0 }}>{restaurant.location?.city} · {restaurant.location?.address}</p>

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      {/* Offer */}
      <div className="card">
        <div className="card-head"><h2>The offer</h2></div>
        <div className="row">
          <div>
            <label>Food discount</label>
            <div className="spread" style={{ gap: 16 }}>
              <input type="range" min="40" max="60" value={restaurant.discountPercent}
                onChange={(e) => setRestaurant({ ...restaurant, discountPercent: Number(e.target.value) })}
                onMouseUp={(e) => patch({ discountPercent: Number(e.target.value) }, 'Discount saved.')}
                onTouchEnd={(e) => patch({ discountPercent: Number(e.target.value) }, 'Discount saved.')}
                style={{ flex: 1 }} />
              <span className="range-val">{restaurant.discountPercent}%</span>
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', margin: '6px 0 0' }}>Each guest buys one drink at full price; food is {restaurant.discountPercent}% off. Allowed range 40–60%.</p>
          </div>
          <div style={{ maxWidth: 160 }}>
            <label>Tables per hour</label>
            <input type="number" min="1" value={restaurant.maxTables}
              onChange={(e) => setRestaurant({ ...restaurant, maxTables: Number(e.target.value) })}
              onBlur={(e) => patch({ maxTables: Number(e.target.value) }, 'Capacity saved.')} />
            <p className="muted" style={{ fontSize: '0.8rem', margin: '6px 0 0' }}>Max bookings accepted in each 1-hour slot.</p>
          </div>
        </div>
      </div>

      {/* Days */}
      <div className="card">
        <div className="card-head"><h2>Days you run the offer</h2></div>
        <div className="chip-row">
          {DAYS.map(([key, label]) => (
            <span key={key} className={`chip day-toggle ${restaurant.activeOfferDays.includes(key) ? 'on' : 'off'}`}
              onClick={() => toggleDay(key)}>{label}</span>
          ))}
        </div>
        <hr className="soft" />
        <label>Override a specific date</label>
        <p className="muted" style={{ fontSize: '0.82rem', marginTop: 0 }}>Force a single day off (e.g. a holiday) or on, without changing your weekly pattern.</p>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ maxWidth: 200 }}><input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} /></div>
          <button className="danger sm" onClick={() => setOverride(false)} style={{ flex: 'none' }}>Switch off</button>
          <button className="sm" onClick={() => setOverride(true)} style={{ flex: 'none' }}>Force on</button>
          <button className="ghost sm" onClick={() => setOverride(null)} style={{ flex: 'none' }}>Reset</button>
        </div>
        {overrides.length > 0 && (
          <div className="chip-row" style={{ marginTop: 12 }}>
            {overrides.map(([date, on]) => (
              <span key={date} className={`chip ${on ? 'on' : 'off'}`}>{date}: {on ? 'on' : 'off'}</span>
            ))}
          </div>
        )}
      </div>

      {/* Time slots */}
      <div className="card">
        <div className="card-head"><h2>Time slots</h2><span className="muted">each slot = 1 hour</span></div>
        <div className="chip-row" style={{ marginBottom: 14 }}>
          {restaurant.timeSlots.map((slot) => (
            <span key={slot} className="chip">{slot}
              <button className="ghost sm" style={{ padding: '0 6px', marginLeft: 4 }} onClick={() => removeSlot(slot)}>×</button>
            </span>
          ))}
          {restaurant.timeSlots.length === 0 && <span className="muted">No slots yet.</span>}
        </div>
        <div className="row" style={{ maxWidth: 320 }}>
          <input type="text" placeholder="19:00" value={slotInput} onChange={(e) => setSlotInput(e.target.value)} />
          <button onClick={addSlot} style={{ flex: 'none' }}>Add slot</button>
        </div>
      </div>

      {/* Bookings */}
      <div className="card">
        <div className="card-head"><h2>Bookings</h2><span className="chip on">{confirmedCount} confirmed</span></div>
        {bookings.length === 0 && <p className="muted">No bookings yet. They’ll appear here the moment a guest books.</p>}
        {bookings.map((b) => (
          <div className={`ticket ${b.status === 'cancelled' ? 'cancelled' : ''}`} key={b.id}>
            <span className="when">{b.timeSlot}</span>
            <div>
              <div className="name">{b.bookingName} · {b.partySize} {b.partySize > 1 ? 'guests' : 'guest'}</div>
              <div className="meta">{b.date} · {b.contactNumber} · {b.discountApplied}% off</div>
            </div>
            <span className={`chip ${b.status === 'confirmed' ? 'on' : 'off'}`}>{b.status}</span>
          </div>
        ))}
      </div>

      {/* Staff (owner only) */}
      {isOwner && (
        <div className="card">
          <div className="card-head"><h2>Team</h2></div>
          {newStaffCreds && (
            <div className="cred-box" style={{ marginBottom: 12 }}>
              new staff login — username: {newStaffCreds.username} · password: {newStaffCreds.password}
            </div>
          )}
          {staff.map((s) => (
            <div className="list-item" key={s.id}>
              <span>{s.username}</span>
              <span className="chip">{s.role}</span>
            </div>
          ))}
          <hr className="soft" />
          <form onSubmit={addStaff} className="row" style={{ maxWidth: 360 }}>
            <input type="text" placeholder="new staff username" value={staffName} onChange={(e) => setStaffName(e.target.value)} required />
            <button type="submit" style={{ flex: 'none' }}>Add staff</button>
          </form>
        </div>
      )}
    </main>
  );
}
