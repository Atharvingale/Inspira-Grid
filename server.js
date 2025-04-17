import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import database configuration
import db from './config/database.js';

// Import routes - update to import individual route files
import indexRoutes from './routes/index.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Import middleware
import { isAuthenticated, checkProfileComplete } from './middleware/auth.js';

// Add this import that was mentioned at the bottom of the file
import initDatabase from './database/init.js';

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make the database available to all routes
app.locals.db = db;

// Session configuration with more secure settings
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // Prevents client-side JS from reading the cookie
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Make user data available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Use routes
app.use(authRoutes); // Auth routes should be applied before profile completion check
app.use(indexRoutes); // Add the index routes

// Apply profile completion check to protected routes
app.use('/dashboard', isAuthenticated, checkProfileComplete);
app.use('/projects', isAuthenticated, checkProfileComplete);
app.use('/teams', isAuthenticated, checkProfileComplete);
app.use('/resources', isAuthenticated, checkProfileComplete);
app.use('/messages', isAuthenticated, checkProfileComplete);

// Profile routes need special handling
app.use('/profile', (req, res, next) => {
  // Allow access to complete profile page if user is authenticated
  if (req.path === '/complete' && req.session.user) {
    return next();
  }
  // For all other profile routes, check both authentication and profile completion
  isAuthenticated(req, res, (err) => {
    if (err) return next(err);
    checkProfileComplete(req, res, next);
  });
});

// Apply routes
app.use(dashboardRoutes);
app.use(profileRoutes);
app.use(projectRoutes);
app.use(applicationRoutes);
app.use(teamRoutes);
app.use(resourceRoutes);
app.use(notificationRoutes);

// Home route
app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/dashboard");
  } else {
    res.render("index", { user: null });
  }
});

// 404 route
app.use((req, res) => {
  res.status(404).render("error", {
    user: req.session.user || null,
    error: "Page not found",
    title: "404 Not Found"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render("error", {
    user: req.session.user || null,
    error: "An unexpected error occurred. Please try again later.",
    title: "Server Error"
  });
});

// Initialize database tables
initDatabase().then(() => {
  // Start the server
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  // Start the server anyway
  app.listen(port, () => {
    console.log(`Server running on port ${port} (database initialization failed)`);
  });
});