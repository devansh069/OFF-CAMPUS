const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('./off-campus-44e8f-firebase-adminsdk-fbsvc-b2bee1766d.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});


const auth = getAuth(app);

module.exports = {
  auth
};
