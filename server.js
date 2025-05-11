import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { db } from './config/firebase.js';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';

// Load environment variables
dotenv.config();


import FirebaseSessionStore from './config/firebaseSessionStore.js';

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
import searchRoutes from './routes/searchRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

// Import middleware
import { isAuthenticated, checkProfileComplete } from './middleware/auth.js';

// Add this import that was mentioned at the bottom of the file
import initDatabase from './database/init.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? 'https://inspiragrid.com' : 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make the database available to all routes
app.locals.db = db;

// Session configuration with custom Firebase store
app.use(session({
  store: new FirebaseSessionStore({
    db: db,
    collection: 'sessions',
    ttl: 86400 // 24 hours in seconds
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
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

// Socket.io middleware
io.use((socket, next) => {
    const session = socket.handshake.auth.session;
    if (session && session.user) {
        socket.user = session.user;
        next();
    } else {
        next(new Error('Authentication error'));
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.user.user_id);
    
    // Join user's personal room
    socket.join(socket.user.user_id);
    
    // Handle sending messages
    socket.on('send_message', async (data) => {
        try {
            console.log('Received message:', data);
            
            // Get recipient's details
            const recipientDoc = await getDoc(doc(db, 'users', data.recipientId));
            if (!recipientDoc.exists()) {
                throw new Error('Recipient not found');
            }
            
            const recipientData = recipientDoc.data();
            
            // Create message document
            const messageData = {
                sender: socket.user.user_id,
                recipient: data.recipientId,
                content: data.content,
                read: false,
                participants: [socket.user.user_id, data.recipientId],
                createdAt: serverTimestamp()
            };
            
            const messageRef = await addDoc(collection(db, 'messages'), messageData);
            console.log('Message saved with ID:', messageRef.id);
            
            // Get the complete message data
            const messageDoc = await getDoc(messageRef);
            const completeMessage = {
                id: messageRef.id,
                ...messageDoc.data(),
                sender: {
                    user_id: socket.user.user_id,
                    username: socket.user.name
                },
                recipient: {
                    user_id: data.recipientId,
                    username: recipientData.name
                },
                tempId: data.tempId
            };
            
            // Emit to sender
            socket.emit('new_message', completeMessage);
            
            // Emit to recipient
            socket.to(data.recipientId).emit('new_message', completeMessage);
            
            // Update conversation list for both users
            const conversationData = {
                user: {
                    user_id: data.recipientId,
                    username: recipientData.name,
                    profile_pic: recipientData.profile_pic
                },
                lastMessage: {
                    content: data.content,
                    createdAt: messageData.createdAt,
                    read: false
                }
            };
            
            // Emit conversation update to sender
            socket.emit('conversation_update', conversationData);
            
            // Emit conversation update to recipient
            socket.to(data.recipientId).emit('conversation_update', {
                user: {
                    user_id: socket.user.user_id,
                    username: socket.user.name,
                    profile_pic: socket.user.profile_pic
                },
                lastMessage: {
                    content: data.content,
                    createdAt: messageData.createdAt,
                    read: false
                }
            });
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: error.message });
        }
    });
    
    // Handle typing status
    socket.on('typing', (data) => {
        socket.to(data.recipientId).emit('user_typing', {
            userId: socket.user.user_id,
            username: socket.user.name
        });
    });
    
    // Handle message read status
    socket.on('mark_read', async (data) => {
        try {
            const messageRef = doc(db, 'messages', data.messageId);
            await updateDoc(messageRef, { read: true });
            
            socket.to(data.senderId).emit('message_read', {
                messageId: data.messageId
            });
        } catch (error) {
            console.error('Error marking message as read:', error);
            socket.emit('error', { message: error.message });
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user.user_id);
    });
});

// Use routes
app.use(authRoutes); // Auth routes should be applied before profile completion check
app.use(indexRoutes); // Add the index routes

// Apply profile completion check to protected routes
app.use('/dashboard', isAuthenticated, checkProfileComplete);
app.use('/projects', isAuthenticated, checkProfileComplete);
app.use('/teams', isAuthenticated, checkProfileComplete);
app.use('/resources', isAuthenticated, checkProfileComplete);
app.use('/analytics', isAuthenticated, checkProfileComplete);
app.use('/help', isAuthenticated, checkProfileComplete);

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
app.use(searchRoutes);
app.use(analyticsRoutes);
app.use('/api', apiRoutes);
app.use(helpRoutes);
app.use(messageRoutes);

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

// Enhanced error handling middleware for Vercel
app.use((err, req, res, next) => {
  console.error('Server error details:', err);
  try {
    res.status(500).render("error", {
      user: req.session.user || null,
      error: process.env.NODE_ENV === 'production' ? 
        "An unexpected error occurred. Please try again later." : 
        err.message || "Unknown error",
      title: "Server Error"
    });
  } catch (renderErr) {
    console.error('Error rendering error page:', renderErr);
    res.status(500).send('An unexpected error occurred. Please try again later.');
  }
});

// Initialize database tables
initDatabase().then(() => {
  // Only start the server in development mode
  if (process.env.NODE_ENV !== 'production') {
    httpServer.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
}).catch(err => {
  console.error('Failed to initialize database:', err);
  // Only start the server in development mode
  if (process.env.NODE_ENV !== 'production') {
    httpServer.listen(port, () => {
      console.log(`Server running on port ${port} (database initialization failed)`);
    });
  }
});

// Add this for Vercel serverless deployment
export default app;
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

// Add cookieParser before session middleware
app.use(cookieParser());

// Session configuration with custom Firebase store
app.use(session({
  store: new FirebaseSessionStore({
    db: db,
    collection: 'sessions',
    ttl: 86400 // 24 hours in seconds
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.success_msg = req.session.success_msg;
  res.locals.error_msg = req.session.error_msg;
  res.locals.user = req.session.user;  // This makes user available to all views
  delete req.session.success_msg;
  delete req.session.error_msg;
  next();
});