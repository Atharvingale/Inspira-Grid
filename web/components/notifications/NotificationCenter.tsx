'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  BellOff, 
  X, 
  Check, 
  CheckCheck, 
  Trash2, 
  Filter,
  Settings,
  MessageSquare,
  Users,
  FolderOpen,
  Calendar,
  Star,
  AlertCircle,
  Info
} from 'lucide-react';
import { useNotifications, Notification } from '@/lib/hooks/useNotifications';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
// Removed non-existent UI imports
import { cn } from '@/lib/utils';

// Notification type icons
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'project_application':
      return <MessageSquare className="w-4 h-4" />;
    case 'application_status':
      return <Check className="w-4 h-4" />;
    case 'team_update':
      return <Users className="w-4 h-4" />;
    case 'project_update':
      return <FolderOpen className="w-4 h-4" />;
    case 'reminder':
      return <Calendar className="w-4 h-4" />;
    case 'skill_endorsement':
      return <Star className="w-4 h-4" />;
    case 'system':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

// Notification type colors
const getNotificationColor = (type: string, priority: string) => {
  if (priority === 'high') return 'text-red-500';
  
  switch (type) {
    case 'project_application':
      return 'text-blue-500';
    case 'application_status':
      return 'text-green-500';
    case 'team_update':
      return 'text-purple-500';
    case 'project_update':
      return 'text-yellow-500';
    case 'reminder':
      return 'text-orange-500';
    case 'skill_endorsement':
      return 'text-pink-500';
    case 'system':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
};

// Individual notification item
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete, 
  onClick 
}: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        'p-3 border-b border-dark-border/50 hover:bg-dark-surface/30 transition-colors cursor-pointer',
        !notification.isRead && 'bg-brand-primary/5 border-l-4 border-l-brand-primary'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(notification)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          'p-2 rounded-full bg-dark-surface/50',
          getNotificationColor(notification.type, notification.priority)
        )}>
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h4 className="font-medium text-sm text-text-primary truncate">
              {notification.title}
            </h4>
            <span className="text-xs text-text-tertiary ml-2">
              {formatTime(notification.createdAt)}
            </span>
          </div>
          
          <p className="text-sm text-text-secondary line-clamp-2 mb-2">
            {notification.message}
          </p>

          {/* Priority badge */}
          {notification.priority === 'high' && (
            <Badge variant="destructive" className="text-xs">
              High Priority
            </Badge>
          )}
        </div>

        {/* Actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1"
            >
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  title="Mark as read"
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                title="Delete notification"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Filter options
const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Applications', value: 'project_application' },
  { label: 'Status Updates', value: 'application_status' },
  { label: 'Team Updates', value: 'team_update' },
  { label: 'Project Updates', value: 'project_update' },
  { label: 'Reminders', value: 'reminder' },
  { label: 'Endorsements', value: 'skill_endorsement' },
  { label: 'System', value: 'system' }
];

// Main notification center component
interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({ className }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    stats,
    loading,
    actions
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showTestControls, setShowTestControls] = useState(false);

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.isRead;
    return notification.type === filter;
  });

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      actions.markAsRead(notification.id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }

    setIsOpen(false);
  };

  // Send test notification
  const sendTestNotification = () => {
    const testTypes = ['project_application', 'application_status', 'team_update', 'system'];
    const randomType = testTypes[Math.floor(Math.random() * testTypes.length)];
    
    actions.sendTestNotification(
      'Test Notification',
      `This is a test ${randomType.replace('_', ' ')} notification sent at ${new Date().toLocaleTimeString()}`,
      randomType
    );
  };

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-8 w-8 p-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        {unreadCount > 0 ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-96 bg-dark-card/95 backdrop-blur-sm border border-dark-border/50 rounded-lg shadow-lg z-50">
          {/* Click outside to close */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          {/* Header */}
          <div className="p-4 border-b border-dark-border/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text-primary">Notifications</h3>
              <div className="flex items-center gap-2">
                {/* Test controls toggle (development) */}
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setShowTestControls(!showTestControls)}
                    title="Developer tools"
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                )}
                
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => actions.markAllAsRead()}
                    title="Mark all as read"
                    disabled={loading.markingRead}
                  >
                    <CheckCheck className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="text-sm text-text-secondary mb-3">
                {stats.unread} unread of {stats.total} total
              </div>
            )}

            {/* Test controls (development only) */}
            {showTestControls && process.env.NODE_ENV === 'development' && (
              <div className="mb-3 p-2 bg-dark-surface/30 rounded">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestNotification}
                  className="w-full"
                >
                  Send Test Notification
                </Button>
              </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-tertiary" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="flex-1 bg-dark-surface/50 border border-dark-border/50 rounded px-2 py-1 text-sm text-text-primary"
              >
                {FILTER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto relative z-50">
            {loading.notifications ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-primary border-t-transparent mx-auto mb-2" />
                <p className="text-sm text-text-tertiary">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-50" />
                <h4 className="font-medium text-text-primary mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </h4>
                <p className="text-sm text-text-tertiary">
                  {filter === 'unread' 
                    ? 'You\'re all caught up!' 
                    : 'We\'ll notify you when something happens.'
                  }
                </p>
              </div>
            ) : (
              <div>
                <AnimatePresence>
                  {filteredNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={actions.markAsRead}
                      onDelete={actions.deleteNotification}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t border-dark-border/50 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Navigate to full notifications page if you have one
                  // For now, just reload notifications
                  actions.loadNotifications();
                }}
                className="text-sm"
              >
                View All Notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}