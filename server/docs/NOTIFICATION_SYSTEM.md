# Real-Time Notification System

## Overview

The Inspira-Grid platform now includes a comprehensive real-time notification system that keeps users informed about project activities, application updates, deadlines, and system announcements. The system is built using Socket.IO for real-time communication and Firebase Firestore for persistent storage.

## Architecture

### Core Components

1. **Notification Model** (`models/Notification.js`)
   - Manages notification data in Firestore
   - Provides CRUD operations and query methods
   - Includes template methods for common notification types

2. **Notification Service** (`services/notificationService.js`)
   - Handles real-time Socket.IO communication
   - Provides template methods for different notification types
   - Manages user connections and rooms

3. **Notification Scheduler** (`services/notificationScheduler.js`)
   - Automated background tasks using node-cron
   - Deadline reminders, cleanup, and system maintenance
   - Manual trigger capabilities for admin users

4. **API Routes** (`routes/notifications.js`)
   - RESTful endpoints for notification management
   - Admin endpoints for system notifications
   - Statistics and analytics endpoints

## Features

### Real-Time Notifications
- **Instant Delivery**: Notifications are delivered instantly to connected users via Socket.IO
- **Unread Count Updates**: Real-time badge updates for unread notifications
- **User-Specific Rooms**: Each user joins their own room for targeted notifications

### Notification Types
- **Project Applications**: When users apply to projects
- **Application Status**: When applications are accepted/rejected
- **Team Updates**: When new members join projects
- **Project Updates**: Status changes and reminders
- **Deadline Reminders**: Automated alerts for approaching deadlines
- **Skill Endorsements**: Social features and networking
- **System Announcements**: Platform-wide communications

### Automated Scheduling
- **Daily Deadline Checks** (9:00 AM): Sends reminders 7, 3, and 1 day(s) before deadlines
- **Weekly Cleanup** (Sunday 2:00 AM): Removes notifications older than 30 days
- **Monthly Skill Reminders** (1st at 10:00 AM): Encourages skill endorsements
- **Weekly Project Updates** (Wednesday 2:00 PM): Reminds about stale projects

### Management Features
- **Read/Unread Status**: Mark individual or all notifications as read
- **Filtering**: Filter by type, read status, date ranges
- **Pagination**: Efficient loading of large notification lists
- **Statistics**: Analytics on notification engagement
- **Admin Controls**: System-wide notifications and manual job triggers

## API Endpoints

### User Endpoints
```
GET    /api/notifications           - Get user notifications (paginated, filtered)
GET    /api/notifications/unread-count  - Get unread count
GET    /api/notifications/stats    - Get notification statistics
PATCH  /api/notifications/:id/read - Mark notification as read
PATCH  /api/notifications/read-all - Mark all notifications as read
DELETE /api/notifications/:id      - Delete notification
POST   /api/notifications/test     - Send test notification (development)
```

### Admin Endpoints
```
POST   /api/notifications/system/broadcast - Send system-wide notifications
GET    /api/notifications/scheduler/status - Get scheduler status
POST   /api/notifications/scheduler/trigger/:job - Manually trigger scheduled jobs
```

## Socket.IO Events

### Client → Server
- `authenticate` - Authenticate user and join their room
- `mark_notification_read` - Mark a notification as read
- `mark_all_notifications_read` - Mark all notifications as read
- `get_notifications` - Retrieve notifications with filters

### Server → Client
- `new_notification` - Real-time notification delivery
- `unread_count_update` - Updated unread count
- `notification_marked_read` - Confirmation of read status
- `all_notifications_marked_read` - Confirmation of bulk read
- `notifications_list` - Notification list response

## Integration Points

### Application Workflow
When a user applies to a project:
1. Application is created in the database
2. Notification is sent to project owner
3. Real-time update delivered via Socket.IO
4. Unread count updated in real-time

### Status Updates
When an application status changes:
1. Status updated in database
2. Notification sent to applicant
3. If accepted, additional team notification sent to project owner
4. Real-time updates delivered to all relevant users

