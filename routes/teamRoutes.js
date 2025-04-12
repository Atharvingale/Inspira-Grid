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

// Get all teams
// Fix the userId reference in the teams route
router.get("/teams", isAuthenticated, async (req, res) => {
  try {
    // Change this line from req.session.user_id to req.session.user.user_id
    const userId = req.session.user.user_id;

    // Get user information
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    // Get teams where user is a member
    const teamsResult = await db.query(
      `SELECT t.*, p.title as project_title, p.description as project_description, 
        u.name as owner_name, u.profile_pic as owner_pic,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) as member_count
       FROM teams t
       JOIN projects p ON t.project_id = p.project_id
       JOIN users u ON p.owner_id = u.user_id
       JOIN team_members tm ON t.team_id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,  // Changed from tm.created_at to t.created_at
      [userId]
    );

    // Get teams where user is the owner
    const ownedTeamsResult = await db.query(
      `SELECT t.*, p.title as project_title, p.description as project_description,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) as member_count
       FROM teams t
       JOIN projects p ON t.project_id = p.project_id
       WHERE p.owner_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    // Process teams
    const processTeams = async (teams) => {
      const processedTeams = [];
      
      for (const team of teams) {
        // Get team members
        const membersResult = await db.query(
          `SELECT tm.*, u.name, u.profile_pic, u.email, u.skills
           FROM team_members tm
           JOIN users u ON tm.user_id = u.user_id
           WHERE tm.team_id = $1
           ORDER BY tm.joined_at ASC`,
          [team.team_id]
        );
        
        processedTeams.push({
          ...team,
          members: membersResult.rows,
          created_at_formatted: new Date(team.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        });
      }
      
      return processedTeams;
    };

    // In the GET /teams route, modify the render call to include allTeams
    const myTeams = await processTeams(teamsResult.rows);
    const ownedTeams = await processTeams(ownedTeamsResult.rows);
    
    // Add this section to get all teams
    const allTeamsResult = await db.query(
      `SELECT t.*, p.title as project_title, p.description as project_description,
        u.name as owner_name, u.profile_pic as owner_pic,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) as member_count,
        (SELECT u.name FROM users u JOIN team_members tm ON u.user_id = tm.user_id 
         WHERE tm.team_id = t.team_id AND tm.role = 'Leader' LIMIT 1) as leader_name,
        (SELECT u.user_id FROM users u JOIN team_members tm ON u.user_id = tm.user_id 
         WHERE tm.team_id = t.team_id AND tm.role = 'Leader' LIMIT 1) as leader_id,
        CASE WHEN EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = t.team_id AND tm.user_id = $1) 
             THEN true ELSE false END as is_member
       FROM teams t
       JOIN projects p ON t.project_id = p.project_id
       JOIN users u ON p.owner_id = u.user_id
       ORDER BY t.created_at DESC
       LIMIT 12`,
      [userId]
    );
    
    const allTeams = await processTeams(allTeamsResult.rows);
    
    // Add featuredTeams as well since it's used in the template
    const featuredTeamsResult = await db.query(
      `SELECT t.*, p.title as project_title, p.description as project_description,
        u.name as owner_name, u.profile_pic as owner_pic,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) as member_count,
        (SELECT u.name FROM users u JOIN team_members tm ON u.user_id = tm.user_id 
         WHERE tm.team_id = t.team_id AND tm.role = 'Leader' LIMIT 1) as leader_name,
        (SELECT u.user_id FROM users u JOIN team_members tm ON u.user_id = tm.user_id 
         WHERE tm.team_id = t.team_id AND tm.role = 'Leader' LIMIT 1) as leader_id
       FROM teams t
       JOIN projects p ON t.project_id = p.project_id
       JOIN users u ON p.owner_id = u.user_id
       ORDER BY (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) DESC
       LIMIT 6`
    );
    
    const featuredTeams = await processTeams(featuredTeamsResult.rows);
    
    res.render("teams", {
      title: "My Teams",
      currentPage: "teams",
      user,
      myTeams,
      ownedTeams,
      allTeams,     // Add this line to include allTeams
      featuredTeams, // Add this line to include featuredTeams
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load teams. Please try again later.",
      title: "Error",
      currentPage: 'teams'
    });
  }
});

// Get team details
router.get("/teams/:id", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    // Change this line from req.session.user_id to req.session.user.user_id
    const userId = req.session.user.user_id;
    
    // Get team details
    const teamResult = await db.query(
      `SELECT t.*, p.title as project_name, p.description as project_description,
        u.name as owner_name, u.profile_pic as owner_pic
       FROM teams t
       JOIN projects p ON t.project_id = p.project_id
       JOIN users u ON p.owner_id = u.user_id
       WHERE t.team_id = $1`,
      [teamId]
    );
    
    if (teamResult.rows.length === 0) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Team not found",
        title: "Error",
        currentPage: "teams"
      });
    }
    
    const team = teamResult.rows[0];
    
    // Check if user is a member of this team
    const memberResult = await db.query(
      `SELECT tm.*, r.role_name
       FROM team_members tm
       LEFT JOIN roles r ON tm.role = r.role_id
       WHERE tm.team_id = $1 AND tm.user_id = $2`,
      [teamId, userId]
    );
    
    team.isMember = memberResult.rows.length > 0;
    team.userRole = team.isMember ? memberResult.rows[0].role_name : null;
    
    // Get team members
    const membersResult = await db.query(
      `SELECT tm.*, u.name, u.profile_pic, u.title, r.role_name
       FROM team_members tm
       JOIN users u ON tm.user_id = u.user_id
       LEFT JOIN roles r ON tm.role = r.role_id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at ASC`,
      [teamId]
    );
    
    team.members = membersResult.rows;
    
    // Get team skills
    const skillsResult = await db.query(
      `SELECT s.*
       FROM team_skills ts
       JOIN skills s ON ts.skill_id = s.skill_id
       WHERE ts.team_id = $1`,
      [teamId]
    );
    
    team.skills = skillsResult.rows;
    
    // Render team details page
    res.render("team-details", {
      user: req.session.user,
      team,
      title: `Team: ${team.team_name}`,
      currentPage: "teams"
    });
  } catch (error) {
    console.error("Error in team details route:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "An error occurred while loading team details",
      title: "Error",
      currentPage: "teams"
    });
  }
});

