import express from 'express';
const router = express.Router();
import pg from 'pg';

import db from '../config/database.js';

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect("/signin");
};

// Projects route
// In your projects route handler, make sure to pass the user object:

// Remove this comment line that was added as a suggestion
router.get("/projects", isAuthenticated, async (req, res) => {
  try {
    // There's an issue here - you're using req.session.user_id but it should be req.session.user.user_id
    const userId = req.session.user.user_id;

    // Get complete user information first
    const userResult = await db.query(
      "SELECT user_id, name, email, profile_pic FROM users WHERE user_id = $1",
      [userId]
    );
    const userInfo = userResult.rows[0];
    
    // Fetch different types of projects
    const myProjects = await db.query(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM team_members tm 
         JOIN teams t ON tm.team_id = t.team_id 
         WHERE t.project_id = p.project_id) as team_size
       FROM projects p 
       WHERE owner_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    const teamProjects = await db.query(
      `SELECT p.*, t.team_name as team_name,
        (SELECT COUNT(*) FROM team_members tm2 
         WHERE tm2.team_id = t.team_id) as team_size
       FROM projects p 
       JOIN teams t ON p.project_id = t.team_id 
       JOIN team_members tm ON t.team_id = tm.team_id 
       WHERE tm.user_id = $1 AND p.owner_id != $1`,
      [userId]
    );
    
    // Simplified discover projects query to ensure it returns results
    const discoverProjects = await db.query(
      `SELECT DISTINCT p.*, 
        u.name as creator_name, 
        u.profile_pic as creator_pic,
        COALESCE((SELECT COUNT(*) FROM team_members tm 
         JOIN teams t ON tm.team_id = t.team_id 
         WHERE t.project_id = p.project_id), 0) as team_size,
        COALESCE((SELECT COUNT(*) FROM project_applications pa 
         WHERE pa.project_id = p.project_id AND pa.status = 'pending'), 0) as pending_applications
       FROM projects p 
       JOIN users u ON p.owner_id = u.user_id 
       WHERE p.owner_id != $1 
       ORDER BY p.created_at DESC 
       LIMIT 30`,
      [userId]
    );
    
    const applications = await db.query(
      `SELECT a.*, p.title as project_name, 
        p.category as project_category,
        p.description as project_description,
        u.name as project_owner_name,
        u.profile_pic as project_owner_pic
       FROM project_applications a 
       JOIN projects p ON a.project_id = p.project_id 
       JOIN users u ON p.owner_id = u.user_id
       WHERE a.user_id = $1 
       ORDER BY a.created_at DESC`,
      [userId]
    );

    // Enhanced process projects function with better error handling
    const processProjects = (projects) => {
      return projects.map(project => {
        try {
          // Handle required_skills
            // Handle required_skills
            let requiredSkills = [];
            if (project.required_skills) {
              if (typeof project.required_skills === 'string') {
                try {
                  requiredSkills = JSON.parse(project.required_skills);
                } catch (e) {
                  console.error(`Error parsing required_skills for project ${project.project_id}:`, e);
                  requiredSkills = project.required_skills.split(',').map(s => s.trim());
                }
              } else if (Array.isArray(project.required_skills)) {
                requiredSkills = project.required_skills;
              }
            }
          
          // Handle milestones
          let milestones = [];
          if (project.milestones) {
            if (typeof project.milestones === 'string') {
              try {
                milestones = JSON.parse(project.milestones);
              } catch (e) {
                console.error(`Error parsing milestones for project ${project.project_id}:`, e);
                milestones = [];
              }
            } else if (Array.isArray(project.milestones)) {
              milestones = project.milestones;
            }
          }
          
          // Handle milestone_status
          let milestoneStatus = [];
          if (project.milestone_status) {
            if (typeof project.milestone_status === 'string') {
              try {
                milestoneStatus = JSON.parse(project.milestone_status);
              } catch (e) {
                console.error(`Error parsing milestone_status for project ${project.project_id}:`, e);
                milestoneStatus = [];
              }
            } else if (Array.isArray(project.milestone_status)) {
              milestoneStatus = project.milestone_status;
            }
          }
          
          return {
            ...project,
            required_skills: requiredSkills,
            milestones: milestones,
            milestone_status: milestoneStatus,
            created_at_formatted: new Date(project.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          };
        } catch (error) {
          console.error(`Error processing project ${project.project_id}:`, error);
          return {
            ...project,
            required_skills: [],
            milestones: [],
            milestone_status: [],
            created_at_formatted: new Date(project.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          };
        }
      });
    };

    // Process all project types
    const processedMyProjects = processProjects(myProjects.rows);
    const processedTeamProjects = processProjects(teamProjects.rows);
    const processedDiscoverProjects = processProjects(discoverProjects.rows);

    // Log counts to help with debugging
    console.log(`Found ${processedMyProjects.length} my projects`);
    console.log(`Found ${processedTeamProjects.length} team projects`);
    console.log(`Found ${processedDiscoverProjects.length} discover projects`);

    // Near the end of the route handler where you render the template
    res.render("projects", {
      title: "Projects",
      currentPage: "projects",
      user: req.session.user, // Change this to use the session user directly
      myProjects: processedMyProjects,
      teamProjects: processedTeamProjects,
      discoverProjects: processedDiscoverProjects,
      applications: applications.rows.map(app => ({
        ...app,
        created_at_formatted: new Date(app.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      })),
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load projects. Please try again later.",
      title: "Error",
      currentPage: 'projects'
    });
  }
});

// Add a route for the project creation form
router.get("/projects/new", isAuthenticated, (req, res) => {
  res.render("project-form", {
    user: req.session.user,
    isNew: true,
    project: {},
    error: null,
    success: null,
    title: "Create Project",
    currentPage: 'projects'
  });
});

// Project Details Route
router.get("/projects/:id", async (req, res) => {
  if (!req.session.user) return res.redirect("/signin");

  try {
    const projectId = req.params.id;
    
    // Fix this line to use req.session.user.user_id
    const userId = req.session.user.user_id;

    // Get project details
    const projectResult = await db.query(
      "SELECT p.*, u.name as owner_name, u.profile_pic as owner_pic FROM projects p " +
      "JOIN users u ON p.owner_id = u.user_id " +
      "WHERE p.project_id = $1",
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Project not found",
      });
    }

    const project = projectResult.rows[0];

    // Parse JSON fields if they're stored as strings
    if (typeof project.required_skills === "string") {
      project.required_skills = JSON.parse(project.required_skills);
    }

    if (typeof project.milestones === "string") {
      project.milestones = JSON.parse(project.milestones);
    }

    if (typeof project.milestone_status === "string") {
      project.milestone_status = JSON.parse(project.milestone_status);
    }

    // Calculate project progress based on completed milestones
    let completedMilestones = 0;
    if (project.milestone_status) {
      project.milestone_status.forEach((status) => {
        if (status === "completed") completedMilestones++;
      });
    }

    const totalMilestones = project.milestones ? project.milestones.length : 0;
    const progress =
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0;

    // Get team members
    const teamResult = await db.query(
      "SELECT u.user_id, u.name, u.profile_pic, tm.role FROM users u " +
      "JOIN team_members tm ON u.user_id = tm.user_id " +
      "JOIN teams t ON tm.team_id = t.team_id " +
      "WHERE t.project_id = $1",
      [projectId]
    );

    const team = teamResult.rows;

    // Get project updates/timeline
    const updatesResult = await db.query(
      "SELECT pu.*, u.name as author_name FROM project_updates pu " +
        "JOIN users u ON pu.user_id = u.user_id " +
        "WHERE pu.project_id = $1 " +
        "ORDER BY pu.created_at DESC",
      [projectId]
    );

    const updates = updatesResult.rows;

    // Get comments
    const commentsResult = await db.query(
      "SELECT c.*, u.name as author_name, u.profile_pic FROM comments c " +
        "JOIN users u ON c.user_id = u.user_id " +
        "WHERE c.project_id = $1 " +
        "ORDER BY c.created_at DESC",
      [projectId]
    );

    const comments = commentsResult.rows;

    // Check if user is a member of this project
    const isMemberResult = await db.query(
      "SELECT tm.* FROM team_members tm " +
      "JOIN teams t ON tm.team_id = t.team_id " +
      "WHERE t.project_id = $1 AND tm.user_id = $2",
      [projectId, userId]
    );

    const isMember = isMemberResult.rows.length > 0;

    // Check if user has a pending application
    const applicationResult = await db.query(
      "SELECT * FROM project_applications WHERE project_id = $1 AND user_id = $2 AND status = 'pending'",
      [projectId, req.session.user_id]
    );

    const hasPendingApplication = applicationResult.rows.length > 0;

    // Get related projects (same category or similar skills)
    const relatedResult = await db.query(
      "SELECT p.*, u.name as owner_name FROM projects p " +
        "JOIN users u ON p.owner_id = u.user_id " +
        "WHERE p.category = $1 AND p.project_id != $2 " +
        "ORDER BY p.created_at DESC LIMIT 3",
      [project.category, projectId]
    );

    const relatedProjects = relatedResult.rows;

    // Format dates
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    project.formatted_created_at = formatDate(project.created_at);
    project.formatted_updated_at = formatDate(
      project.updated_at || project.created_at
    );

    updates.forEach((update) => {
      update.formatted_date = formatDate(update.created_at);
    });

    comments.forEach((comment) => {
      comment.formatted_date = formatDate(comment.created_at);
    });

    // Render the project details page
    res.render("project-details", {
      user: req.session.user,
      project,
      team,
      updates,
      comments,
      isMember,
      hasPendingApplication,
      relatedProjects,
      progress,
      error: req.query.error || null,
      success: req.query.success || null,
      baseUrl: `${req.protocol}://${req.get('host')}`,
      projectUrl: `${req.protocol}://${req.get('host')}/projects/${project.project_id}`
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).render("error", {
      user: req.session.user,
      error: "An error occurred while loading the project details",
    });
  }
});

// Add Comment to Project
router.post("/projects/:id/comment", async (req, res) => {
  if (!req.session.user) return res.redirect("/signin");

  try {
    const projectId = req.params.id;
    const { comment } = req.body;

    if (!comment || comment.trim() === "") {
      return res.redirect(
        `/projects/${projectId}?error=Comment cannot be empty`
      );
    }

    await db.query(
      "INSERT INTO comments (project_id, user_id, content, created_at) VALUES ($1, $2, $3, NOW())",
      [projectId, req.session.user_id, comment]
    );

    res.redirect(`/projects/${projectId}#comments`);
  } catch (err) {
    console.error("Database error:", err);
    res.redirect(`/projects/${req.params.id}?error=Failed to add comment`);
  }
});

// Apply to project
router.post("/projects/:id/apply", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.session.user_id;
    const { cover_letter, relevant_skills, availability } = req.body;

    // Check if user already applied to this project
    const existingApplication = await db.query(
      "SELECT * FROM project_applications WHERE project_id = $1 AND user_id = $2",
      [projectId, userId]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "You have already applied to this project" 
      });
    }

    // Insert the application
    await db.query(
      "INSERT INTO project_applications (project_id, user_id, message, status, created_at) VALUES ($1, $2, $3, $4, NOW())",
      [projectId, userId, cover_letter, "pending"]
    );

    // Get project owner to send notification
    const projectOwnerResult = await db.query(
      "SELECT owner_id, title FROM projects WHERE project_id = $1",
      [projectId]
    );
    
    if (projectOwnerResult.rows.length > 0) {
      const ownerId = projectOwnerResult.rows[0].owner_id;
      const projectTitle = projectOwnerResult.rows[0].title;
      
      // Create notification for project owner
      await db.query(
        "INSERT INTO notifications (user_id, type, content, related_id, is_read, created_at) VALUES ($1, $2, $3, $4, false, NOW())",
        [ownerId, 'project_application', `New application for your project: ${projectTitle}`, projectId]
      );
    }

    res.status(200).json({ 
      success: true, 
      message: "Application submitted successfully" 
    });
  } catch (err) {
    console.error("Error submitting application:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to submit application" 
    });
  }
});

