const admin = require('../config/firebase');

class Notification {
  constructor() {
    this.db = admin.firestore();
    this.collection = this.db.collection('notifications');
  }

  // Create a new notification
  async create(notificationData) {
    try {
      const docRef = this.collection.doc();
      const notification = {
        id: docRef.id,
        ...notificationData,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await docRef.set(notification);
      console.log(`📢 Notification created: ${notification.type} for user ${notification.userId}`);
      return { id: docRef.id, ...notification };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for a user
  async getByUser(userId, filters = {}) {
    try {
      let query = this.collection.where('userId', '==', userId);
      
      if (filters.isRead !== undefined) {
        query = query.where('isRead', '==', filters.isRead);
      }
      
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(filters.limit || 50)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notificationRef = this.collection.doc(notificationId);
      const notification = await notificationRef.get();
      
      if (!notification.exists) {
        throw new Error('Notification not found');
      }
      
      const notificationData = notification.data();
      if (notificationData.userId !== userId) {
        throw new Error('Unauthorized access to notification');
      }

      await notificationRef.update({
        isRead: true,
        readAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId, type = null) {
    try {
      let query = this.collection
        .where('userId', '==', userId)
        .where('isRead', '==', false);
        
      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.get();
      
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`📖 Marked ${snapshot.size} notifications as read for user ${userId}`);
      return snapshot.size;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async delete(notificationId, userId) {
    try {
      const notificationRef = this.collection.doc(notificationId);
      const notification = await notificationRef.get();
      
      if (!notification.exists) {
        throw new Error('Notification not found');
      }
      
      const notificationData = notification.data();
      if (notificationData.userId !== userId) {
        throw new Error('Unauthorized access to notification');
      }

      await notificationRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Get unread count for user
  async getUnreadCount(userId, type = null) {
    try {
      let query = this.collection
        .where('userId', '==', userId)
        .where('isRead', '==', false);
        
      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.get();
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Clean up old notifications (older than 30 days)
  async cleanup(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const snapshot = await this.collection
        .where('createdAt', '<', cutoffDate)
        .limit(100) // Process in batches
        .get();

      if (snapshot.empty) {
        console.log('No old notifications to clean up');
        return 0;
      }

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`🗑️ Cleaned up ${snapshot.size} old notifications`);
      return snapshot.size;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      throw error;
    }
  }

  // ============================================================================
  // Notification Templates
  // ============================================================================

  // Project application notification
  async createProjectApplicationNotification(projectOwnerId, applicantName, projectTitle, applicationId) {
    return this.create({
      userId: projectOwnerId,
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

  // Application status update notification
  async createApplicationStatusNotification(applicantId, projectTitle, status, projectId) {
    const statusMessages = {
      accepted: 'Your application has been accepted!',
      rejected: 'Your application was not accepted this time.'
    };

    return this.create({
      userId: applicantId,
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

  // Team member joined notification
  async createTeamMemberJoinedNotification(projectOwnerId, memberName, projectTitle, projectId) {
    return this.create({
      userId: projectOwnerId,
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

  // Project status update notification
  async createProjectStatusNotification(userId, projectTitle, newStatus, projectId) {
    const statusMessages = {
      'in-progress': 'Your project is now in progress',
      'completed': 'Your project has been completed',
      'archived': 'Your project has been archived'
    };

    return this.create({
      userId,
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

  // Project deadline reminder notification
  async createDeadlineReminderNotification(userId, projectTitle, deadline, projectId) {
    return this.create({
      userId,
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

  // Skill endorsement notification
  async createSkillEndorsementNotification(userId, endorserName, skillName) {
    return this.create({
      userId,
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

  // System notification (announcements, maintenance, etc.)
  async createSystemNotification(userIds, title, message, priority = 'normal') {
    try {
      const notifications = [];
      
      // Create notifications for multiple users
      for (const userId of userIds) {
        const notification = await this.create({
          userId,
          type: 'system',
          title,
          message,
          data: {
            systemAnnouncement: true
          },
          priority
        });
        notifications.push(notification);
      }
      
      return notifications;
    } catch (error) {
      console.error('Error creating system notifications:', error);
      throw error;
    }
  }

  // Bulk notification creation
  async createBulk(notificationsData) {
    try {
      const batch = this.db.batch();
      const notifications = [];

      notificationsData.forEach(data => {
        const docRef = this.collection.doc();
        const notification = {
          id: docRef.id,
          ...data,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        batch.set(docRef, notification);
        notifications.push({ id: docRef.id, ...notification });
      });

      await batch.commit();
      console.log(`📢 Created ${notifications.length} bulk notifications`);
      return notifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }
}

module.exports = new Notification();