// Remove team member
router.post("/teams/:teamId/remove-member/:userId", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const memberUserId = req.params.userId;
    const currentUserId = req.session.user_id;

    // Check if current user is the project owner or team leader
    const authCheckResult = await db.query(
      `SELECT p.owner_id, t.project_id, t.team_name
       FROM teams t
       JOIN projects p ON t.project_id = p.project_id
       WHERE t.team_id = $1`,
      [teamId]
    );

    if (authCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    const team = authCheckResult.rows[0];

    // Check if user is project owner
    const isOwner = team.owner_id === currentUserId;

    // If not owner, check if user is team leader
    let isLeader = false;
    if (!isOwner) {
      const leaderCheckResult = await db.query(
        `SELECT * FROM team_members
         WHERE team_id = $1 AND user_id = $2 AND role = 'Leader'`,
        [teamId, currentUserId]
      );
      isLeader = leaderCheckResult.rows.length > 0;
    }

    if (!isOwner && !isLeader) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to remove team members"
      });
    }

    // Check if trying to remove the project owner
    if (team.owner_id === parseInt(memberUserId)) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove the project owner from the team"
      });
    }

    // Remove the team member
    await db.query(
      "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2",
      [teamId, memberUserId]
    );

    // Log the activity
    await db.query(
      `INSERT INTO team_activities (team_id, user_id, activity_type, description, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [teamId, currentUserId, 'member_removed', `Removed a team member`]
    );

    // Create notification for the removed user
    await db.query(
      `INSERT INTO notifications (user_id, type, content, related_id, is_read, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())`,
      [memberUserId, 'team_removed', `You have been removed from the team: ${team.team_name}`, team.project_id]
    );

    return res.status(200).json({
      success: true,
      message: "Team member removed successfully"
    });
  } catch (error) {
    console.error("Error removing team member:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove team member"
    });
  }
});

// Create team
router.post("/teams/create", isAuthenticated, async (req, res) => {
  try {
    const { projectId, teamName, description, skills } = req.body;
    // Change this line from req.session.user_id to req.session.user.user_id
    const userId = req.session.user.user_id;
    
    // Get user information
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    // Get teams where user is a member
    const teamsResult = await db.query(
      `SELECT t.*, p.title as project_title, p.description as project_description, 
        u.name as owner_name, u.profile_pic as owner_pic,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) as member_count
       FROM teams t
       JOIN projects p ON t.project_id = p.project_id
       JOIN users u ON p.owner_id = u.user_id
       JOIN team_members tm ON t.team_id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    // Get teams where user is the owner
    const ownedTeamsResult = await db.query(
      `SELECT t.*, p.title as project_title, p.description as project_description,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) as member_count
       FROM teams t
       JOIN projects p ON t.project_id = p.project_id
       WHERE p.owner_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    // Process teams
    const processTeams = async (teams) => {
      const processedTeams = [];
      
      for (const team of teams) {
        // Get team members
        const membersResult = await db.query(
          `SELECT tm.*, u.name, u.profile_pic, u.email, u.skills
           FROM team_members tm
           JOIN users u ON tm.user_id = u.user_id
           WHERE tm.team_id = $1
           ORDER BY tm.joined_at ASC`,
          [team.team_id]
        );
        
        processedTeams.push({
          ...team,
          members: membersResult.rows,
          created_at_formatted: new Date(team.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        });
      }
      
      return processedTeams;
    };

    const myTeams = await processTeams(teamsResult.rows);
    const ownedTeams = await processTeams(ownedTeamsResult.rows);

    res.render("teams", {
      title: "My Teams",
      currentPage: "teams",
      user,
      myTeams,
      ownedTeams,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load teams. Please try again later.",
      title: "Error",
      currentPage: 'teams'
    });
  }
});

// Join team
router.post("/teams/:id/join", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    // Change this line from req.session.user_id to req.session.user.user_id
    const userId = req.session.user.user_id;
    
    // Get team details
    const teamResult = await db.query(
      `SELECT t.*, p.title as project_name, p.description as project_description,
        u.name as owner_name, u.profile_pic as owner_pic
       FROM teams t
       JOIN projects p ON t.project_id = p.project_id
       JOIN users u ON p.owner_id = u.user_id
       WHERE t.team_id = $1`,
      [teamId]
    );
    
    if (teamResult.rows.length === 0) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Team not found",
        title: "Error",
        currentPage: "teams"
      });
    }
    
    const team = teamResult.rows[0];
    
    // Check if user is a member of this team
    const memberResult = await db.query(
      `SELECT tm.*, r.role_name
       FROM team_members tm
       LEFT JOIN roles r ON tm.role = r.role_id
       WHERE tm.team_id = $1 AND tm.user_id = $2`,
      [teamId, userId]
    );
    
    team.isMember = memberResult.rows.length > 0;
    team.userRole = team.isMember ? memberResult.rows[0].role_name : null;
    
    // Get team members
    const membersResult = await db.query(
      `SELECT tm.*, u.name, u.profile_pic, u.title, r.role_name
       FROM team_members tm
       JOIN users u ON tm.user_id = u.user_id
       LEFT JOIN roles r ON tm.role = r.role_id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at ASC`,
      [teamId]
    );
    
    team.members = membersResult.rows;
    
    // Get team skills
    const skillsResult = await db.query(
      `SELECT s.*
       FROM team_skills ts
       JOIN skills s ON ts.skill_id = s.skill_id
       WHERE ts.team_id = $1`,
      [teamId]
    );
    
    team.skills = skillsResult.rows;
    
    // Render team details page
    res.render("team-details", {
      user: req.session.user,
      team,
      title: `Team: ${team.team_name}`,
      currentPage: "teams"
    });
  } catch (error) {
    console.error("Error in team details route:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "An error occurred while loading team details",
      title: "Error",
      currentPage: "teams"
    });
  }
});

// Leave team
router.post("/teams/:id/leave", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    // Change this line from req.session.user_id to req.session.user.user_id
    const userId = req.session.user.user_id;
    
    // Get team details
    const teamResult = await db.query(
      `SELECT t.*, p.title as project_name, p.description as project_description,
        u.name as owner_name, u.profile_pic as owner_pic
       FROM teams t
       JOIN projects p ON t.project_id = p.project_id
       JOIN users u ON p.owner_id = u.user_id
       WHERE t.team_id = $1`,
      [teamId]
    );
    
    if (teamResult.rows.length === 0) {
      return res.status(404).render("error", {
        user: req.session.user,
        error: "Team not found",
        title: "Error",
        currentPage: "teams"
      });
    }
    
    const team = teamResult.rows[0];
    
    // Check if user is a member of this team
    const memberResult = await db.query(
      `SELECT tm.*, r.role_name
       FROM team_members tm
       LEFT JOIN roles r ON tm.role = r.role_id
       WHERE tm.team_id = $1 AND tm.user_id = $2`,
      [teamId, userId]
    );
    
    team.isMember = memberResult.rows.length > 0;
    team.userRole = team.isMember ? memberResult.rows[0].role_name : null;
    
    // Get team members
    const membersResult = await db.query(
      `SELECT tm.*, u.name, u.profile_pic, u.title, r.role_name
       FROM team_members tm
       JOIN users u ON tm.user_id = u.user_id
       LEFT JOIN roles r ON tm.role = r.role_id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at ASC`,
      [teamId]
    );
    
    team.members = membersResult.rows;
    
    // Get team skills
    const skillsResult = await db.query(
      `SELECT s.*
       FROM team_skills ts
       JOIN skills s ON ts.skill_id = s.skill_id
       WHERE ts.team_id = $1`,
      [teamId]
    );
    
    team.skills = skillsResult.rows;
    
    // Render team details page
    res.render("team-details", {
      user: req.session.user,
      team,
      title: `Team: ${team.team_name}`,
      currentPage: "teams"
    });
  } catch (error) {
    console.error("Error in team details route:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "An error occurred while loading team details",
      title: "Error",
      currentPage: "teams"
    });
  }
});

export default router;
