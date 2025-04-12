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

// Resources route
router.get("/resources", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Get user information
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    // Get resources
    const resourcesResult = await db.query(
      `SELECT r.*, u.name as creator_name, u.profile_pic as creator_pic,
        (SELECT COUNT(*) FROM resource_likes WHERE resource_id = r.resource_id) as like_count
       FROM resources r
       JOIN users u ON r.creator_id = u.user_id
       ORDER BY r.created_at DESC`,
      []
    );

    // Get user's bookmarked resources
    const bookmarksResult = await db.query(
      `SELECT resource_id FROM resource_bookmarks
       WHERE user_id = $1`,
      [userId]
    );

    const bookmarkedIds = bookmarksResult.rows.map(row => row.resource_id);

    // Process resources
    const resources = resourcesResult.rows.map(resource => ({
      ...resource,
      created_at_formatted: new Date(resource.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      is_bookmarked: bookmarkedIds.includes(resource.resource_id)
    }));

    // Group resources by category
    const resourcesByCategory = {};
    resources.forEach(resource => {
      if (!resourcesByCategory[resource.category]) {
        resourcesByCategory[resource.category] = [];
      }
      resourcesByCategory[resource.category].push(resource);
    });

    res.render("resources", {
      title: "Resources",
      currentPage: "resources",
      user,
      resourcesByCategory,
      resources,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load resources. Please try again later.",
      title: "Error",
      currentPage: 'resources'
    });
  }
});

// Documentation route
router.get("/resources/documentation", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Get user information
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    // Get documentation resources
    const docsResult = await db.query(
      `SELECT r.*, u.name as creator_name, u.profile_pic as creator_pic
       FROM resources r
       JOIN users u ON r.creator_id = u.user_id
       WHERE r.category = 'Documentation'
       ORDER BY r.created_at DESC`,
      []
    );

    // Process documentation
    const documentation = docsResult.rows.map(doc => ({
      ...doc,
      created_at_formatted: new Date(doc.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }));

    res.render("documentation", {
      title: "Documentation",
      currentPage: "resources",
      user,
      documentation,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching documentation:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load documentation. Please try again later.",
      title: "Error",
      currentPage: 'resources'
    });
  }
});

// Calendar route
router.get("/calendar", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Get user information
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    // Get user's projects with deadlines
    const projectsResult = await db.query(
      `SELECT p.project_id, p.title, p.deadline, p.status
       FROM projects p
       WHERE p.owner_id = $1 AND p.deadline IS NOT NULL
       UNION
       SELECT p.project_id, p.title, p.deadline, p.status
       FROM projects p
       JOIN teams t ON p.project_id = t.project_id
       JOIN team_members tm ON t.team_id = tm.team_id
       WHERE tm.user_id = $1 AND p.deadline IS NOT NULL`,
      [userId]
    );

    // Get user's tasks with deadlines
    const tasksResult = await db.query(
      `SELECT t.task_id, t.title, t.due_date as deadline, t.status, p.title as project_title
       FROM tasks t
       JOIN projects p ON t.project_id = p.project_id
       WHERE t.assigned_to = $1 AND t.due_date IS NOT NULL`,
      [userId]
    );

    // Get user's meetings
    const meetingsResult = await db.query(
      `SELECT m.meeting_id, m.title, m.start_time as deadline, p.title as project_title
       FROM meetings m
       JOIN meeting_participants mp ON m.meeting_id = mp.meeting_id
       LEFT JOIN projects p ON m.project_id = p.project_id
       WHERE mp.user_id = $1 AND m.start_time > NOW()`,
      [userId]
    );

    // Process events for calendar
    const processEvents = (items, type) => {
      return items.map(item => {
        const deadline = new Date(item.deadline);
        return {
          id: `${type}-${item.task_id || item.project_id || item.meeting_id}`,
          title: item.title,
          start: deadline.toISOString(),
          end: type === 'meeting' ? new Date(deadline.getTime() + 60*60*1000).toISOString() : deadline.toISOString(),
          allDay: type !== 'meeting',
          type: type,
          status: item.status,
          project: item.project_title,
          color: getEventColor(type, item.status)
        };
      });
    };

    const projectEvents = processEvents(projectsResult.rows, 'project');
    const taskEvents = processEvents(tasksResult.rows, 'task');
    const meetingEvents = processEvents(meetingsResult.rows, 'meeting');

    // Combine all events
    const events = [...projectEvents, ...taskEvents, ...meetingEvents];

    res.render("calendar", {
      title: "Calendar",
      currentPage: "calendar",
      user,
      events: JSON.stringify(events),
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load calendar. Please try again later.",
      title: "Error",
      currentPage: 'calendar'
    });
  }
});

