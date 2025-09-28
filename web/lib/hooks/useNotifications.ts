import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useSocket } from '@/lib/SocketContext';
import { apiClient } from '@/lib/api';

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: 'project_application' | 'application_status' | 'team_update' | 'project_update' | 'reminder' | 'skill_endorsement' | 'system';
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
  priority: 'low' | 'normal' | 'high';
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    project_application: number;
    application_status: number;
    team_update: number;
    project_update: number;
    reminder: number;
    skill_endorsement: number;
    system: number;
  };
}

export interface UseNotificationsReturn {
  // State
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats | null;
  loading: {
    notifications: boolean;
    stats: boolean;
    markingRead: boolean;
  };
  
  // Actions
  actions: {
    loadNotifications: (filters?: NotificationFilters) => Promise<void>;
    loadStats: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: (type?: string) => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;
    sendTestNotification: (title: string, message: string, type?: string) => Promise<void>;
  };
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: string;
  limit?: number;
  page?: number;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { currentUser } = useAuth();
  const { socket, isConnected } = useSocket();
  
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState({
    notifications: false,
    stats: false,
    markingRead: false
  });

  // Load notifications from API
  const loadNotifications = useCallback(async (filters: NotificationFilters = {}) => {
    if (!currentUser) return;

    try {
      setLoading(prev => ({ ...prev, notifications: true }));
      
      const params = new URLSearchParams();
      if (filters.isRead !== undefined) params.append('unreadOnly', (!filters.isRead).toString());
      if (filters.type) params.append('type', filters.type);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.page) params.append('page', filters.page.toString());

      const response = await apiClient.get<{ notifications: Notification[] }>(`/api/notifications?${params}`);
      
      if (response.notifications) {
        setNotifications(response.notifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(prev => ({ ...prev, notifications: false }));
    }
  }, [currentUser]);

  // Load notification statistics
  const loadStats = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(prev => ({ ...prev, stats: true }));
      
      const stats = await apiClient.get<NotificationStats>('/api/notifications/stats');
      
      setStats(stats);
      setUnreadCount(stats.unread);
    } catch (error) {
      console.error('Failed to load notification stats:', error);
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, [currentUser]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!currentUser) return;

    try {
      setLoading(prev => ({ ...prev, markingRead: true }));
      
      await apiClient.patch(`/api/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setLoading(prev => ({ ...prev, markingRead: false }));
    }
  }, [currentUser]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (type?: string) => {
    if (!currentUser) return;

    try {
      setLoading(prev => ({ ...prev, markingRead: true }));
      
      await apiClient.patch('/api/notifications/mark-all-read', { type });
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          (!type || notif.type === type)
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );
      
      // Update unread count
      const unreadToUpdate = notifications.filter(notif => 
        !notif.isRead && (!type || notif.type === type)
      ).length;
      setUnreadCount(prev => Math.max(0, prev - unreadToUpdate));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    } finally {
      setLoading(prev => ({ ...prev, markingRead: false }));
    }
  }, [currentUser, notifications]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!currentUser) return;

    try {
      await apiClient.delete(`/api/notifications/${notificationId}`);
      
      const deletedNotification = notifications.find(n => n.id === notificationId);
      
      // Update local state
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      // Update unread count if the deleted notification was unread
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [currentUser, notifications]);

  // Send test notification (for development)
  const sendTestNotification = useCallback(async (title: string, message: string, type: string = 'system') => {
    if (!currentUser) return;

    try {
      await apiClient.post('/api/notifications/test', {
        title,
        message,
        type,
        priority: 'normal'
      });
      
      console.log('Test notification sent successfully');
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  }, [currentUser]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected || !currentUser) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleUnreadCountUpdate = (data: { count: number }) => {
      setUnreadCount(data.count);
    };

    const handleNotificationMarkedRead = (data: { notificationId: string }) => {
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === data.notificationId
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );
    };

    const handleAllNotificationsMarkedRead = (data: { count: number; type?: string }) => {
      setNotifications(prev =>
        prev.map(notif =>
          (!data.type || notif.type === data.type)
            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
            : notif
        )
      );
    };

    // Register socket event listeners
    socket.on('new_notification', handleNewNotification);
    socket.on('unread_count_update', handleUnreadCountUpdate);
    socket.on('notification_marked_read', handleNotificationMarkedRead);
    socket.on('all_notifications_marked_read', handleAllNotificationsMarkedRead);

    // Cleanup
    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('unread_count_update', handleUnreadCountUpdate);
      socket.off('notification_marked_read', handleNotificationMarkedRead);
      socket.off('all_notifications_marked_read', handleAllNotificationsMarkedRead);
    };
  }, [socket, isConnected, currentUser]);

  // Load initial data
  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      loadStats();
    }
  }, [currentUser, loadNotifications, loadStats]);

  return {
    notifications,
    unreadCount,
    stats,
    loading,
    actions: {
      loadNotifications,
      loadStats,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      sendTestNotification,
    }
  };
};