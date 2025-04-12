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

// Get notifications
router.get("/notifications", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Get user information
    const userResult = await db.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    const user = userResult.rows[0];

    // Get notifications
    const notificationsResult = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    // Process notifications
    const notifications = notificationsResult.rows.map(notification => ({
      ...notification,
      created_at_formatted: new Date(notification.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      icon: getNotificationIcon(notification.type)
    }));

    // Group notifications by date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groupedNotifications = {
      today: [],
      yesterday: [],
      earlier: []
    };

    notifications.forEach(notification => {
      const notifDate = new Date(notification.created_at);
      
      if (notifDate.toDateString() === today.toDateString()) {
        groupedNotifications.today.push(notification);
      } else if (notifDate.toDateString() === yesterday.toDateString()) {
        groupedNotifications.yesterday.push(notification);
      } else {
        groupedNotifications.earlier.push(notification);
      }
    });

    res.render("notifications", {
      title: "Notifications",
      currentPage: "notifications",
      user,
      notifications,
      groupedNotifications,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).render("error", {
      user: req.session.user,
      error: "Failed to load notifications. Please try again later.",
      title: "Error",
      currentPage: 'notifications'
    });
  }
});

// Mark notification as read
router.post("/notifications/:id/read", isAuthenticated, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.session.user_id;

    // Check if notification belongs to user
    const notificationResult = await db.query(
      "SELECT * FROM notifications WHERE notification_id = $1 AND user_id = $2",
      [notificationId, userId]
    );

    if (notificationResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Notification not found or access denied"
      });
    }

    // Mark notification as read
    await db.query(
      "UPDATE notifications SET is_read = true WHERE notification_id = $1",
      [notificationId]
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read"
    });
  }
});

// Mark all notifications as read
router.post("/notifications/read-all", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Mark all notifications as read
    await db.query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read"
    });
  }
});

// Get unread notification count
router.get("/notifications/count", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Get unread notification count
    const countResult = await db.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false",
      [userId]
    );

    const count = parseInt(countResult.rows[0].count);

    return res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    console.error("Error getting notification count:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get notification count",
      count: 0
    });
  }
});

// Helper function to get notification icon
function getNotificationIcon(type) {
  const icons = {
    'project_application': 'fas fa-paper-plane',
    'application_update': 'fas fa-clipboard-check',
    'team_added': 'fas fa-users',
    'team_removed': 'fas fa-user-minus',
    'project_update': 'fas fa-project-diagram',
    'task_assigned': 'fas fa-tasks',
    'comment_added': 'fas fa-comment',
    'meeting_scheduled': 'fas fa-calendar-alt',
    'default': 'fas fa-bell'
  };

  return icons[type] || icons.default;
}

export default router;