### Deadline Management
The scheduler automatically:
1. Checks all active projects daily
2. Calculates days until deadline
3. Sends reminders at 7, 3, and 1 day intervals
4. Notifies both project owners and team members

## Configuration

### Environment Variables
```env
# Socket.IO CORS settings
CLIENT_URL=http://localhost:3000

# Firebase configuration (handled by existing setup)
```

### Cron Schedule
The notification scheduler uses standard cron expressions:
- `0 9 * * *` - Daily deadline check at 9:00 AM
- `0 2 * * 0` - Weekly cleanup on Sunday at 2:00 AM
- `0 10 1 * *` - Monthly skill reminders on the 1st at 10:00 AM
- `0 14 * * 3` - Weekly project updates on Wednesday at 2:00 PM

## Database Schema

### Notification Document Structure
```javascript
{
  id: "auto-generated",
  userId: "recipient-user-id",
  type: "notification-type",
  title: "Notification Title",
  message: "Notification message",
  data: {
    // Type-specific data
    projectId: "related-project-id",
    applicationId: "related-application-id"
  },
  actionUrl: "/path/to/relevant/page",
  priority: "low|normal|high",
  isRead: false,
  createdAt: "timestamp",
  updatedAt: "timestamp",
  readAt: "timestamp" // when marked as read
}
```

## Development and Testing

### Testing Notifications
Use the test endpoint to send sample notifications:
```bash
POST /api/notifications/test
{
  "type": "system",
  "title": "Test Notification",
  "message": "This is a test notification",
  "priority": "normal"
}
```

### Monitoring
Check system status:
```bash
GET /api/notifications/scheduler/status
```

### Manual Job Triggers
Trigger scheduled jobs manually (admin only):
```bash
POST /api/notifications/scheduler/trigger/deadlines
POST /api/notifications/scheduler/trigger/cleanup
POST /api/notifications/scheduler/trigger/skill-reminders
POST /api/notifications/scheduler/trigger/project-updates
```

## Performance Considerations

### Scalability
- **Connection Management**: Socket.IO automatically handles connection pooling
- **Database Queries**: Indexes should be created for common query patterns
- **Memory Usage**: Connected user mapping is stored in memory for fast lookups

### Optimizations
- **Batch Processing**: Bulk notifications use Firestore batch operations
- **Caching**: Consider implementing Redis for session storage in production
- **Rate Limiting**: Built-in rate limiting prevents notification spam

## Security

### Authentication
- All Socket.IO events require user authentication
- API endpoints protected with Firebase Auth middleware
- Admin endpoints should include proper role-based access control

### Data Protection
- Notifications are user-specific and access-controlled
- Sensitive data is not included in notification payloads
- All database operations include user authorization checks

## Future Enhancements

### Planned Features
- **Email Notifications**: Integration with email service providers
- **Push Notifications**: Web push API for browser notifications
- **Notification Preferences**: User-configurable notification settings
- **Rich Notifications**: Support for images, buttons, and actions
- **Analytics Dashboard**: Detailed notification engagement metrics

### Integration Opportunities
- **Project Management**: Integration with task and milestone systems
- **Social Features**: Enhanced community notifications
- **Mobile App**: React Native app with push notification support
- **Third-Party Services**: Slack, Discord, or Teams integration

## Troubleshooting

### Common Issues
1. **Socket.IO Connection Failures**: Check CORS configuration and client URL
2. **Missing Notifications**: Verify user authentication and room joining
3. **Scheduler Not Running**: Check cron job status and server logs
4. **Database Errors**: Verify Firestore indexes and permissions

### Debugging
- Enable debug logging with `DEBUG=socket.io:*`
- Check scheduler status via the API endpoint
- Monitor Firestore usage and query performance
- Use browser developer tools to inspect Socket.IO connections

## Support

For issues or questions about the notification system, please:
1. Check the server logs for error messages
2. Verify all dependencies are installed (`node-cron`, `socket.io`)
3. Test with the provided development endpoints
4. Review Firebase Firestore rules and indexes