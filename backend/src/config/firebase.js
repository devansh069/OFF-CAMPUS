const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = cert(serviceAccount);
    console.log('[Firebase] Initialized using FIREBASE_SERVICE_ACCOUNT env variable.');
  } catch (error) {
    console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:', error.message);
  }
}

if (!credential) {
  try {
    const serviceAccount = require('./off-campus-44e8f-firebase-adminsdk-fbsvc-b2bee1766d.json');
    credential = cert(serviceAccount);
    console.log('[Firebase] Initialized using local service account JSON file.');
  } catch (error) {
    console.warn('[Firebase] Service account JSON missing. Make sure FIREBASE_SERVICE_ACCOUNT env var is configured.');
  }
}

const app = initializeApp({
  credential
});

const auth = getAuth(app);

module.exports = {
  auth
};
