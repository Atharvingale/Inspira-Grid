import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import { db } from './config/firebase.js';
import { collection, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

// Load environment variables
dotenv.config();

// Import database configuration
import dbConfig from './config/database.js';

// Create a custom session store using Firebase
class FirestoreSessionStore {
  constructor() {
    this.sessions = collection(db, 'sessions');
  }

  async get(sid, callback) {
    try {
      const sessionDoc = await getDoc(doc(this.sessions, sid));
      if (!sessionDoc.exists()) {
        return callback(null, null);
      }
      const sessionData = sessionDoc.data();
      if (sessionData.expires < Date.now()) {
        this.destroy(sid);
        return callback(null, null);
      }
      return callback(null, JSON.parse(sessionData.session));
    } catch (error) {
      return callback(error);
    }
  }

  async set(sid, session, callback) {
    try {
      const sessionData = {
        session: JSON.stringify(session),
        expires: session.cookie.expires ? new Date(session.cookie.expires).getTime() : Date.now() + (7 * 24 * 60 * 60 * 1000)
      };
      await setDoc(doc(this.sessions, sid), sessionData);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  async destroy(sid, callback = () => {}) {
    try {
      await deleteDoc(doc(this.sessions, sid));
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
}

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make the database available to all routes
app.locals.db = dbConfig;

// Session configuration with Firestore session store
app.use(session({
  store: new FirestoreSessionStore(),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  }
}));

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
