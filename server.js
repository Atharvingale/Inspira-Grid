import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

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

// Session configuration with MongoDB store
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions', // Name of the collection to store sessions
    ttl: 24 * 60 * 60, // Session TTL (1 day in seconds)
    autoRemove: 'native' // Use MongoDB's TTL index
  }),
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
  try {
    res.status(404).render("error", {
      user: req.session.user || null,
      error: "Page not found",
      title: "404 Not Found"
    });
  } catch (err) {
    console.error('Error rendering 404 page:', err);
    res.status(404).send('Page not found. Please try again later.');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  try {
    res.status(500).render("error", {
      user: req.session.user || null,
      error: "An unexpected error occurred. Please try again later.",
      title: "Server Error"
    });
  } catch (renderErr) {
    console.error('Error rendering error page:', renderErr);
    res.status(500).send('An unexpected error occurred. Please try again later.');
  }
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

// Add this middleware after your session middleware but before your routes
app.use((req, res, next) => {
  // If session exists, proceed normally
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    return next();
  }
  
  // If no session but backup cookie exists, restore minimal session
  const userBasic = req.cookies && req.cookies.user_basic;
  if (userBasic) {
    try {
      const userData = JSON.parse(userBasic);
      req.session.user = userData;
      res.locals.user = userData;
      console.log("Session restored from backup cookie for user:", userData.id);
    } catch (e) {
      console.error("Error parsing backup cookie:", e);
    }
  }
  
  next();
});

// Add this before your session middleware
app.use(cookieParser());

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.success_msg = req.session.success_msg;
  res.locals.error_msg = req.session.error_msg;
  res.locals.user = req.session.user;  // This makes user available to all views
  delete req.session.success_msg;
  delete req.session.error_msg;
  next();
});