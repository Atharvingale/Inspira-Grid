// Session maintenance middleware
export const sessionMaintenance = (req, res, next) => {
  // If the user is logged in, touch the session to keep it alive
  if (req.session && req.session.user) {
    req.session.touch();
  }
  next();
};