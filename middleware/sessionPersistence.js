// Middleware to ensure session persistence on Vercel
export const ensureSessionPersistence = (req, res, next) => {
  // If the session has a user, ensure the cookie is refreshed
  if (req.session && req.session.user) {
    // Touch the session to refresh the cookie
    req.session.touch();
    
    // Log session activity (remove in production)
    console.log(`Session active for user: ${req.session.user.user_id}`);
  }
  next();
};