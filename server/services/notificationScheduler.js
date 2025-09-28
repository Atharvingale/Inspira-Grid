const cron = require('node-cron');
const ProjectModel = require('../models/Project');
const notificationService = require('./notificationService');
const Notification = require('../models/Notification');

class NotificationScheduler {
  constructor() {
    this.jobs = new Map();
    this.isStarted = false;
  }

  // Start the scheduler
  start() {
    if (this.isStarted) {
      console.log('📅 Notification scheduler already running');
      return;
    }

    console.log('📅 Starting notification scheduler...');

    // Check for project deadlines daily at 9:00 AM
    this.jobs.set('dailyDeadlineCheck', cron.schedule('0 9 * * *', async () => {
      console.log('📅 Running daily deadline check...');
      await this.checkProjectDeadlines();
    }));

    // Clean up old notifications weekly on Sunday at 2:00 AM
    this.jobs.set('weeklyCleanup', cron.schedule('0 2 * * 0', async () => {
      console.log('🗑️ Running weekly notification cleanup...');
      await this.cleanupOldNotifications();
    }));

    // Send skill endorsement reminders monthly on the 1st at 10:00 AM
    this.jobs.set('monthlySkillReminders', cron.schedule('0 10 1 * *', async () => {
      console.log('💡 Running monthly skill endorsement reminders...');
      await this.sendSkillEndorsementReminders();
    }));

    // Send project update reminders for stale projects weekly on Wednesday at 2:00 PM
    this.jobs.set('weeklyProjectUpdateReminders', cron.schedule('0 14 * * 3', async () => {
      console.log('🚀 Running weekly project update reminders...');
      await this.sendProjectUpdateReminders();
    }));

    this.isStarted = true;
    console.log('✅ Notification scheduler started successfully');
  }

  // Stop the scheduler
  stop() {
    if (!this.isStarted) {
      console.log('📅 Notification scheduler is not running');
      return;
    }

    console.log('📅 Stopping notification scheduler...');

    // Destroy all cron jobs
    for (const [name, job] of this.jobs) {
      job.destroy();
      console.log(`  ❌ Stopped job: ${name}`);
    }

    this.jobs.clear();
    this.isStarted = false;
    console.log('✅ Notification scheduler stopped');
  }

