# firstDiner

A weeknight restaurant-deal booking platform. Guests book a table (max 4) at a
discounted venue; each guest buys one drink at full price and the food is 40–60%
off. The offer runs on the days each restaurant chooses (Mon–Thu by default).

Three pieces, one shared backend:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Flutter app    │     │   Web console    │     │   Web console   │
│  (customers)    │     │  (restaurant)    │     │    (admin)      │
│  iOS + Android  │     │                  │     │                 │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │   Node.js API (Express)  │
                    │   all booking rules live │
                    │   here; swappable store  │
                    └────────────┬─────────────┘
                                 ▼
                 in-memory store (dev)  →  Firestore (prod)
```

- **`/backend`** — Node.js + Express API. Holds every booking rule. Runs on an
  in-memory store out of the box; swap to Firestore for production.
- **`/web`** — React (Vite). Two consoles in one app: **admin** (onboard
  restaurants, generate logins, enable/disable) and **restaurant** (set the
  offer, capacity, days, time slots; see live bookings; manage staff).
- **`/mobile`** — Flutter customer app: splash → OTP login → search → pick a
  date/time → book with terms → my bookings.

---

## Quick start (everything on the in-memory store)

You need **Node 18+**. Open two terminals.

**1. Backend**
```bash
cd backend
npm install
npm start          # http://localhost:4000
```
On boot it seeds demo data and prints logins. Defaults:
- Admin: `admin / admin123`
- Restaurant owners: `spice / spice123`, `olive / olive123`

**2. Web console**
```bash
cd web
npm install
npm run dev        # http://localhost:5173
```
Sign in on the **Admin** tab to onboard restaurants, or the **Restaurant** tab
(`spice / spice123`) to manage an offer and watch bookings arrive.

**3. Mobile app** (needs the [Flutter SDK](https://docs.flutter.dev/get-started/install))
```bash
cd mobile
flutter pub get
flutter run        # pick an emulator or device
```
The app defaults to `http://10.0.2.2:4000/api` (the Android emulator's route to
your host). For an iOS simulator or a real device, override it:
```bash
flutter run --dart-define=API_BASE=http://YOUR_LAN_IP:4000/api
```

> The OTP login is in **dev mode**: the backend returns the code in its response
> and the app shows it on screen, so you can sign in without sending SMS. See the
> Firebase section below to switch to real phone auth.

---

## The booking rules (where they live)

All enforced server-side in `backend/src/logic/availability.js`, with tests in
`availability.test.js` (`npm run test:logic`):

| Rule | Behaviour |
|---|---|
| Slot length | Every time slot is **1 hour**. |
| Capacity | Per (restaurant, date, hour), once confirmed bookings reach **max tables**, the slot is **full** → app shows *"Tables not available."* |
| Party size | **1–4 guests** per booking; 5+ is rejected. |
| Offer days | A date is bookable only if its weekday is in the restaurant's active days **and** no per-day override switches it off. Otherwise → *"No tables available."* |
| Per-day toggle | A restaurant can force any single date off (a holiday) or on, without changing the weekly pattern. |
| Discount | Restaurant-set **40–60%** (default 50%). Validated on save. |
| Terms | Booking is rejected unless the guest accepts the one-drink terms. |

---

## Going to production

### 1. Firestore (instead of in-memory)
`backend/src/data/` has a store interface with two implementations. The
in-memory one runs now; `firestoreStore.js` is a documented stub. To switch:
1. `cd backend && npm install firebase-admin`
2. Create a Firebase project, enable **Firestore**.
3. Implement the methods in `firestoreStore.js` (each has the same signature as
   `memoryStore.js`; the file shows worked examples for the tricky queries).
4. Set `DATA_STORE=firestore` and `GOOGLE_APPLICATION_CREDENTIALS` in `.env`.

Nothing else in the codebase changes — routes and logic are store-agnostic.

### 2. Firebase Phone Auth (instead of dev OTP)
The dev OTP flow lives in `backend/src/routes/auth.js` and
`mobile/lib/api_client.dart`. To ship real SMS auth:
1. Enable **Phone Authentication** in Firebase.
2. Add `firebase_core` + `firebase_auth` to `mobile/pubspec.yaml` (commented
   lines are there) and use `verifyPhoneNumber` → `signInWithCredential`.
3. Send the Firebase ID token to a backend endpoint that verifies it with
   `firebase-admin` and issues your app JWT (or trust the Firebase token
   directly). Replace `requestOtp`/`verifyOtp` in `api_client.dart`.
4. Set `EXPOSE_OTP=false` in the backend `.env`.

### 3. Real-time bookings
The restaurant console currently **polls** every 8 seconds for new bookings (see
`web/src/views/RestaurantDashboard.jsx`). On Firestore, replace the poll with an
`onSnapshot` listener on the `bookings` collection for instant updates.

### 4. Other deploy notes
- Set a strong `JWT_SECRET` and change the seeded admin password.
- Host the API (Cloud Run, Render, Fly, etc.), point `web` and `mobile` at it.
- `cd web && npm run build` produces a static bundle in `web/dist`.

---

## Project layout
```
backend/
  src/
    logic/availability.js        # the booking rules (+ .test.js)
    data/{memoryStore,firestoreStore,store}.js
    routes/{auth,admin,restaurant,customer}.js
    auth/auth.js  middleware/auth.js
    app.js  index.js  seed.js  config.js
web/
  src/
    views/{Login,AdminDashboard,RestaurantDashboard}.jsx
    lib/api.js  styles.css  App.jsx  main.jsx
mobile/
  lib/
    screens/{splash,login,home,restaurant_detail,booking,my_bookings}.dart
    api_client.dart  models.dart  config.dart  state/app_state.dart  main.dart
```

## What's verified vs. what to extend
- **Backend** — fully implemented and tested end-to-end (logic unit tests + live
  API runs through all three roles).
- **Web** — implemented; builds clean with `npm run build`.
- **Mobile** — implemented; written against a live backend. It hasn't been
  compiled in this environment (no Flutter SDK here), so run `flutter pub get`
  and `flutter analyze` once on your machine before first launch.
