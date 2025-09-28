const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { requireAuth, createRateLimit } = require('../middleware/auth');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');
const notificationScheduler = require('../services/notificationScheduler');

const router = express.Router();

// Rate limiting for notification operations
const notificationLimit = createRateLimit(60 * 1000, 100); // 100 requests per minute

// Get all notifications for current user
router.get('/', [
  requireAuth,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('unreadOnly').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';
    const type = req.query.type;

    const filters = { limit };
    if (unreadOnly) {
      filters.isRead = false;
    }
    if (type) {
      filters.type = type;
    }

    const notifications = await Notification.getByUser(req.user.uid, filters);
    
    // Simple pagination (for more advanced pagination, you'd need to implement it in the model)
    const totalCount = notifications.length;
    const startIndex = (page - 1) * limit;
    const paginatedNotifications = notifications.slice(startIndex, startIndex + limit);

    res.json({
      notifications: paginatedNotifications,
      pagination: {
        currentPage: page,
        totalNotifications: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: (page * limit) < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

// Get unread notification count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.uid);

    res.json({
      count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      error: 'Failed to get unread count',
      message: error.message
    });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', [
  requireAuth,
  notificationLimit,
  param('notificationId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { notificationId } = req.params;

    await Notification.markAsRead(notificationId, req.user.uid);

    res.json({
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

// Mark all notifications as read
router.patch('/read-all', [
  requireAuth,
  notificationLimit
], async (req, res) => {
  try {
    const count = await Notification.markAllAsRead(req.user.uid);

    res.json({
      message: `${count} notifications marked as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: error.message
    });
  }
});

// Delete notification
router.delete('/:notificationId', [
  requireAuth,
  param('notificationId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { notificationId } = req.params;

    // Check if notification exists and belongs to user
    const notificationDoc = await db.collection('notifications').doc(notificationId).get();
    if (!notificationDoc.exists) {
      return res.status(404).json({
        error: 'Notification not found'
      });
    }

    const notification = notificationDoc.data();
    if (notification.userId !== req.user.uid) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Delete notification
    await db.collection('notifications').doc(notificationId).delete();

    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      message: error.message
    });
  }
});

// Create notification (internal use - for system notifications)
router.post('/', [
  requireAuth,
  notificationLimit,
  body('userId').isString().notEmpty(),
  body('type').isIn(['project_application', 'application_accepted', 'application_rejected', 'project_approved', 'project_rejected', 'team_invitation', 'message', 'system']),
  body('title').trim().isLength({ min: 1, max: 100 }),
  body('message').trim().isLength({ min: 1, max: 500 }),
  body('data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Users can only create notifications for themselves
    if (req.body.userId !== req.user.uid) {
      return res.status(403).json({
        error: 'You can only create notifications for yourself'
      });
    }

    const notificationData = {
      userId: req.body.userId,
      type: req.body.type,
      title: req.body.title.trim(),
      message: req.body.message.trim(),
      data: req.body.data || {},
      isRead: false,
      createdAt: new Date(),
      createdBy: req.user.uid
    };

    const notificationRef = await db.collection('notifications').add(notificationData);

    res.status(201).json({
      message: 'Notification created successfully',
      notification: {
        id: notificationRef.id,
        ...notificationData
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      error: 'Failed to create notification',
      message: error.message
    });
  }
});

// Get notification statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.uid;

    const [totalCount, unreadCount, byType] = await Promise.all([
      Notification.getByUser(userId).then(notifications => notifications.length),
      Notification.getUnreadCount(userId),
      Promise.all([
        Notification.getUnreadCount(userId, 'project_application'),
        Notification.getUnreadCount(userId, 'application_status'),
        Notification.getUnreadCount(userId, 'team_update'),
        Notification.getUnreadCount(userId, 'project_update'),
        Notification.getUnreadCount(userId, 'reminder'),
        Notification.getUnreadCount(userId, 'skill_endorsement'),
        Notification.getUnreadCount(userId, 'system')
      ])
    ]);

    res.json({
      total: totalCount,
      unread: unreadCount,
      byType: {
        project_application: byType[0],
        application_status: byType[1],
        team_update: byType[2],
        project_update: byType[3],
        reminder: byType[4],
        skill_endorsement: byType[5],
        system: byType[6]
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      error: 'Failed to fetch notification statistics',
      message: error.message
    });
  }
});

// Send test notification (for development/testing)
router.post('/test', [
  requireAuth,
  body('type').optional().isIn(['project_application', 'application_status', 'team_update', 'project_update', 'reminder', 'skill_endorsement', 'system']),
  body('title').trim().isLength({ min: 1, max: 100 }),
  body('message').trim().isLength({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { type = 'system', title, message, priority = 'normal' } = req.body;

    const notification = await notificationService.sendToUser(req.user.uid, {
      type,
      title,
      message,
      priority,
      data: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      message: 'Test notification sent successfully',
      notification
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      error: 'Failed to send test notification',
      message: error.message
    });
  }
});

// System notification endpoints (for admin use)
router.post('/system/broadcast', [
  requireAuth,
  body('title').trim().isLength({ min: 1, max: 100 }),
  body('message').trim().isLength({ min: 1, max: 500 }),
  body('priority').optional().isIn(['low', 'normal', 'high']),
  body('userIds').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Note: Add proper admin check here in a real application
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    const { title, message, priority = 'normal', userIds } = req.body;
    
    let targetUsers = userIds;
    if (!targetUsers || targetUsers.length === 0) {
      // Use connected users as fallback
      targetUsers = notificationService.getConnectedUserIds();
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({
        error: 'No users to send notifications to'
      });
    }

    const notifications = await notificationService.notifySystemAnnouncement(
      targetUsers,
      title,
      message,
      priority
    );

    res.json({
      message: 'System notifications sent successfully',
      count: notifications.length,
      notifications: notifications.slice(0, 3) // Return first 3 as sample
    });
  } catch (error) {
    console.error('Error sending system notifications:', error);
    res.status(500).json({
      error: 'Failed to send system notifications',
      message: error.message
    });
  }
});

// Get notification scheduler status (admin endpoint)
router.get('/scheduler/status', requireAuth, async (req, res) => {
  try {
    const status = notificationScheduler.getStatus();
    
    res.json({
      scheduler: status,
      service: {
        connectedUsers: notificationService.getConnectedUsersCount(),
        isInitialized: !!notificationService.io
      }
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      error: 'Failed to get scheduler status',
      message: error.message
    });
  }
});

// Manual trigger scheduler jobs (admin endpoint)
router.post('/scheduler/trigger/:job', [
  requireAuth,
  param('job').isIn(['deadlines', 'cleanup', 'skill-reminders', 'project-updates'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Note: Add proper admin check here in a real application
    const { job } = req.params;
    
    switch (job) {
      case 'deadlines':
        await notificationScheduler.manualDeadlineCheck();
        break;
      case 'cleanup':
        await notificationScheduler.manualCleanup();
        break;
      case 'skill-reminders':
        await notificationScheduler.manualSkillReminders();
        break;
      case 'project-updates':
        await notificationScheduler.manualProjectUpdateReminders();
        break;
    }

    res.json({
      message: `Successfully triggered ${job} job`
    });
  } catch (error) {
    console.error('Error triggering scheduler job:', error);
    res.status(500).json({
      error: 'Failed to trigger scheduler job',
      message: error.message
    });
  }
});

// Helper function to create system notifications (exported for use in other modules)
const createNotification = async (notificationData) => {
  return await Notification.create(notificationData);
};

// Bulk create notifications (for system use)
const createBulkNotifications = async (notifications) => {
  return await Notification.createBulk(notifications);
};

module.exports = {
  router,
  createNotification,
  createBulkNotifications
};