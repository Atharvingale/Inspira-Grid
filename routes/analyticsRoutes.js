import express from 'express';
const router = express.Router();
import { 
  collection, query, where, getDocs, 
  orderBy, limit, doc, getDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/signin");
};

// Get analytics dashboard
router.get("/", isAuthenticated, async (req, res) => {
  try {
    // Get user's projects
    const projectsRef = collection(db, 'projects');
    const projectsQuery = query(
      projectsRef,
      where('owner_id', '==', req.session.user.uid),
      orderBy('created_at', 'desc')
    );
    const projectsSnapshot = await getDocs(projectsQuery);
    
    // Get user's teams
    const teamsRef = collection(db, 'teams');
    const teamsQuery = query(
      teamsRef,
      where('members', 'array-contains', req.session.user.uid),
      orderBy('created_at', 'desc')
    );
    const teamsSnapshot = await getDocs(teamsQuery);
    
    // Get user's applications
    const applicationsRef = collection(db, 'applications');
    const applicationsQuery = query(
      applicationsRef,
      where('applicant_id', '==', req.session.user.uid),
      orderBy('created_at', 'desc')
    );
    const applicationsSnapshot = await getDocs(applicationsQuery);
    
    // Calculate statistics
    const stats = {
      totalProjects: projectsSnapshot.size,
      activeProjects: projectsSnapshot.docs.filter(doc => doc.data().status === 'Open').length,
      totalTeams: teamsSnapshot.size,
      totalApplications: applicationsSnapshot.size,
      acceptedApplications: applicationsSnapshot.docs.filter(doc => doc.data().status === 'Accepted').length
    };
    
    res.render("analytics", {
      title: "Analytics Dashboard",
      user: req.session.user,
      stats,
      currentPage: 'analytics'
    });
  } catch (error) {
    console.error("Error loading analytics:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load analytics. Please try again later.",
      title: "Error"
    });
  }
});

// Get project-specific analytics
router.get("/projects", isAuthenticated, async (req, res) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }
    
    // Get project details
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const projectData = projectSnap.data();
    
    // Get project applications
    const applicationsRef = collection(db, 'applications');
    const applicationsQuery = query(
      applicationsRef,
      where('project_id', '==', projectId),
      orderBy('created_at', 'desc')
    );
    const applicationsSnapshot = await getDocs(applicationsQuery);
    
    // Get project views
    const viewsRef = collection(db, 'project_views');
    const viewsQuery = query(
      viewsRef,
      where('project_id', '==', projectId),
      orderBy('timestamp', 'desc')
    );
    const viewsSnapshot = await getDocs(viewsQuery);
    
    const analytics = {
      project: projectData,
      totalApplications: applicationsSnapshot.size,
      applicationsByStatus: {
        pending: applicationsSnapshot.docs.filter(doc => doc.data().status === 'Pending').length,
        accepted: applicationsSnapshot.docs.filter(doc => doc.data().status === 'Accepted').length,
        rejected: applicationsSnapshot.docs.filter(doc => doc.data().status === 'Rejected').length
      },
      totalViews: viewsSnapshot.size,
      viewsByDate: viewsSnapshot.docs.reduce((acc, doc) => {
        const date = doc.data().timestamp.toDate().toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {})
    };
    
    res.json(analytics);
  } catch (error) {
    console.error("Error getting project analytics:", error);
    res.status(500).json({ error: "Failed to get project analytics" });
  }
});

// Get team-specific analytics
router.get("/teams", isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.query;
    
    if (!teamId) {
      return res.status(400).json({ error: "Team ID is required" });
    }
    
    // Get team details
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return res.status(404).json({ error: "Team not found" });
    }
    
    const teamData = teamSnap.data();
    
    // Get team projects
    const projectsRef = collection(db, 'projects');
    const projectsQuery = query(
      projectsRef,
      where('team_id', '==', teamId),
      orderBy('created_at', 'desc')
    );
    const projectsSnapshot = await getDocs(projectsQuery);
    
    // Get team members
    const membersRef = collection(db, 'users');
    const members = await Promise.all(
      teamData.members.map(async (memberId) => {
        const memberRef = doc(membersRef, memberId);
        const memberSnap = await getDoc(memberRef);
        return memberSnap.exists() ? memberSnap.data() : null;
      })
    );
    
    const analytics = {
      team: teamData,
      totalProjects: projectsSnapshot.size,
      projectsByStatus: {
        open: projectsSnapshot.docs.filter(doc => doc.data().status === 'Open').length,
        inProgress: projectsSnapshot.docs.filter(doc => doc.data().status === 'In Progress').length,
        completed: projectsSnapshot.docs.filter(doc => doc.data().status === 'Completed').length
      },
      totalMembers: members.length,
      memberRoles: members.reduce((acc, member) => {
        if (member) {
          acc[member.role] = (acc[member.role] || 0) + 1;
        }
        return acc;
      }, {})
    };
    
    res.json(analytics);
  } catch (error) {
    console.error("Error getting team analytics:", error);
    res.status(500).json({ error: "Failed to get team analytics" });
  }
});

export default router; 