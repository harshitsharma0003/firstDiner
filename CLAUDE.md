# CLAUDE.md

Guidance for working in the **firstDiner** repo. firstDiner is a weeknight
restaurant-deal booking platform: a guest books a table (max 4) at a discounted
venue, each guest buys one drink at full price, and food is 40–60% off. The offer
runs on the days each restaurant chooses (Mon–Thu by default).

## Three-surface architecture

One shared backend serves three independent front-ends. **All business logic
lives in the backend** — the front-ends are thin clients over the HTTP API.

```
  mobile/ (Flutter)        web/ (React + Vite)            web/ (same app)
  customer app             admin console                  restaurant console
  iOS + Android            onboard/enable venues          offer, capacity, bookings
        \                          |                              /
         \_________________________|_____________________________/
                                   v
                        backend/ (Node + Express)
                        every booking rule lives here
                                   v
                  in-memory store (dev)  →  Firestore (prod)
```

| Surface | Stack | Audience | Entry points |
|---|---|---|---|
| `mobile/` | Flutter (Provider state) | Diners | `lib/main.dart` → `screens/splash.dart`; HTTP via `lib/api_client.dart`, base URL in `lib/config.dart` (`API_BASE`, default `http://10.0.2.2:4000/api`) |
| `web/` | React 18 + Vite | Admin **and** restaurant (one app, role-switched) | `src/App.jsx` renders `AdminDashboard` or `RestaurantDashboard` by `session.role`; API client in `src/lib/api.js` |
| `backend/` | Node 18+ / Express | n/a (API) | `src/index.js` → `src/app.js`; routes under `src/routes/` |

The web app is a **single React app hosting two consoles**: the signed-in role
(`admin` vs `restaurant`) decides which dashboard renders — there is no separate
admin build.

## Where the booking rules live

**`backend/src/logic/availability.js` is the single source of truth for booking
rules.** It is pure and synchronous — it takes a restaurant object plus already-
fetched booked counts and returns decisions. It never touches the data store.

- `isDayActive(restaurant, dateStr)` — a date is bookable only if its weekday is
  in `activeOfferDays` **and** no per-day override turns it off. An override can
  also force a normally-off day on (holiday toggle).
- `buildDayAvailability(restaurant, dateStr, countForSlot)` — per-slot remaining
  tables + `available`/`full` status; empty + `dayActive:false` when the day is off.
- `validateBooking(restaurant, {date, timeSlot, partySize}, bookedCount)` — gate
  for `POST /api/bookings`: enabled venue, party size 1–`maxPartySize`, day active,
  valid slot, capacity not reached. Returns `{ ok, code, message }`.

Tunable constants (party max, discount band 40–60%, default days Mon–Thu, default
discount 50) live in `backend/src/config.js`, **not** hard-coded in the logic.

Rules summary (enforced server-side):

| Rule | Behaviour |
|---|---|
| Slot length | Every slot is 1 hour. |
| Capacity | Per (restaurant, date, hour); once confirmed bookings reach `maxTables` the slot is `full`. |
| Party size | 1–4 guests; 5+ rejected. |
| Offer days | Weekday in `activeOfferDays` unless a per-day override flips it. |
| Discount | 40–60% (default 50), clamped on save. |
| Terms | Booking rejected unless `acceptedTerms` is true. |

**Tests:** `cd backend && npm run test:logic` runs `availability.test.js`. When you
change a booking rule, update the logic, its test, and this table together.

## The data-store abstraction

`backend/src/data/store.js` selects an implementation at startup from the
`DATA_STORE` env var and exports a single object. Everything else in the backend
imports `../data/store` and calls its async methods — **no route or logic module
ever talks to a concrete store.**

- `memoryStore.js` (`DATA_STORE=memory`, the default) — JS `Map`s, data lives only
  while the process runs, reseeded on every boot.
- `firestoreStore.js` (`DATA_STORE=firestore`) — a **documented stub that throws**
  until implemented. The file contains worked examples (incl. the capacity count
  query and its composite index).

**The contract:** every store method has the same signature across both
implementations (admins, restaurants, restaurant users, customers, OTPs, bookings;
`countBookingsForSlot` is the capacity primitive). To add persistence you only
implement the methods in `firestoreStore.js` — routes and logic are store-agnostic
and do not change. When adding a new store method, add it to **both** files with
identical signatures.

## Surfaces ↔ API map

- **Auth** (`routes/auth.js`): admin/restaurant password login; customer **dev OTP**
  (`request-otp` returns `devCode` when `EXPOSE_OTP` ≠ `false`, `verify-otp` issues a
  JWT). JWT + `requireRole` middleware (`middleware/auth.js`) guards every protected
  route; `requireRole('owner')`-style checks gate staff management.
- **Admin** (`routes/admin.js`): create restaurant (returns a generated owner
  password once), list/edit, enable/disable, reset owner password.
- **Restaurant** (`routes/restaurant.js`): `me`, `settings` (discount/maxTables/days/
  slots, discount clamped to config band), `day-toggle` (per-day override), live
  `bookings`, staff add/list.
- **Customer** (`routes/customer.js`, mounted at `/api`): search restaurants,
  availability for a date, create booking, my bookings, cancel.

## Launch priorities

> **Note:** the task referenced a `LAUNCH-GUIDE.md` with "Stage 0 priorities," but
> no such file exists in this repo (only `README.md`). The items below are the
> production-readiness steps **derived from the README's "Going to production" and
> "What's verified vs. what to extend" sections** — not a confirmed Stage 0 list.
> Replace this section with the real priorities if/when the launch guide is added.

Highest-leverage work to ship, from the README roadmap:

1. **Firestore store** — implement the methods in `firestoreStore.js` (same
   signatures as `memoryStore.js`), `npm install firebase-admin`, set
   `DATA_STORE=firestore` + `GOOGLE_APPLICATION_CREDENTIALS`. Nothing else changes.
2. **Real phone auth** — replace the dev OTP flow (`routes/auth.js` +
   `mobile/lib/api_client.dart`) with Firebase Phone Auth; set `EXPOSE_OTP=false`.
3. **Real-time bookings** — the restaurant console polls every 8s
   (`web/src/views/RestaurantDashboard.jsx`); on Firestore switch to an `onSnapshot`
   listener.
4. **Secrets/hardening** — set a strong `JWT_SECRET`, change the seeded admin
   password (defaults `admin/admin123` are dev-only), host the API and point web +
   mobile at it.

Verification status (README): backend is implemented and tested end-to-end; web
builds clean (`npm run build`); mobile is implemented but has **not** been compiled
here (no Flutter SDK) — run `flutter pub get` and `flutter analyze` before launch.

## Running locally

Two terminals; in-memory store, no external services needed.

```bash
cd backend && npm install && npm start    # http://localhost:4000, seeds demo data
cd web && npm install && npm run dev       # http://localhost:5173
cd mobile && flutter pub get && flutter run # needs Flutter SDK
```

Seeded logins: admin `admin/admin123`; owners `spice/spice123`, `olive/olive123`.

## Conventions

- Backend is CommonJS (`'use strict'`, `require`), Node 18+, no TypeScript.
- Keep booking rules in `availability.js` — do **not** scatter rule checks into
  routes; routes fetch data and call the logic.
- Store access only through `../data/store`; keep `memoryStore` and `firestoreStore`
  signature-identical.
- Money/auth defaults (`JWT_SECRET`, admin password, `EXPOSE_OTP`) are dev-only;
  treat anything in `config.js` defaults as not production-safe.
