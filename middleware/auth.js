import { auth } from '../config/firebase.js';

// Optimized authentication middleware
export const isAuthenticated = (req, res, next) => {
  // Quick check for session existence to avoid unnecessary processing
  if (!req.session || !req.session.user) {
    // Store the original URL for redirection after login
    req.session.returnTo = req.originalUrl;
    return res.redirect("/signin");
  }
  
  // Proceed to the next middleware
  next();
};

export const checkProfileComplete = (req, res, next) => {
  // Skip profile check if not needed
  if (!req.session.user) {
    return next();
  }
  
  // Check if profile is complete
  const user = req.session.user;
  if (!user.profile_complete) {
    return res.redirect("/profile/complete");
  }
  
  next();
};

// Add a lightweight authentication check for API routes
export const apiAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};