// Reports route
router.get("/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.user_id;
  
      // Get user information
      const userResult = await db.query(
        "SELECT * FROM users WHERE user_id = $1",
        [userId]
      );
      const user = userResult.rows[0];
  
      // Get user's project statistics
      const projectStatsResult = await db.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'Open') as open_projects,
          COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_projects,
          COUNT(*) FILTER (WHERE status = 'Completed') as completed_projects,
          COUNT(*) as total_projects
         FROM projects
         WHERE owner_id = $1`,
        [userId]
      );
  
      const projectStats = projectStatsResult.rows[0];
  
      // Get task statistics
      const taskStatsResult = await db.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'To Do') as todo_tasks,
          COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_tasks,
          COUNT(*) FILTER (WHERE status = 'Completed') as completed_tasks,
          COUNT(*) as total_tasks
         FROM tasks
         WHERE assigned_to = $1`,
        [userId]
      );
  
      const taskStats = taskStatsResult.rows[0];
  
      // Get project completion over time
      const projectTimelineResult = await db.query(
        `SELECT 
          DATE_TRUNC('month', completed_at) as month,
          COUNT(*) as completed_count
         FROM projects
         WHERE owner_id = $1 AND status = 'Completed' AND completed_at IS NOT NULL
         GROUP BY DATE_TRUNC('month', completed_at)
         ORDER BY month ASC
         LIMIT 12`,
        [userId]
      );
  
      const projectTimeline = projectTimelineResult.rows.map(row => ({
        month: new Date(row.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: parseInt(row.completed_count)
      }));
  
      // Get team collaboration stats
      const teamStatsResult = await db.query(
        `SELECT 
          t.team_id,
          t.team_name,
          p.title as project_title,
          COUNT(DISTINCT tm.user_id) as member_count,
          COUNT(DISTINCT c.comment_id) as comment_count,
          COUNT(DISTINCT pu.update_id) as update_count
         FROM teams t
         JOIN projects p ON t.project_id = p.project_id
         JOIN team_members tm ON t.team_id = tm.team_id
         LEFT JOIN comments c ON p.project_id = c.project_id
         LEFT JOIN project_updates pu ON p.project_id = pu.project_id
         WHERE p.owner_id = $1 OR tm.user_id = $1
         GROUP BY t.team_id, t.team_name, p.title
         ORDER BY member_count DESC
         LIMIT 5`,
        [userId]
      );
  
      const teamStats = teamStatsResult.rows;
  
      res.render("reports", {
        title: "Reports & Analytics",
        currentPage: "reports",
        user,
        projectStats,
        taskStats,
        projectTimeline: JSON.stringify(projectTimeline),
        teamStats,
        error: req.query.error || null,
        success: req.query.success || null
      });
    } catch (error) {
      console.error("Error generating reports:", error);
      res.status(500).render("error", {
        user: req.session.user,
        error: "Failed to generate reports. Please try again later.",
        title: "Error",
        currentPage: 'reports'
      });
    }
  });
  
  // Add resource
  router.post("/resources/add", isAuthenticated, async (req, res) => {
    try {
      const { title, description, category, link, tags } = req.body;
      const userId = req.session.user_id;
  
      // Insert the resource
      await db.query(
        `INSERT INTO resources (title, description, category, link, tags, creator_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [title, description, category, link, tags, userId]
      );
  
      res.redirect("/resources?success=Resource added successfully");
    } catch (error) {
      console.error("Error adding resource:", error);
      res.redirect("/resources?error=Failed to add resource");
    }
  });
  
  // Bookmark resource
  router.post("/resources/:id/bookmark", isAuthenticated, async (req, res) => {
    try {
      const resourceId = req.params.id;
      const userId = req.session.user_id;
  
      // Check if already bookmarked
      const existingBookmark = await db.query(
        "SELECT * FROM resource_bookmarks WHERE resource_id = $1 AND user_id = $2",
        [resourceId, userId]
      );
  
      if (existingBookmark.rows.length > 0) {
        // Remove bookmark
        await db.query(
          "DELETE FROM resource_bookmarks WHERE resource_id = $1 AND user_id = $2",
          [resourceId, userId]
        );
        return res.status(200).json({
          success: true,
          bookmarked: false,
          message: "Bookmark removed"
        });
      } else {
        // Add bookmark
        await db.query(
          "INSERT INTO resource_bookmarks (resource_id, user_id, created_at) VALUES ($1, $2, NOW())",
          [resourceId, userId]
        );
        return res.status(200).json({
          success: true,
          bookmarked: true,
          message: "Resource bookmarked"
        });
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to toggle bookmark"
      });
    }
  });
  
  // Like resource
  router.post("/resources/:id/like", isAuthenticated, async (req, res) => {
    try {
      const resourceId = req.params.id;
      const userId = req.session.user_id;
  
      // Check if already liked
      const existingLike = await db.query(
        "SELECT * FROM resource_likes WHERE resource_id = $1 AND user_id = $2",
        [resourceId, userId]
      );
  
      if (existingLike.rows.length > 0) {
        // Remove like
        await db.query(
          "DELETE FROM resource_likes WHERE resource_id = $1 AND user_id = $2",
          [resourceId, userId]
        );
        
        // Get updated like count
        const likeCountResult = await db.query(
          "SELECT COUNT(*) as count FROM resource_likes WHERE resource_id = $1",
          [resourceId]
        );
        
        return res.status(200).json({
          success: true,
          liked: false,
          likeCount: parseInt(likeCountResult.rows[0].count),
          message: "Like removed"
        });
      } else {
        // Add like
        await db.query(
          "INSERT INTO resource_likes (resource_id, user_id, created_at) VALUES ($1, $2, NOW())",
          [resourceId, userId]
        );
        
        // Get updated like count
        const likeCountResult = await db.query(
          "SELECT COUNT(*) as count FROM resource_likes WHERE resource_id = $1",
          [resourceId]
        );
        
        return res.status(200).json({
          success: true,
          liked: true,
          likeCount: parseInt(likeCountResult.rows[0].count),
          message: "Resource liked"
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to toggle like"
      });
    }
  });
  
  // Get resource details
  router.get("/resources/:id", isAuthenticated, async (req, res) => {
    try {
      const resourceId = req.params.id;
      const userId = req.session.user_id;
  
      // Get resource details
      const resourceResult = await db.query(
        `SELECT r.*, u.name as creator_name, u.profile_pic as creator_pic,
          (SELECT COUNT(*) FROM resource_likes WHERE resource_id = r.resource_id) as like_count
         FROM resources r
         JOIN users u ON r.creator_id = u.user_id
         WHERE r.resource_id = $1`,
        [resourceId]
      );
  
      if (resourceResult.rows.length === 0) {
        return res.status(404).render("error", {
          user: req.session.user,
          error: "Resource not found",
          title: "Not Found",
          currentPage: 'resources'
        });
      }
  
      const resource = resourceResult.rows[0];
  
      // Check if user has bookmarked this resource
      const bookmarkResult = await db.query(
        "SELECT * FROM resource_bookmarks WHERE resource_id = $1 AND user_id = $2",
        [resourceId, userId]
      );
  
      resource.is_bookmarked = bookmarkResult.rows.length > 0;
  
      // Check if user has liked this resource
      const likeResult = await db.query(
        "SELECT * FROM resource_likes WHERE resource_id = $1 AND user_id = $2",
        [resourceId, userId]
      );
  
      resource.is_liked = likeResult.rows.length > 0;
  
      // Format dates
      resource.created_at_formatted = new Date(resource.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
  
      // Parse tags if they exist
      if (resource.tags) {
        try {
          if (typeof resource.tags === 'string') {
            resource.tags = JSON.parse(resource.tags);
          }
        } catch (e) {
          resource.tags = resource.tags.split(',').map(tag => tag.trim());
        }
      } else {
        resource.tags = [];
      }
  
      // Get related resources
      const relatedResult = await db.query(
        `SELECT r.*, u.name as creator_name, u.profile_pic as creator_pic,
          (SELECT COUNT(*) FROM resource_likes WHERE resource_id = r.resource_id) as like_count
         FROM resources r
         JOIN users u ON r.creator_id = u.user_id
         WHERE r.category = $1 AND r.resource_id != $2
         ORDER BY r.created_at DESC
         LIMIT 3`,
        [resource.category, resourceId]
      );
  
      const relatedResources = relatedResult.rows.map(related => ({
        ...related,
        created_at_formatted: new Date(related.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }));
  
      res.render("resource-details", {
        title: resource.title,
        currentPage: "resources",
        user: req.session.user,
        resource,
        relatedResources,
        error: req.query.error || null,
        success: req.query.success || null
      });
    } catch (error) {
      console.error("Error fetching resource details:", error);
      res.status(500).render("error", {
        user: req.session.user,
        error: "Failed to load resource details. Please try again later.",
        title: "Error",
        currentPage: 'resources'
      });
    }
  });
  
  // Helper function to get event color based on type and status
  function getEventColor(type, status) {
    const colors = {
      project: {
        'Open': '#4CAF50',
        'In Progress': '#2196F3',
        'Completed': '#9E9E9E',
        'default': '#673AB7'
      },
      task: {
        'To Do': '#FF9800',
        'In Progress': '#03A9F4',
        'Completed': '#8BC34A',
        'default': '#FF5722'
      },
      meeting: {
        'default': '#E91E63'
      }
    };
  
    return colors[type][status] || colors[type]['default'];
  }
  
export default router;