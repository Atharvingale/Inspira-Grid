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

// Apply to project
router.post("/projects/apply", isAuthenticated, async (req, res) => {
  try {
    const { projectId, message, skills, coverLetter } = req.body;
    const userId = req.session.user_id;

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

    // Convert skills to JSONB format if it's not already
    const relevantSkills = typeof skills === 'string' ? JSON.stringify(skills.split(',').map(s => s.trim())) : JSON.stringify(skills);

    // Insert the application
    await db.query(
      "INSERT INTO project_applications (project_id, user_id, message, cover_letter, relevant_skills, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
      [projectId, userId, message, coverLetter || null, relevantSkills, "Pending"]
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

// Update application status
router.post("/applications/update", isAuthenticated, async (req, res) => {
  try {
    const { applicationId, status } = req.body;
    const userId = req.session.user_id;

    // Get application details
    const applicationResult = await db.query(
      "SELECT a.*, p.owner_id, p.title FROM project_applications a JOIN projects p ON a.project_id = p.project_id WHERE a.application_id = $1",
      [applicationId]
    );

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    const application = applicationResult.rows[0];

    // Check if user is the project owner
    if (application.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this application"
      });
    }

    // Update application status
    await db.query(
      "UPDATE project_applications SET status = $1, updated_at = NOW() WHERE application_id = $2",
      [status, applicationId]
    );

    // If application is accepted, add user to project team
    if (status === "accepted") {
      // Get or create team for this project
      let teamId;
      const teamResult = await db.query(
        "SELECT team_id FROM teams WHERE project_id = $1",
        [application.project_id]
      );

      if (teamResult.rows.length === 0) {
        // Create new team
        const newTeamResult = await db.query(
          "INSERT INTO teams (project_id, team_name) VALUES ($1, $2) RETURNING team_id",
          [application.project_id, `${application.title} Team`]
        );
        teamId = newTeamResult.rows[0].team_id;
      } else {
        teamId = teamResult.rows[0].team_id;
      }

      // Check if user is already a team member
      const memberResult = await db.query(
        "SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2",
        [teamId, application.user_id]
      );

      if (memberResult.rows.length === 0) {
        // Add user to team
        await db.query(
          "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)",
          [teamId, application.user_id, "Member"]
        );
      }
    }

    // Create notification for applicant
    await db.query(
      "INSERT INTO notifications (user_id, type, content, related_id, is_read, created_at) VALUES ($1, $2, $3, $4, false, NOW())",
      [
        application.user_id,
        'application_update',
        `Your application for ${application.title} has been ${status}`,
        application.project_id
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Application ${status} successfully`
    });
  } catch (err) {
    console.error("Error updating application:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update application"
    });
  }
});

// Withdraw application
router.post("/applications/:id/withdraw", isAuthenticated, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const userId = req.session.user_id;

    // Check if user is the applicant
    const applicationResult = await db.query(
      "SELECT a.*, p.title FROM project_applications a JOIN projects p ON a.project_id = p.project_id WHERE a.application_id = $1 AND a.user_id = $2",
      [applicationId, userId]
    );

    if (applicationResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to withdraw this application"
      });
    }

    const application = applicationResult.rows[0];

    // Update application status to withdrawn
    await db.query(
      "UPDATE project_applications SET status = 'withdrawn', updated_at = NOW() WHERE application_id = $1",
      [applicationId]
    );

    // Create notification for project owner
    await db.query(
      "INSERT INTO notifications (user_id, type, content, related_id, is_read, created_at) VALUES ($1, $2, $3, $4, false, NOW())",
      [
        application.owner_id,
        'application_withdrawn',
        `An application for ${application.title} has been withdrawn`,
        application.project_id
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Application withdrawn successfully"
    });
  } catch (err) {
    console.error("Error withdrawing application:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to withdraw application"
    });
  }
});

// Respond to application
router.post("/projects/:id/applications/:appId/respond", isAuthenticated, async (req, res) => {
  try {
    const projectId = req.params.id;
    const applicationId = req.params.appId;
    const { status, message } = req.body;
    const userId = req.session.user_id;

    // Check if user is the project owner
    const projectResult = await db.query(
      "SELECT * FROM projects WHERE project_id = $1 AND owner_id = $2",
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to respond to applications for this project"
      });
    }

    // Get application details
    const applicationResult = await db.query(
      "SELECT * FROM project_applications WHERE application_id = $1 AND project_id = $2",
      [applicationId, projectId]
    );

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    const application = applicationResult.rows[0];

    // Update application status
    await db.query(
      "UPDATE project_applications SET status = $1, response_message = $2, updated_at = NOW() WHERE application_id = $3",
      [status, message || null, applicationId]
    );

    // If application is accepted, add user to project team
    if (status === "accepted") {
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
        [teamId, application.user_id]
      );

      if (memberResult.rows.length === 0) {
        // Add user to team
        await db.query(
          "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)",
          [teamId, application.user_id, "Member"]
        );
      }
    }

    // Create notification for applicant
    await db.query(
      "INSERT INTO notifications (user_id, type, content, related_id, is_read, created_at) VALUES ($1, $2, $3, $4, false, NOW())",
      [
        application.user_id,
        'application_response',
        `Your application for project ${projectResult.rows[0].title} has been ${status}`,
        projectId
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Application ${status} successfully`
    });
  } catch (err) {
    console.error("Error responding to application:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to respond to application"
    });
  }
});

export default router;