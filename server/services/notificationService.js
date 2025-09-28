const Notification = require('../models/Notification');

class NotificationService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
  }

  // Initialize with Socket.IO instance
  initialize(io) {
    this.io = io;
    console.log('📡 Notification service initialized');
    
    // Set up Socket.IO event handlers
    this.setupSocketHandlers();
  }

  // Set up Socket.IO event handlers
  setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      // Handle user authentication/registration
      socket.on('authenticate', (userId) => {
        if (userId) {
          this.connectedUsers.set(userId, socket.id);
          socket.userId = userId;
          socket.join(`user_${userId}`); // Join user-specific room
          console.log(`👤 User ${userId} authenticated on socket ${socket.id}`);
          
          // Send initial unread count
          this.sendUnreadCount(userId);
        }
      });

      // Handle notification mark as read
      socket.on('mark_notification_read', async (notificationId) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          await Notification.markAsRead(notificationId, socket.userId);
          
          // Send updated unread count
          this.sendUnreadCount(socket.userId);
          
          socket.emit('notification_marked_read', { notificationId });
        } catch (error) {
          console.error('Error marking notification as read:', error);
          socket.emit('error', { message: 'Failed to mark notification as read' });
        }
      });

      // Handle mark all as read
      socket.on('mark_all_notifications_read', async (type) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          const count = await Notification.markAllAsRead(socket.userId, type);
          
          // Send updated unread count
          this.sendUnreadCount(socket.userId);
          
          socket.emit('all_notifications_marked_read', { count, type });
        } catch (error) {
          console.error('Error marking all notifications as read:', error);
          socket.emit('error', { message: 'Failed to mark notifications as read' });
        }
      });

      // Handle get notifications
      socket.on('get_notifications', async (filters) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          const notifications = await Notification.getByUser(socket.userId, filters);
          socket.emit('notifications_list', { notifications, filters });
        } catch (error) {
          console.error('Error getting notifications:', error);
          socket.emit('error', { message: 'Failed to get notifications' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          console.log(`👋 User ${socket.userId} disconnected from socket ${socket.id}`);
        } else {
          console.log(`🔌 Socket disconnected: ${socket.id}`);
        }
      });
    });
  }

  // Send real-time notification to user
  async sendToUser(userId, notificationData) {
    try {
      // Create notification in database
      const notification = await Notification.create({
        userId,
        ...notificationData
      });

      // Send real-time notification if user is connected
      if (this.io) {
        this.io.to(`user_${userId}`).emit('new_notification', notification);
        console.log(`🔔 Real-time notification sent to user ${userId}: ${notification.type}`);
        
        // Also send updated unread count
        this.sendUnreadCount(userId);
      }

      return notification;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw error;
    }
  }

  // Send unread count to user
  async sendUnreadCount(userId) {
    try {
      if (!this.io) return;

      const unreadCount = await Notification.getUnreadCount(userId);
      this.io.to(`user_${userId}`).emit('unread_count_update', { count: unreadCount });
    } catch (error) {
      console.error('Error sending unread count:', error);
    }
  }

  // Send bulk notifications to multiple users
  async sendBulkNotifications(notifications) {
    try {
      if (!Array.isArray(notifications) || notifications.length === 0) {
        throw new Error('Invalid notifications array');
      }

      // Create notifications in database
      const createdNotifications = await Notification.createBulk(notifications);

      // Send real-time notifications
      if (this.io) {
        for (const notification of createdNotifications) {
          this.io.to(`user_${notification.userId}`).emit('new_notification', notification);
          // Update unread count for each user
          this.sendUnreadCount(notification.userId);
        }
      }

      console.log(`📢 Sent ${createdNotifications.length} bulk notifications`);
      return createdNotifications;
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  // ============================================================================
  // Template notification methods
  // ============================================================================

  async notifyProjectApplication(projectOwnerId, applicantName, projectTitle, applicationId) {
    return this.sendToUser(projectOwnerId, {
      type: 'project_application',
      title: 'New Project Application',
      message: `${applicantName} applied to join "${projectTitle}"`,
      data: {
        applicationId,
        applicantName,
        projectTitle
      },
      actionUrl: `/dashboard/applications/${applicationId}`,
      priority: 'high'
    });
  }

  async notifyApplicationStatus(applicantId, projectTitle, status, projectId) {
    const statusMessages = {
      accepted: 'Your application has been accepted!',
      rejected: 'Your application was not accepted this time.'
    };

    return this.sendToUser(applicantId, {
      type: 'application_status',
      title: `Application ${status === 'accepted' ? 'Accepted' : 'Update'}`,
      message: `${statusMessages[status]} Project: "${projectTitle}"`,
      data: {
        projectId,
        projectTitle,
        status
      },
      actionUrl: `/dashboard/projects/${projectId}`,
      priority: status === 'accepted' ? 'high' : 'normal'
    });
  }

  async notifyTeamMemberJoined(projectOwnerId, memberName, projectTitle, projectId) {
    return this.sendToUser(projectOwnerId, {
      type: 'team_update',
      title: 'New Team Member',
      message: `${memberName} joined your project "${projectTitle}"`,
      data: {
        projectId,
        projectTitle,
        memberName,
        action: 'joined'
      },
      actionUrl: `/dashboard/projects/${projectId}`,
      priority: 'normal'
    });
  }

  async notifyProjectStatusUpdate(userId, projectTitle, newStatus, projectId) {
    const statusMessages = {
      'in-progress': 'Your project is now in progress',
      'completed': 'Your project has been completed',
      'archived': 'Your project has been archived'
    };

    return this.sendToUser(userId, {
      type: 'project_update',
      title: 'Project Status Update',
      message: `${statusMessages[newStatus]}: "${projectTitle}"`,
      data: {
        projectId,
        projectTitle,
        newStatus
      },
      actionUrl: `/dashboard/projects/${projectId}`,
      priority: 'normal'
    });
  }

  async notifyDeadlineReminder(userId, projectTitle, deadline, projectId) {
    return this.sendToUser(userId, {
      type: 'reminder',
      title: 'Project Deadline Reminder',
      message: `Don't forget: "${projectTitle}" deadline is approaching (${deadline})`,
      data: {
        projectId,
        projectTitle,
        deadline
      },
      actionUrl: `/dashboard/projects/${projectId}`,
      priority: 'high'
    });
  }

  async notifySkillEndorsement(userId, endorserName, skillName) {
    return this.sendToUser(userId, {
      type: 'skill_endorsement',
      title: 'New Skill Endorsement',
      message: `${endorserName} endorsed your ${skillName} skills`,
      data: {
        endorserName,
        skillName
      },
      actionUrl: '/dashboard/profile',
      priority: 'normal'
    });
  }

  async notifySystemAnnouncement(userIds, title, message, priority = 'normal') {
    const notifications = userIds.map(userId => ({
      userId,
      type: 'system',
      title,
      message,
      data: {
        systemAnnouncement: true
      },
      priority
    }));

    return this.sendBulkNotifications(notifications);
  }

  // ============================================================================
  // Utility methods
  // ============================================================================

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Get all connected user IDs
  getConnectedUserIds() {
    return Array.from(this.connectedUsers.keys());
  }

  // Send custom real-time event to user
  sendCustomEvent(userId, eventName, data) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(eventName, data);
    }
  }

  // Send custom real-time event to all connected users
  broadcastToAll(eventName, data) {
    if (this.io) {
      this.io.emit(eventName, data);
    }
  }

  // Send typing indicators for chat-like features
  sendTypingIndicator(userId, projectId, isTyping = true) {
    if (this.io) {
      this.io.to(`project_${projectId}`).emit('typing_indicator', {
        userId,
        isTyping,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Join user to project-specific room for project updates
  joinProjectRoom(userId, projectId) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId && this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(`project_${projectId}`);
        console.log(`👥 User ${userId} joined project room: project_${projectId}`);
      }
    }
  }

  // Leave project room
  leaveProjectRoom(userId, projectId) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId && this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(`project_${projectId}`);
        console.log(`👋 User ${userId} left project room: project_${projectId}`);
      }
    }
  }

  // Send update to all members of a project
  sendToProjectMembers(projectId, eventName, data) {
    if (this.io) {
      this.io.to(`project_${projectId}`).emit(eventName, data);
    }
  }
}

module.exports = new NotificationService();