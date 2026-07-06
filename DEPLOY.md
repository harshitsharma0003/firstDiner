# Hosting the whole firstDiner stack

What needs hosting and where it ends up:

| Piece | Host | Notes |
|---|---|---|
| **Database** | Firestore (Google Cloud) | Already hosted — nothing to do. Project `firstdiner-473d4f`. |
| **Backend API** | Render web service | `firstdiner-api` in `render.yaml` |
| **Admin + Restaurant console** | Render static site | `firstdiner-web` in `render.yaml` (one React app, role-switched) |
| **Customer app** | APK from CI | Rebuild pointing at the hosted API (below) |

The `render.yaml` blueprint at the repo root deploys **both** the backend and the web
console. You do the signup + two small secret/config steps in the dashboard.

## 1. Deploy backend + web from the blueprint

1. Sign up at <https://render.com> ("Sign in with GitHub").
2. **New +** → **Blueprint** → connect **`harshitsharma0003/firstDiner`**.
   Render reads `render.yaml` and shows two services: `firstdiner-api` and `firstdiner-web`.
3. **Apply.** The backend's first deploy will fail health checks until you add the
   Firebase key (next step); the web build will succeed but can't reach the API yet.

## 2. Give the backend its Firebase key (Secret File)

1. Open **firstdiner-api** → **Environment** → **Secret Files** → **Add Secret File**.
2. Filename: `service-account.json`
3. Contents: paste all of your local `backend/service-account.json`.
4. Save → it redeploys. Verify:
   ```bash
   curl https://firstdiner-api.onrender.com/api/health   # {"ok":true,...}
   ```

## 3. Point the web console at the backend

1. Open **firstdiner-web** → **Environment** → add:
   - `VITE_API_BASE` = `https://firstdiner-api.onrender.com/api`  (your api URL + `/api`)
2. **Manual Deploy → Deploy latest commit** (Vite bakes the value in at build time).
3. Open the web URL → log in:
   - Admin: `admin` / `admin123`
   - Restaurant: `spice` / `spice123` or `olive` / `olive123`

> If the blueprint doesn't create the static site on your Render plan, make it by
> hand: **New + → Static Site** → this repo → Root Dir `web`, Build
> `npm install && npm run build`, Publish `dist`, add the `VITE_API_BASE` env var.

## 4. Point the mobile app at the hosted backend

GitHub → repo → **Actions** → **Build Android APK** → **Run workflow**:
- **mode:** `release`
- **api_base:** `https://firstdiner-api.onrender.com/api`

Install the resulting APK (or upload it to Appetize). Sign in with the demo number
`+919968225190` / `123456`, a Firebase test number, or a real `+91` number.

## Notes
- Render free tier **spins down** after ~15 min idle; first request then takes ~50s.
- Change the seeded admin password before real use (it's in Firestore).
- Remove the demo bypass (`testPhoneNumbers` in `backend/src/config.js`,
  `_demoNumbers` in `mobile/lib/screens/login.dart`) before a real launch.