// Add project
router.post("/projects/add", async (req, res) => {
  if (!req.session.user_id) {
    return res.redirect("/signin");
  }

  const { title, description, required_skills } = req.body;

  try {
    await db.query(
      "INSERT INTO projects (title, description, owner_id, required_skills, status) VALUES ($1, $2, $3, $4, $5)",
      [title, description, req.session.user_id, required_skills, "Open"]
    );

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Database error:", err);
    res.redirect("/dashboard?error=Error creating project");
  }
});

// Delete project
router.post("/projects/:id/delete", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.session.user_id;

    // Check if user is the project owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to delete this project" 
      });
    }

    // Start transaction
    await db.query("BEGIN");

    // Delete project applications
    await db.query(
      "DELETE FROM project_applications WHERE project_id = $1",
      [projectId]
    );

    // Delete project updates
    await db.query(
      "DELETE FROM project_updates WHERE project_id = $1",
      [projectId]
    );

    // Delete team members
    await db.query(
      "DELETE FROM team_members WHERE team_id IN (SELECT team_id FROM teams WHERE project_id = $1)",
      [projectId]
    );

    // Delete teams
    await db.query(
      "DELETE FROM teams WHERE project_id = $1",
      [projectId]
    );

    // Delete notifications related to this project
    await db.query(
      "DELETE FROM notifications WHERE related_id = $1",
      [projectId]
    );

    // Finally delete the project
    await db.query(
      "DELETE FROM projects WHERE project_id = $1",
      [projectId]
    );

    // Commit transaction
    await db.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully"
    });
  } catch (err) {
    // Rollback in case of error
    await db.query("ROLLBACK");
    console.error("Error deleting project:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete project"
    });
  }
});

