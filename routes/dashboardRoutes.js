import express from 'express';
const router = express.Router();
import { 
  collection, doc, getDoc, getDocs, query as firestoreQuery, where, 
  orderBy, limit, serverTimestamp 
} from 'firebase/firestore';

import { db } from '../config/firebase.js';

// Add authentication middleware
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/signin?error=Please sign in to access the dashboard');
  }
  next();
};

// Apply middleware to dashboard route
router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    // Get project count
    const projectsRef = collection(db, 'projects');
    const projectQuery = firestoreQuery(projectsRef, where('owner_id', '==', userId));
    const projectSnapshot = await getDocs(projectQuery);
    const projectCount = projectSnapshot.size;

    // Get application count
    const applicationsRef = collection(db, 'applications');
    const applicationQuery = firestoreQuery(applicationsRef, where('user_id', '==', userId));
    const applicationSnapshot = await getDocs(applicationQuery);
    const applicationCount = applicationSnapshot.size;

    // Initialize empty arrays for data that might fail due to missing indexes
    let recentProjects = [];
    let activities = [];
    let topProjects = [];
    let upcomingDeadlines = [];
    let teamMembers = []; // Add this to fix the undefined error
    let notifications = []; // Add this to avoid potential undefined errors

    try {
      // Get recent projects
      const recentProjectsQuery = firestoreQuery(projectsRef, 
        where('owner_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(5)
      );
      const recentProjectsSnapshot = await getDocs(recentProjectsQuery);
      recentProjects = recentProjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate()
      }));
    } catch (indexError) {
      console.warn("Index not ready for recent projects query:", indexError.message);
      // Continue execution with empty recentProjects array
    }

    try {
      // Get activities
      const activitiesRef = collection(db, 'activities');
      const activitiesQuery = firestoreQuery(activitiesRef,
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(10)
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);
      activities = activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate(),
        time_ago: doc.data().created_at ? 
          new Date(doc.data().created_at.toDate()).toLocaleDateString() : 
          'Recently'
      }));
    } catch (indexError) {
      console.warn("Index not ready for activities query:", indexError.message);
      // Continue execution with empty activities array
    }

    try {
      // Get top projects
      const topProjectsQuery = firestoreQuery(projectsRef,
        where('owner_id', '==', userId),
        orderBy('views', 'desc'),
        limit(5)
      );
      const topProjectsSnapshot = await getDocs(topProjectsQuery);
      topProjects = topProjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Add default values for properties used in the template
        name: doc.data().name || doc.data().title || 'Untitled Project',
        status: doc.data().status || 'On Track',
        progress: doc.data().progress || 0,
        deadline: doc.data().deadline || null
      }));
    } catch (indexError) {
      console.warn("Index not ready for top projects query:", indexError.message);
      // Continue execution with empty topProjects array
    }

    try {
      // Get upcoming deadlines
      const deadlinesRef = collection(db, 'deadlines');
      const now = new Date();
      const deadlinesQuery = firestoreQuery(deadlinesRef,
        where('user_id', '==', userId),
        where('due_date', '>=', now),
        orderBy('due_date', 'asc'),
        limit(5)
      );
      const deadlinesSnapshot = await getDocs(deadlinesQuery);
      upcomingDeadlines = deadlinesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        due_date: doc.data().due_date?.toDate(),
        date: doc.data().due_date?.toDate(),
        title: doc.data().title || 'Untitled Deadline',
        description: doc.data().description || '',
        isUrgent: doc.data().isUrgent || false,
        link: `/deadlines/${doc.id}` // Add a default link
      }));
    } catch (indexError) {
      console.warn("Index not ready for deadlines query:", indexError.message);
      // Continue execution with empty upcomingDeadlines array
    }

    // Try to get team members
    try {
      const teamMembersRef = collection(db, 'team_members');
      const teamMembersQuery = firestoreQuery(
        teamMembersRef, 
        where('team_id', 'in', ['team1', 'team2']), // Replace with actual team IDs
        limit(5)
      );
      const teamMembersSnapshot = await getDocs(teamMembersQuery);
      teamMembers = teamMembersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        name: doc.data().name || 'Team Member',
        role: doc.data().role || 'Member',
        profile_pic: doc.data().profile_pic || null,
        user_id: doc.data().user_id || doc.id
      }));
    } catch (error) {
      console.warn("Error getting team members:", error.message);
      // Keep default empty array
    }

    // Try to get notifications
    try {
      const notificationsRef = collection(db, 'notifications');
      const notificationsQuery = firestoreQuery(
        notificationsRef,
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(5)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      notifications = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate(),
        timeAgo: doc.data().created_at ? 
          new Date(doc.data().created_at.toDate()).toLocaleDateString() : 
          'Recently',
        isRead: doc.data().isRead || false,
        type: doc.data().type || 'general',
        icon: doc.data().icon || 'fas fa-bell text-primary',
        message: doc.data().message || doc.data().content || 'New notification',
        related_id: doc.data().related_id || ''
      }));
    } catch (error) {
      console.warn("Error getting notifications:", error.message);
      // Keep default empty array
    }

    // Create userStats object for the dashboard template
    const userStats = {
      activeProjects: projectCount,
      pendingApplications: applicationCount,
      completedProjects: 0, // You might want to query for completed projects
      totalTeams: 0, // You might want to query for teams count
      pendingTasks: 0 // Add this for the tasks section
    };

    // Get teams count if needed
    try {
      const teamMembersRef = collection(db, 'team_members');
      const teamMembersQuery = firestoreQuery(teamMembersRef, where('user_id', '==', userId));
      const teamMembersSnapshot = await getDocs(teamMembersQuery);
      userStats.totalTeams = teamMembersSnapshot.size;
    } catch (error) {
      console.warn("Error getting team count:", error.message);
      // Keep default value of 0
    }

    // Get pending tasks count
    try {
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = firestoreQuery(
        tasksRef, 
        where('assigned_to', '==', userId),
        where('status', '==', 'pending')
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      userStats.pendingTasks = tasksSnapshot.size;
    } catch (error) {
      console.warn("Error getting pending tasks count:", error.message);
      // Keep default value of 0
    }

    res.render("dashboard", {
      title: "Dashboard",
      currentPage: "dashboard",
      user: req.session.user,
      projectCount,
      applicationCount,
      recentProjects,
      activities,
      topProjects,
      upcomingDeadlines,
      teamMembers, // Add this to fix the undefined error
      notifications, // Add this to avoid potential undefined errors
      userStats,
      error: null,
      indexMessage: "Some dashboard components may be loading. Please create the required indexes by clicking the links in the server logs."
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).render("dashboard", {
      title: "Dashboard",
      currentPage: "dashboard",
      user: req.session.user || {}, // Provide a default empty user object
      projectCount: 0,
      applicationCount: 0,
      recentProjects: [],
      activities: [],
      topProjects: [],
      upcomingDeadlines: [],
      teamMembers: [], // Add this to fix the undefined error
      notifications: [], // Add this to avoid potential undefined errors
      userStats: {
        activeProjects: 0,
        pendingApplications: 0,
        completedProjects: 0,
        totalTeams: 0,
        pendingTasks: 0 // Add this for the tasks section
      },
      error: "An error occurred while loading the dashboard"
    });
  }
});

export default router;