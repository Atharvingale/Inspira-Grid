import express from 'express';
const router = express.Router();
import { 
  collection, getDocs, query, where, orderBy, 
  limit, startAfter, getDoc, doc 
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/signin");
};

// Global search
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { q, type, page = 1 } = req.query;
    const pageSize = 10;
    const startAt = (page - 1) * pageSize;
    
    let results = {
      projects: [],
      teams: [],
      users: []
    };
    
    if (!type || type === 'projects') {
      const projectsRef = collection(db, 'projects');
      const projectsQuery = query(
        projectsRef,
        where('title', '>=', q),
        where('title', '<=', q + '\uf8ff'),
        orderBy('title'),
        limit(pageSize)
      );
      
      const projectsSnapshot = await getDocs(projectsQuery);
      results.projects = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    if (!type || type === 'teams') {
      const teamsRef = collection(db, 'teams');
      const teamsQuery = query(
        teamsRef,
        where('name', '>=', q),
        where('name', '<=', q + '\uf8ff'),
        orderBy('name'),
        limit(pageSize)
      );
      
      const teamsSnapshot = await getDocs(teamsQuery);
      results.teams = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    if (!type || type === 'users') {
      const usersRef = collection(db, 'users');
      const usersQuery = query(
        usersRef,
        where('name', '>=', q),
        where('name', '<=', q + '\uf8ff'),
        orderBy('name'),
        limit(pageSize)
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      results.users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    res.json(results);
  } catch (error) {
    console.error("Error performing search:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// Project-specific search
router.get("/projects", isAuthenticated, async (req, res) => {
  try {
    const { q, category, status, page = 1 } = req.query;
    const pageSize = 10;
    
    let projectsQuery = query(collection(db, 'projects'));
    
    if (q) {
      projectsQuery = query(
        projectsQuery,
        where('title', '>=', q),
        where('title', '<=', q + '\uf8ff'),
        orderBy('title')
      );
    }
    
    if (category) {
      projectsQuery = query(projectsQuery, where('category', '==', category));
    }
    
    if (status) {
      projectsQuery = query(projectsQuery, where('status', '==', status));
    }
    
    projectsQuery = query(projectsQuery, limit(pageSize));
    
    const projectsSnapshot = await getDocs(projectsQuery);
    const projects = projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(projects);
  } catch (error) {
    console.error("Error searching projects:", error);
    res.status(500).json({ error: "Project search failed" });
  }
});

// Team-specific search
router.get("/teams", isAuthenticated, async (req, res) => {
  try {
    const { q, category, page = 1 } = req.query;
    const pageSize = 10;
    
    let teamsQuery = query(collection(db, 'teams'));
    
    if (q) {
      teamsQuery = query(
        teamsQuery,
        where('name', '>=', q),
        where('name', '<=', q + '\uf8ff'),
        orderBy('name')
      );
    }
    
    if (category) {
      teamsQuery = query(teamsQuery, where('category', '==', category));
    }
    
    teamsQuery = query(teamsQuery, limit(pageSize));
    
    const teamsSnapshot = await getDocs(teamsQuery);
    const teams = teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(teams);
  } catch (error) {
    console.error("Error searching teams:", error);
    res.status(500).json({ error: "Team search failed" });
  }
});

// User-specific search
router.get("/users", isAuthenticated, async (req, res) => {
  try {
    const { q, skills, page = 1 } = req.query;
    const pageSize = 10;
    
    let usersQuery = query(collection(db, 'users'));
    
    if (q) {
      usersQuery = query(
        usersQuery,
        where('name', '>=', q),
        where('name', '<=', q + '\uf8ff'),
        orderBy('name')
      );
    }
    
    if (skills) {
      const skillsArray = skills.split(',');
      usersQuery = query(usersQuery, where('skills', 'array-contains-any', skillsArray));
    }
    
    usersQuery = query(usersQuery, limit(pageSize));
    
    const usersSnapshot = await getDocs(usersQuery);
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "User search failed" });
  }
});

export default router; 