// Update project status
router.post("/projects/:id/update-status", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { status } = req.body;
    const userId = req.session.user_id;

    // Check if user is the project owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this project"
      });
    }

    // Update project status
    await db.query(
      "UPDATE projects SET status = $1, updated_at = NOW() WHERE project_id = $2",
      [status, projectId]
    );

    // Add project update
    await db.query(
      "INSERT INTO project_updates (project_id, user_id, update_type, content, created_at) VALUES ($1, $2, $3, $4, NOW())",
      [projectId, userId, "status_change", `Project status changed to ${status}`]
    );

    return res.status(200).json({
      success: true,
      message: "Project status updated successfully"
    });
  } catch (err) {
    console.error("Error updating project status:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update project status"
    });
  }
});

// Update project timeline
router.post("/projects/:id/update-timeline", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { milestones, deadline } = req.body;
    const userId = req.session.user_id;

    // Check if user is the project owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this project"
      });
    }

    // Update project timeline
    await db.query(
      "UPDATE projects SET milestones = $1, deadline = $2, updated_at = NOW() WHERE project_id = $3",
      [JSON.stringify(milestones), deadline, projectId]
    );

    // Add project update
    await db.query(
      "INSERT INTO project_updates (project_id, user_id, update_type, content, created_at) VALUES ($1, $2, $3, $4, NOW())",
      [projectId, userId, "timeline_update", "Project timeline has been updated"]
    );

    return res.status(200).json({
      success: true,
      message: "Project timeline updated successfully"
    });
  } catch (err) {
    console.error("Error updating project timeline:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update project timeline"
    });
  }
});

