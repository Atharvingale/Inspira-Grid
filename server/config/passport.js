const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
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

// GitHub Strategy (only if credentials are provided)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && 
    process.env.GITHUB_CLIENT_ID !== 'your-github-client-id') {
  
  console.log('GitHub OAuth Config:', {
    clientID: process.env.GITHUB_CLIENT_ID ? `${process.env.GITHUB_CLIENT_ID.substring(0, 10)}...` : 'MISSING',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ? `${process.env.GITHUB_CLIENT_SECRET.substring(0, 10)}...` : 'MISSING',
    callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:5000/api/auth/github/callback"
  });

  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:5000/api/auth/github/callback"
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('GitHub OAuth Profile:', {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      email: profile.emails?.[0]?.value
    });

    // If Firebase is not initialized, return a mock user for testing
    if (!firebaseInitialized || !db) {
      console.log('⚠️  Firebase not initialized, returning mock GitHub user');
      const mockUser = {
        uid: `github_${profile.id}`,
        githubId: profile.id,
        githubUsername: profile.username,
        displayName: profile.displayName || profile.username,
        email: profile.emails?.[0]?.value || '',
        photoURL: profile.photos?.[0]?.value || '',
        githubProfileUrl: profile.profileUrl,
        authProvider: 'github'
      };
      return done(null, mockUser);
    }

    // Check if user already exists in Firestore
    const existingUserQuery = await db.collection('users')
      .where('githubId', '==', profile.id)
      .get();

    let userDoc;
    
    if (!existingUserQuery.empty) {
      // User exists, get the first match
      userDoc = existingUserQuery.docs[0];
      console.log('Existing GitHub user found:', userDoc.id);
    } else {
      // Check if user exists by email
      const email = profile.emails?.[0]?.value;
      if (email) {
        const emailQuery = await db.collection('users')
          .where('email', '==', email)
          .get();
        
        if (!emailQuery.empty) {
          // User exists with this email, link GitHub account
          userDoc = emailQuery.docs[0];
          await userDoc.ref.update({
            githubId: profile.id,
            githubUsername: profile.username,
            githubAccessToken: accessToken,
            githubProfileUrl: profile.profileUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('Linked GitHub to existing email user:', userDoc.id);
        }
      }
      
      if (!userDoc) {
        // Create new user
        const newUserRef = db.collection('users').doc();
        const newUserData = {
          githubId: profile.id,
          githubUsername: profile.username,
          githubAccessToken: accessToken,
          displayName: profile.displayName || profile.username,
          email: profile.emails?.[0]?.value || '',
          photoURL: profile.photos?.[0]?.value || '',
          githubProfileUrl: profile.profileUrl,
          bio: profile._json?.bio || '',
          location: profile._json?.location || '',
          website: profile._json?.blog || '',
          publicRepos: profile._json?.public_repos || 0,
          followers: profile._json?.followers || 0,
          following: profile._json?.following || 0,
          skills: [],
          profileComplete: false,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          role: 'user',
          authProvider: 'github'
        };
        
        await newUserRef.set(newUserData);
        userDoc = await newUserRef.get();
        console.log('Created new GitHub user:', newUserRef.id);
      }
    }

    // Return user data for session
    const userData = {
      uid: userDoc.id,
      ...userDoc.data(),
      githubAccessToken: accessToken // Keep access token for API calls
    };
    
    return done(null, userData);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return done(error, null);
  }
  }));
  
  console.log('✅ GitHub OAuth strategy initialized');
} else {
  console.log('⚠️  GitHub OAuth strategy skipped: credentials not provided');
}

module.exports = passport;
