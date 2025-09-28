const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Check if running in development with emulators
    const isEmulatorMode = process.env.USE_FIREBASE_EMULATOR === 'true';
    console.log('🔄 Firebase initialization - Emulator mode:', isEmulatorMode);
    
    if (isEmulatorMode) {
      // For emulator mode, use a demo project
      console.log('🔄 Initializing Firebase Admin SDK for emulator mode...');
      
      admin.initializeApp({
        projectId: 'demo-test',
        credential: admin.credential.applicationDefault()
      });
      
      // Connect to emulators
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
      
      console.log('✅ Firebase Admin SDK initialized for emulator mode');
      console.log('🔥 Connected to Firebase Auth Emulator: localhost:9099');
      console.log('🔥 Connected to Firestore Emulator: localhost:8080');
    } else {
      // Production mode - use service account credentials
      const firebaseConfig = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };

      // Verify required environment variables
      const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_CLIENT_ID'
      ];

      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.warn('⚠️  Firebase admin initialization skipped: missing environment variables:', missingVars);
        console.warn('⚠️  Falling back to emulator mode');
        
        // Fallback to emulator mode
        admin.initializeApp({
          projectId: 'demo-test',
          credential: admin.credential.applicationDefault(),
          storageBucket: 'demo-test.appspot.com'
        });
        
        process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
        process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
        
        console.log('✅ Firebase Admin SDK initialized in fallback emulator mode');
      } else {
        console.log('🔍 Firebase config loaded:', {
          projectId: firebaseConfig.project_id,
          clientEmail: firebaseConfig.client_email,
          privateKeyId: firebaseConfig.private_key_id,
          hasPrivateKey: !!firebaseConfig.private_key,
          privateKeyLength: firebaseConfig.private_key?.length || 0
        });
        
        admin.initializeApp({
          credential: admin.credential.cert(firebaseConfig),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
          storageBucket: process.env.FIREBASE_PROJECT_ID + '.appspot.com'
        });
        
        console.log('✅ Firebase Admin SDK initialized successfully for production');
      }
    }
  } catch (error) {
    console.warn('⚠️  Firebase admin initialization failed:', error.message);
    console.warn('⚠️  Falling back to emulator mode');
    
    try {
      // Fallback: initialize for emulator
      admin.initializeApp({
        projectId: 'demo-test',
        credential: admin.credential.applicationDefault()
      });
      
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
      
      console.log('✅ Firebase Admin SDK initialized in fallback emulator mode');
    } catch (fallbackError) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', fallbackError.message);
    }
  }
} else {
  console.log('✅ Firebase Admin SDK already initialized');
}

module.exports = admin;
