// ============================================
// VoChat - Firebase Admin SDK Configuration
// Used for: Storage (audio files) + FCM (push notifications)
// ============================================

const admin = require('firebase-admin');
const config = require('./env');

let firebaseApp = null;

function initializeFirebase() {
  if (firebaseApp) return firebaseApp;

  // Skip initialization if Firebase config is missing (dev mode)
  if (!config.firebase.projectId) {
    console.warn('⚠️  Firebase not configured — media upload & push notifications disabled');
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
      storageBucket: config.firebase.storageBucket,
    });

    console.log('🔥 Firebase initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    return null;
  }
}

function getStorage() {
  const app = initializeFirebase();
  if (!app) return null;
  return admin.storage().bucket();
}

function getMessaging() {
  const app = initializeFirebase();
  if (!app) return null;
  return admin.messaging();
}

module.exports = {
  initializeFirebase,
  getStorage,
  getMessaging,
};
