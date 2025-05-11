import express from 'express';
const router = express.Router();
import { 
  collection, query, where, getDocs, 
  orderBy, limit, doc, getDoc, addDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

// Get projects data
router.get("/projects", isAuthenticated, async (req, res) => {
  try {
    const { status, category, limit: limitCount = 10 } = req.query;
    
    let projectsQuery = query(collection(db, 'projects'));
    
    if (status) {
      projectsQuery = query(projectsQuery, where('status', '==', status));
    }
    
    if (category) {
      projectsQuery = query(projectsQuery, where('category', '==', category));
    }
    
    projectsQuery = query(projectsQuery, orderBy('created_at', 'desc'), limit(parseInt(limitCount)));
    
    const projectsSnapshot = await getDocs(projectsQuery);
    const projects = projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(projects);
  } catch (error) {
    console.error("Error getting projects:", error);
    res.status(500).json({ error: "Failed to get projects" });
  }
});

// Get teams data
router.get("/teams", isAuthenticated, async (req, res) => {
  try {
    const { category, limit: limitCount = 10 } = req.query;
    
    let teamsQuery = query(collection(db, 'teams'));
    
    if (category) {
      teamsQuery = query(teamsQuery, where('category', '==', category));
    }
    
    teamsQuery = query(teamsQuery, orderBy('created_at', 'desc'), limit(parseInt(limitCount)));
    
    const teamsSnapshot = await getDocs(teamsQuery);
    const teams = teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(teams);
  } catch (error) {
    console.error("Error getting teams:", error);
    res.status(500).json({ error: "Failed to get teams" });
  }
});

// Get users data
router.get("/users", isAuthenticated, async (req, res) => {
  try {
    const { skills, limit: limitCount = 10 } = req.query;
    
    let usersQuery = query(collection(db, 'users'));
    
    if (skills) {
      const skillsArray = skills.split(',');
      usersQuery = query(usersQuery, where('skills', 'array-contains-any', skillsArray));
    }
    
    usersQuery = query(usersQuery, limit(parseInt(limitCount)));
    
    const usersSnapshot = await getDocs(usersQuery);
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(users);
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

// Handle notifications
router.post("/notifications", isAuthenticated, async (req, res) => {
  try {
    const { type, message, recipientId } = req.body;
    
    if (!type || !message || !recipientId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const notificationData = {
      type,
      message,
      sender_id: req.session.user.uid,
      recipient_id: recipientId,
      read: false,
      created_at: new Date()
    };
    
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, notificationData);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

export default router; 