import express from 'express';
const router = express.Router();
import { 
  collection, doc, getDoc, getDocs, query as firestoreQuery, where, 
  orderBy, limit, addDoc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

import { db } from '../config/firebase.js';

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/signin");
};

// Home route
router.get("/", async (req, res) => {
  try {
    // If user is logged in, redirect to dashboard
    if (req.session.user) {
      return res.redirect("/dashboard");
    }
    
    // Get featured projects
    const projectsRef = collection(db, 'projects');
    const featuredQuery = firestoreQuery(
      projectsRef,
      where('status', '==', 'Open'),
      orderBy('created_at', 'desc'),
      limit(6)
    );
    const featuredSnapshot = await getDocs(featuredQuery);
    
    const featuredProjects = [];
    for (const projectDoc of featuredSnapshot.docs) {
      const projectData = projectDoc.data();
      
      // Get project owner details
      const ownerRef = doc(db, 'users', projectData.owner_id);
      const ownerSnap = await getDoc(ownerRef);
      
      featuredProjects.push({
        project_id: projectDoc.id,
        ...projectData,
        owner_name: ownerSnap.exists() ? ownerSnap.data().name : 'Unknown',
        owner_pic: ownerSnap.exists() ? ownerSnap.data().profile_pic : '/images/user.jpg',
        created_at_formatted: projectData.created_at ? 
          new Date(projectData.created_at.toDate()).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : 'recently'
      });
    }
    
    res.render("index", {
      title: "Inspira Grid - Collaborate on Creative Projects",
      user: req.session.user || null,
      featuredProjects,
      currentPage: 'home'
    });
  } catch (error) {
    console.error("Error loading home page:", error);
    res.status(500).render("error", {
      user: req.session.user || null,
      error: "Failed to load home page. Please try again later.",
      title: "Error",
      currentPage: 'home'
    });
  }
});

// Remove the dashboard route from here since it's already in dashboardRoutes.js

export default router;