const admin = require('firebase-admin');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  next();
};

// Middleware to check if user has admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'You do not have permission to access this resource'
    });
  }
  
  next();
};

// Middleware to check if user's profile is complete
const requireCompleteProfile = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  
  if (!req.user.profileComplete) {
    return res.status(400).json({
      error: 'Profile incomplete',
      message: 'Please complete your profile before accessing this resource',
      profileComplete: false
    });
  }
  
  next();
};

// Middleware to validate Firebase ID token (for Firebase Auth users)
const validateFirebaseToken = async (req, res, next) => {
  try {
    // First check if user is already authenticated via session (GitHub OAuth)
    if (req.user) {
      return next(); // User is authenticated via session, skip Firebase token validation
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Let session-based auth handle it or continue for public routes
    }

    const token = authHeader.split(' ')[1];

    // In development, accept mock tokens of the form 'mock-token-<uid>-<timestamp>'
    if (process.env.NODE_ENV !== 'production' && token.startsWith('mock-token-')) {
      const parts = token.split('mock-token-')[1];
      const uid = parts?.split('-')[0];
      
      req.user = {
        uid: uid || 'mock-user',
        email: `${uid || 'mock-user'}@example.com`,
        displayName: (uid || 'mock-user').replace(/-/g, ' '),
        profileComplete: true,
        role: 'user'
      };
      return next();
    }

    // Verify real Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user data from Firestore
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists) {
      req.user = {
        uid: decodedToken.uid,
        ...userDoc.data()
      };
    } else {
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email?.split('@')[0],
        profileComplete: false
      };
    }
    
    next();
  } catch (error) {
    console.error('Firebase token validation error:', error.message);
    // Don't set req.user on error - let routes handle unauthorized access
    next(); // Continue with session-based auth or let routes handle missing user
  }
};

// Rate limiting middleware
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireCompleteProfile,
  validateFirebaseToken,
  createRateLimit
};