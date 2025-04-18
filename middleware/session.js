// Session maintenance middleware
export const sessionMaintenance = (req, res, next) => {
  // If the user is logged in, touch the session to keep it alive
  // But only do this if the session is older than 5 minutes to reduce database operations
  if (req.session && req.session.user) {
    const now = new Date();
    const lastTouch = req.session.lastTouch || 0;
    
    // Only touch the session if it hasn't been touched in the last 5 minutes
    if (now - lastTouch > 300000) { // 300000ms = 5 minutes
      req.session.lastTouch = now.getTime();
      // Use a non-blocking approach to touch the session
      process.nextTick(() => {
        try {
          req.session.touch();
        } catch (err) {
          console.error('Error touching session:', err);
        }
      });
    }
  }
  next();
};

// Add a function to handle timeouts in serverless environments
export const timeoutHandler = (req, res, next) => {
  // Set a timeout to ensure the function completes within the serverless limit
  const timeout = setTimeout(() => {
    console.warn('Request is taking too long, sending early response');
    if (!res.headersSent) {
      res.status(200).send('Processing your request...');
    }
  }, 9000); // 9 seconds (Vercel has a 10s limit)
  
  // Store the original end method
  const originalEnd = res.end;
  
  // Override the end method
  res.end = function(...args) {
    // Clear the timeout when the response ends naturally
    clearTimeout(timeout);
    // Call the original end method
    return originalEnd.apply(this, args);
  };
  
  next();
};