  // Check for project deadlines and send reminders
  async checkProjectDeadlines() {
    try {
      // Get all active projects with deadlines
      const projects = await ProjectModel.getAll({
        status: ['approved', 'in-progress']
      });

      const today = new Date();
      const reminderThresholds = [
        { days: 7, sent: false }, // 1 week before
        { days: 3, sent: false }, // 3 days before
        { days: 1, sent: false }  // 1 day before
      ];

      for (const project of projects) {
        if (!project.deadline) continue;

        const deadline = new Date(project.deadline);
        const timeDiff = deadline.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        for (const threshold of reminderThresholds) {
          if (daysDiff === threshold.days) {
            // Check if we've already sent this reminder
            const existingReminder = await this.checkExistingDeadlineReminder(
              project.id,
              threshold.days
            );

            if (!existingReminder) {
              await this.sendDeadlineReminder(project, threshold.days);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking project deadlines:', error);
    }
  }

  // Send deadline reminder notification
  async sendDeadlineReminder(project, daysLeft) {
    try {
      const deadlineDate = new Date(project.deadline).toLocaleDateString();
      const urgencyLevel = daysLeft <= 1 ? 'urgent' : daysLeft <= 3 ? 'high' : 'normal';
      
      // Notify project owner
      await notificationService.notifyDeadlineReminder(
        project.ownerId,
        project.title,
        `${daysLeft} day${daysLeft > 1 ? 's' : ''} (${deadlineDate})`,
        project.id
      );

      // Notify all team members
      if (project.teamMembers && project.teamMembers.length > 0) {
        const teamNotifications = project.teamMembers.map(member => ({
          userId: member.userId,
          type: 'reminder',
          title: 'Project Deadline Reminder',
          message: `Project "${project.title}" deadline is in ${daysLeft} day${daysLeft > 1 ? 's' : ''} (${deadlineDate})`,
          data: {
            projectId: project.id,
            projectTitle: project.title,
            deadline: deadlineDate,
            daysLeft,
            urgencyLevel
          },
          actionUrl: `/dashboard/projects/${project.id}`,
          priority: urgencyLevel === 'urgent' ? 'high' : 'normal'
        }));

        await notificationService.sendBulkNotifications(teamNotifications);
      }

      console.log(`📅 Sent deadline reminder for project: ${project.title} (${daysLeft} days left)`);
    } catch (error) {
      console.error('Error sending deadline reminder:', error);
    }
  }

  // Check if we've already sent a deadline reminder
  async checkExistingDeadlineReminder(projectId, daysLeft) {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Check for existing reminder notifications sent in the last 24 hours
      // This is a simplified check - in a real app you might want to be more specific
      const notifications = await Notification.collection
        .where('type', '==', 'reminder')
        .where('data.projectId', '==', projectId)
        .where('data.daysLeft', '==', daysLeft)
        .where('createdAt', '>', yesterday)
        .limit(1)
        .get();

      return !notifications.empty;
    } catch (error) {
      console.error('Error checking existing deadline reminder:', error);
      return false;
    }
  }

  // Clean up old notifications
  async cleanupOldNotifications() {
    try {
      const cleanedCount = await Notification.cleanup(30); // Remove notifications older than 30 days
      console.log(`🗑️ Cleaned up ${cleanedCount} old notifications`);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }

  // Send skill endorsement reminders
  async sendSkillEndorsementReminders() {
    try {
      // Get connected users (active users)
      const connectedUsers = notificationService.getConnectedUserIds();
      
      if (connectedUsers.length === 0) {
        console.log('💡 No active users for skill endorsement reminders');
        return;
      }

      const reminderNotifications = connectedUsers.map(userId => ({
        userId,
        type: 'skill_endorsement',
        title: 'Skill Endorsement Reminder',
        message: 'Have you collaborated with anyone recently? Consider endorsing their skills to help them grow!',
        data: {
          monthlyReminder: true,
          reminderType: 'skill_endorsement'
        },
        actionUrl: '/dashboard/connections',
        priority: 'normal'
      }));

      await notificationService.sendBulkNotifications(reminderNotifications);
      console.log(`💡 Sent skill endorsement reminders to ${connectedUsers.length} users`);
    } catch (error) {
      console.error('Error sending skill endorsement reminders:', error);
    }
  }

  // Send project update reminders for stale projects
  async sendProjectUpdateReminders() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 14); // 2 weeks ago

      // Get projects that haven't been updated in 2 weeks and are still active
      const staleProjects = await ProjectModel.collection
        .where('status', 'in', ['approved', 'in-progress'])
        .where('updatedAt', '<', cutoffDate)
        .get();

      for (const projectDoc of staleProjects.docs) {
        const project = { id: projectDoc.id, ...projectDoc.data() };
        
        await notificationService.sendToUser(project.ownerId, {
          type: 'project_update',
          title: 'Project Update Reminder',
          message: `Your project "${project.title}" hasn't been updated in a while. Consider sharing progress with your team!`,
          data: {
            projectId: project.id,
            projectTitle: project.title,
            reminderType: 'stale_project',
            lastUpdated: project.updatedAt
          },
          actionUrl: `/dashboard/projects/${project.id}`,
          priority: 'normal'
        });
      }

      console.log(`🚀 Sent project update reminders for ${staleProjects.size} stale projects`);
    } catch (error) {
      console.error('Error sending project update reminders:', error);
    }
  }

  // Manual trigger methods for testing
  async manualDeadlineCheck() {
    console.log('🔧 Manual trigger: deadline check');
    await this.checkProjectDeadlines();
  }

  async manualCleanup() {
    console.log('🔧 Manual trigger: notification cleanup');
    await this.cleanupOldNotifications();
  }

  async manualSkillReminders() {
    console.log('🔧 Manual trigger: skill endorsement reminders');
    await this.sendSkillEndorsementReminders();
  }

  async manualProjectUpdateReminders() {
    console.log('🔧 Manual trigger: project update reminders');
    await this.sendProjectUpdateReminders();
  }

  // Get status of all scheduled jobs
  getStatus() {
    return {
      isStarted: this.isStarted,
      jobCount: this.jobs.size,
      jobs: Array.from(this.jobs.keys()),
      connectedUsers: notificationService.getConnectedUsersCount()
    };
  }
}

// Export singleton instance
module.exports = new NotificationScheduler();