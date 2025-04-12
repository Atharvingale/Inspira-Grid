import express from 'express';
const router = express.Router();

// Import database configuration
import db from '../config/database.js';

// Import middleware
import { isAuthenticated, checkProfileComplete } from '../middleware/auth.js';

// Dashboard route
router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    // Get user data
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [req.session.user.user_id]
    );
    
    if (userResult.rows.length === 0) {
      req.session.destroy();
      return res.redirect("/signin?error=User not found");
    }
    
    const user = userResult.rows[0];

    // Get user stats with error handling for missing tables
    const userStats = {
      totalProjects: 0,
      totalApplications: 0,
      // Add other stats as needed
    };

    try {
      // Get project count
      const projectCountResult = await db.query(
        "SELECT COUNT(*) FROM projects WHERE owner_id = $1",
        [req.session.user.user_id]
      );
      userStats.totalProjects = parseInt(projectCountResult.rows[0].count) || 0;
    } catch (error) {
      console.error("Error getting project count:", error.message);
      // Continue execution even if this query fails
    }

    try {
      // Get application count - handle case where table might not exist
      const applicationCountResult = await db.query(
        `SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_name = 'project_applications'`
      );
      
      if (parseInt(applicationCountResult.rows[0].count) > 0) {
        const applicationsResult = await db.query(
          "SELECT COUNT(*) FROM project_applications WHERE user_id = $1",
          [req.session.user.user_id]
        );
        userStats.totalApplications = parseInt(applicationsResult.rows[0].count) || 0;
      }
    } catch (error) {
      console.error("Error getting application count:", error.message);
      // Continue execution even if this query fails
    }

    // Get recent projects with error handling
    let recentProjects = [];
    try {
      const recentProjectsResult = await db.query(
        "SELECT * FROM projects ORDER BY created_at DESC LIMIT 5"
      );
      recentProjects = recentProjectsResult.rows;
    } catch (error) {
      console.error("Error getting recent projects:", error.message);
      // Continue execution even if this query fails
    }

    // Get recent activities (missing in original code)
    let activities = [];
    try {
      // Try to get project updates as activities
      const projectUpdatesResult = await db.query(
        `SELECT pu.*, p.title as project_title, 'project_update' as activity_type
         FROM project_updates pu
         JOIN projects p ON pu.project_id = p.project_id
         WHERE p.owner_id = $1 OR pu.user_id = $1
         ORDER BY pu.created_at DESC
         LIMIT 10`,
        [req.session.user.user_id]
      );
      
      // Format the activities
      activities = projectUpdatesResult.rows.map(update => ({
        ...update,
        created_at_formatted: new Date(update.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time_ago: getTimeAgo(update.created_at)
      }));
    } catch (error) {
      console.error("Error getting activities:", error.message);
      // Continue with empty activities array
    }

    // Get top projects with progress information - with safer implementation
    let topProjects = [];
    try {
      // First check if project_tasks table exists
      const tableCheckResult = await db.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'project_tasks'
        ) as exists`
      );
      
      const projectTasksExists = tableCheckResult.rows[0].exists;
      
      if (projectTasksExists) {
        // If project_tasks table exists, use it for progress calculation
        const topProjectsResult = await db.query(
          `SELECT p.*, 
            COALESCE(
              (SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = p.project_id AND pt.status = 'completed')::float / 
              NULLIF((SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = p.project_id), 0) * 100, 
              0
            ) as progress,
            CASE 
              WHEN p.deadline < NOW() THEN 'Delayed'
              WHEN p.deadline < NOW() + INTERVAL '7 days' THEN 'At Risk'
              ELSE 'On Track'
            END as status
          FROM projects p
          WHERE p.owner_id = $1
          ORDER BY p.deadline ASC NULLS LAST
          LIMIT 3`,
          [req.session.user.user_id]
        );
        topProjects = topProjectsResult.rows;
      } else {
        // If project_tasks table doesn't exist, get projects without progress calculation
        const topProjectsResult = await db.query(
          `SELECT p.*, 
            0 as progress,
            CASE 
              WHEN p.deadline < NOW() THEN 'Delayed'
              WHEN p.deadline < NOW() + INTERVAL '7 days' THEN 'At Risk'
              ELSE 'On Track'
            END as status
          FROM projects p
          WHERE p.owner_id = $1
          ORDER BY p.deadline ASC NULLS LAST
          LIMIT 3`,
          [req.session.user.user_id]
        );
        topProjects = topProjectsResult.rows;
      }
      
      // Format the projects for the template
      topProjects = topProjects.map(project => ({
        ...project,
        progress: Math.round(parseFloat(project.progress) || 0),
        name: project.title // Ensure name property exists for the template
      }));
    } catch (error) {
      console.error("Error getting top projects:", error.message);
      // Continue execution even if this query fails
    }

    // Render dashboard with data
    res.render("dashboard", {
      user: req.session.user,
      userDetails: user,
      userStats: {
        ...userStats,
        activeProjects: userStats.totalProjects || 0,
        teamCount: 0, // You can update this when you implement teams
        pendingTasks: 0 // You can update this when you implement tasks
      },
      recentProjects,
      topProjects, // Add the topProjects array here
      activities,
      upcomingDeadlines: [], // Add empty array for upcomingDeadlines
      teamMembers: [], // Add empty array for teamMembers
      notifications: [], // Add empty array for notifications
      currentPage: 'dashboard',
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error in dashboard route:", error);
    res.render("error", {
      user: req.session.user,
      error: "An error occurred while loading the dashboard",
      title: "Error"
    });
  }
});

// Helper function to format time ago
function getTimeAgo(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval === 1 ? '1 year ago' : `${interval} years ago`;
  }
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval === 1 ? '1 month ago' : `${interval} months ago`;
  }
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval === 1 ? '1 day ago' : `${interval} days ago`;
  }
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
  }
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
  }
  
  return 'Just now';
}

export default router;