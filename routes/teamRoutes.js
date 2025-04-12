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
router.get("/teams", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Get user information
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    // Get teams where user is a member
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

// Get team details
router.get("/teams/:id", isAuthenticated, async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.session.user_id;

    // Check if user is a member of this team
    const memberCheckResult = await db.query(
      `SELECT * FROM team_members tm
       WHERE tm.team_id = $1 AND tm.user_id = $2
       UNION
       SELECT tm.* FROM team_members tm
       JOIN teams t ON tm.team_id = t.team_id
       JOIN projects p ON t.project_id = p.project_id
       WHERE t.team_id = $1 AND p.owner_id = $2`,
      [teamId, userId]
    );

    if (memberCheckResult.rows.length === 0) {
      return res.status(403).render("error", {
        user: req.session.user,
        error: "You don't have permission to view this team",
        title: "Access Denied",
        currentPage: 'teams'
      });
    }

    // Get team details
    const teamResult = await db.query(
      `SELECT t.*, p.title as project_title, p.description as project_description, 
        p.status as project_status, p.deadline as project_deadline,
        u.name as owner_name, u.profile_pic as owner_pic, u.user_id as owner_id
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
        title: "Not Found",
        currentPage: 'teams'
      });
    }

    const team = teamResult.rows[0];

    // Get team members
    const membersResult = await db.query(
      `SELECT tm.*, u.name, u.profile_pic, u.email, u.skills, u.bio
       FROM team_members tm
       JOIN users u ON tm.user_id = u.user_id
       WHERE tm.team_id = $1
       ORDER BY tm.role = 'Leader' DESC, tm.joined_at ASC`,
      [teamId]
    );

    // Get team activities
    const activitiesResult = await db.query(
      `SELECT a.*, u.name as user_name, u.profile_pic as user_pic
       FROM team_activities a
       JOIN users u ON a.user_id = u.user_id
       WHERE a.team_id = $1
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [teamId]
    );

    // Format dates
    team.created_at_formatted = new Date(team.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (team.project_deadline) {
      team.deadline_formatted = new Date(team.project_deadline).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    // Format activities
    const activities = activitiesResult.rows.map(activity => ({
      ...activity,
      created_at_formatted: new Date(activity.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    // Check if user is the project owner
    const isOwner = team.owner_id === userId;

    res.render("team-details", {
      title: team.team_name,
      currentPage: "teams",
      user: req.session.user,
      team,
      members: membersResult.rows,
      activities,
      isOwner,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching team details:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load team details. Please try again later.",
      title: "Error",
      currentPage: 'teams'
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

export default router;
