import { auth, db } from '../config/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

// Middleware to check if user is authenticated
export const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/signin?error=Please sign in to continue");
};

// Middleware to check if profile is complete
export const checkProfileComplete = async (req, res, next) => {
  try {
    // Skip check if user is not logged in (auth routes will handle this)
    if (!req.session || !req.session.user) {
      return res.redirect('/signin?error=Please sign in to continue');
    }
    
    const userId = req.session.user.user_id;
    
    // If we already know the profile completion status from the session, use that
    if (req.session.user.profile_complete === true) {
      return next();
    }
    
    // Otherwise, check Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      // User not found in database, clear session and redirect to signin
      req.session.destroy();
      return res.redirect('/signin?error=Authentication error. Please sign in again.');
    }
    
    const userData = userDoc.data();
    
    // Check if profile is complete either by the flag or by having title and bio
    const isComplete = userData.profile_complete || (userData.title && userData.bio);
    
    // Update the session with the current profile_complete status
    req.session.user.profile_complete = isComplete;
    
    // If profile is incomplete, redirect to complete profile page
    if (!isComplete) {
      console.log("Profile incomplete, redirecting to complete profile page");
      return res.redirect('/profile/complete');
    }
    
    // Profile is complete, proceed to requested page
    next();
  } catch (error) {
    console.error("Error checking profile completion:", error);
    // In case of error, proceed to avoid blocking user
    next();
  }
};