// Add team member to project
router.post("/projects/:id/team/add", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { userId, role } = req.body;
    const currentUserId = req.session.user_id;

    // Check if current user is the project owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, currentUserId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to add team members to this project"
      });
    }

    // Get or create team for this project
    let teamId;
    const teamResult = await db.query(
      "SELECT team_id FROM teams WHERE project_id = $1",
      [projectId]
    );

    if (teamResult.rows.length === 0) {
      // Create new team
      const newTeamResult = await db.query(
        "INSERT INTO teams (project_id, team_name) VALUES ($1, $2) RETURNING team_id",
        [projectId, `${projectResult.rows[0].title} Team`]
      );
      teamId = newTeamResult.rows[0].team_id;
    } else {
      teamId = teamResult.rows[0].team_id;
    }

    // Check if user is already a team member
    const memberResult = await db.query(
      "SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2",
      [teamId, userId]
    );

    if (memberResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User is already a team member"
      });
    }

    // Add user to team
    await db.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)",
      [teamId, userId, role || "Member"]
    );

    // Create notification for the added user
    await db.query(
      "INSERT INTO notifications (user_id, type, content, related_id, is_read, created_at) VALUES ($1, $2, $3, $4, false, NOW())",
      [userId, 'team_added', `You've been added to the project: ${projectResult.rows[0].title}`, projectId]
    );

    return res.status(200).json({
      success: true,
      message: "Team member added successfully"
    });
  } catch (err) {
    console.error("Error adding team member:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to add team member"
    });
  }
});

// Remove team member from project
router.post("/projects/:id/team/remove", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { userId } = req.body;
    const currentUserId = req.session.user_id;

    // Check if current user is the project owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, currentUserId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to remove team members from this project"
      });
    }

    // Get team for this project
    const teamResult = await db.query(
      "SELECT team_id FROM teams WHERE project_id = $1",
      [projectId]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found for this project"
      });
    }

    const teamId = teamResult.rows[0].team_id;

    // Remove user from team
    await db.query(
      "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2",
      [teamId, userId]
    );

    // Create notification for the removed user
    await db.query(
      "INSERT INTO notifications (user_id, type, content, related_id, is_read, created_at) VALUES ($1, $2, $3, $4, false, NOW())",
      [userId, 'team_removed', `You've been removed from the project: ${projectResult.rows[0].title}`, projectId]
    );

    return res.status(200).json({
      success: true,
      message: "Team member removed successfully"
    });
  } catch (err) {
    console.error("Error removing team member:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to remove team member"
    });
  }
});

export default router;