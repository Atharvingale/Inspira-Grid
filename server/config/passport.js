const passport = require('passport');
const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already done)
let db = null;
let firebaseInitialized = false;

if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== 'test-project') {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
        authUri: process.env.FIREBASE_AUTH_URI,
        tokenUri: process.env.FIREBASE_TOKEN_URI,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    db = admin.firestore();
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.log('⚠️  Firebase admin initialization skipped:', error.message);
  }
} else {
  console.log('⚠️  Firebase admin initialization skipped: using test credentials or already initialized');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.uid);
});

// Deserialize user from session
passport.deserializeUser(async (uid, done) => {
  try {
    if (!firebaseInitialized || !db) {
      console.log('⚠️  Firebase not initialized, skipping user deserialization');
      return done(null, { uid, displayName: 'Test User', email: 'test@example.com' });
    }
    
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      done(null, { uid, ...userDoc.data() });
    } else {
      done(null, null);
    }
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
