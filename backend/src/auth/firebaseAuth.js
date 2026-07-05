'use strict';
/**
 * Firebase Phone Auth — server side.
 *
 * The mobile app performs the SMS verification with the Firebase Auth SDK, then
 * sends us the resulting Firebase ID token. We verify it with firebase-admin and
 * trust the phone_number claim to issue our own app JWT.
 *
 * firebase-admin is required lazily (it's an optional dependency, only needed
 * when Firestore and/or Phone Auth are in use). Initialization is guarded by
 * getApps() so it composes with the Firestore store's init — whichever runs
 * first creates the default app, the other reuses it. Credentials come from
 * GOOGLE_APPLICATION_CREDENTIALS (the same service-account key as Firestore).
 */
let _auth;

function getFirebaseAuth() {
  if (_auth) return _auth;
  let appMod, authMod;
  try {
    appMod = require('firebase-admin/app');
    authMod = require('firebase-admin/auth');
  } catch (err) {
    throw new Error(
      'Firebase Phone Auth needs the firebase-admin package. Run ' +
        '`npm install firebase-admin` in backend/.'
    );
  }
  const { getApps, getApp, initializeApp, applicationDefault } = appMod;
  const { getAuth } = authMod;
  const app = getApps().length ? getApp() : initializeApp({ credential: applicationDefault() });
  _auth = getAuth(app);
  return _auth;
}

/** Verify a Firebase ID token. Resolves to the decoded token, or throws. */
async function verifyFirebaseIdToken(idToken) {
  return getFirebaseAuth().verifyIdToken(idToken);
}

module.exports = { getFirebaseAuth, verifyFirebaseIdToken };
