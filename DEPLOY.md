# Deploying the firstDiner backend (Render free tier)

Goal: a public HTTPS URL for the backend so the mobile app can reach it from a
real phone. The `render.yaml` blueprint at the repo root does most of the setup;
you add one secret (the Firebase key) in the dashboard.

## 1. Create the service from the blueprint

1. Sign up at <https://render.com> (free, "Sign in with GitHub").
2. **New +** → **Blueprint**.
3. Connect the **`harshitsharma0003/firstDiner`** repo. Render reads
   `render.yaml` and shows a service **`firstdiner-api`**.
4. Click **Apply**. The first deploy will start and **fail health checks** —
   that's expected until you add the Firebase key (next step).

## 2. Add the Firebase key as a Secret File

The backend authenticates to Firestore with the service-account key. It must not
be committed, so add it as a Secret File:

1. Open the **firstdiner-api** service → **Environment** → **Secret Files** → **Add Secret File**.
2. **Filename:** `service-account.json`
3. **Contents:** paste the entire contents of your local
   `backend/service-account.json` (open it, copy all, paste).
4. Save. Render redeploys automatically.

> `render.yaml` already sets `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/service-account.json`,
> which is where Render mounts that file — so no code change is needed.

## 3. Get the URL and verify

Your service URL is shown at the top, e.g. `https://firstdiner-api.onrender.com`.

```bash
curl https://firstdiner-api.onrender.com/api/health
# -> {"ok":true,"service":"firstDiner-api"}
```

> Free tier spins down after ~15 min idle; the first request then takes ~50s to
> wake. Fine for testing.

## 4. Build a phone-ready APK pointing at it

GitHub → repo → **Actions** → **Build Android APK** → **Run workflow**:
- **mode:** `release`
- **api_base:** `https://firstdiner-api.onrender.com/api`  ← your URL + `/api`

Download the resulting APK artifact, install it, and sign in (use the Firebase
**test number** `+91 9999900001` / `123456`, or a real number once you've added
your release-signing SHA-1 in Firebase).

## Notes
- The seeded demo data (2 restaurants, admin `admin/admin123`) is already in
  Firestore — change the admin password before any real use.
- To also host the **web console** (admin/restaurant), deploy `web/` as a Render
  Static Site (`npm run build`, publish `web/dist`) pointing its API at this URL.
