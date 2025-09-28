"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type { CollaborationEvent } from './types/collaboration';
import type { Message } from './types/messaging';

// Types
interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  notifications: Notification[];
  
  // Room management
  joinTeamRoom: (teamId: string) => void;
  leaveTeamRoom: (teamId: string) => void;
  joinProjectRoom: (projectId: string) => void;
  leaveProjectRoom: (projectId: string) => void;
  joinConversationRoom: (conversationId: string) => void;
  leaveConversationRoom: (conversationId: string) => void;
  
  // Collaboration features
  joinCollaboration: (sessionId: string, contextId: string, contextType: string) => void;
  leaveCollaboration: (sessionId: string, contextId: string, contextType: string) => void;
  broadcastCollaborationEvent: (event: CollaborationEvent) => void;
  
  // Messaging features
  sendMessage: (messageData: any) => void;
  startTyping: (roomId: string, userId: string) => void;
  stopTyping: (roomId: string, userId: string) => void;
  
  // Notifications
  markNotificationAsRead: (notificationId: string) => void;
  clearAllNotifications: () => void;
  
  // Utility
  isUserOnline: (userId: string) => boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
}

// Create Socket Context
const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Custom hook to use socket context with safe fallback
export const useSocket = () => {
  const context = useContext(SocketContext);
  
  // Return default values if context is not available (graceful degradation)
  if (!context) {
    return {
      socket: null,
      isConnected: false,
      onlineUsers: new Set<string>(),
      notifications: [],
      joinTeamRoom: () => {},
      leaveTeamRoom: () => {},
      joinProjectRoom: () => {},
      leaveProjectRoom: () => {},
      joinConversationRoom: () => {},
      leaveConversationRoom: () => {},
      joinCollaboration: () => {},
      leaveCollaboration: () => {},
      broadcastCollaborationEvent: () => {},
      sendMessage: () => {},
      startTyping: () => {},
      stopTyping: () => {},
      markNotificationAsRead: () => {},
      clearAllNotifications: () => {},
      isUserOnline: () => false,
      emit: () => {},
      on: () => {},
      off: () => {}
    } as SocketContextType;
  }
  
  return context;
};

// Socket provider props
interface SocketProviderProps {
  children: ReactNode;
}

// Export useSocketContext alias for consistency
export const useSocketContext = useSocket;

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    // Allow disabling socket in development via environment variable
    const SOCKET_DISABLED = process.env.NEXT_PUBLIC_DISABLE_SOCKET === 'true';
    
    if (currentUser && !SOCKET_DISABLED) {
      // Initialize socket connection with better error handling
      const serverUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const newSocket = io(serverUrl, {
        query: {
          userId: currentUser.uid
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      setSocket(newSocket);

      // Listen for connection
      newSocket.on('connect', () => {
        setIsConnected(true);
        // Authenticate with notification service
        newSocket.emit('authenticate', currentUser.uid);
        // Join user's personal room only after successful connection
        newSocket.emit('join_user_room', currentUser.uid);
      });

      // Listen for disconnect
      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
      });

      // Listen for online users
      newSocket.on('online_users', (users: string[]) => {
        setOnlineUsers(new Set(users));
      });

      // Listen for user online
      newSocket.on('user_online', (userId: string) => {
        setOnlineUsers(prev => new Set([...prev, userId]));
      });

      // Listen for user offline
      newSocket.on('user_offline', (userId: string) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      // Listen for notifications from our notification system
      newSocket.on('new_notification', (notification: any) => {
        const formattedNotification: Notification = {
          id: notification.id,
          message: notification.message,
          time: notification.createdAt,
          read: notification.isRead || false,
          type: notification.priority === 'high' ? 'warning' : 'info'
        };
        setNotifications(prev => [formattedNotification, ...prev].slice(0, 50));
      });
      
      // Listen for unread count updates
      newSocket.on('unread_count_update', (data: { count: number }) => {
        // You can use this to update a badge or counter in your UI
        console.log('Unread notifications count:', data.count);
      });
      
      // Listen for notification read confirmations
      newSocket.on('notification_marked_read', (data: { notificationId: string }) => {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === data.notificationId
              ? { ...notif, read: true }
              : notif
          )
        );
      });

      // Listen for real-time updates
      newSocket.on('project_update', (data: { projectId: string; type: string; payload: any }) => {
        // Handle project updates (new applications, status changes, etc.)
      });

      newSocket.on('team_update', (data: { teamId: string; type: string; payload: any }) => {
        // Handle team updates (new members, role changes, etc.)
      });

      newSocket.on('message', (data: { messageId: string; senderId: string; content: string; timestamp: string }) => {
        // Handle new messages
      });

      newSocket.on('typing_start', (data: { roomId: string; userId: string; userName: string }) => {
        // Handle typing indicators
      });

      newSocket.on('typing_stop', (data: { roomId: string; userId: string }) => {
        // Handle typing indicators
      });

      // Enhanced error handling
      newSocket.on('connect_error', (error) => {
        // Don't throw error, just log it as the app can work without real-time features
      });
      
      newSocket.on('reconnect_error', (error) => {
        // Handle reconnection errors silently
      });
      
      newSocket.on('reconnect_failed', () => {
        // Handle reconnection failure silently
      });
      
      newSocket.on('reconnect', (attemptNumber) => {
        // Handle successful reconnection silently
      });

      // Cleanup on unmount or user change
      return () => {
        newSocket.close();
      };
    } else {
      // Disconnect socket if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setOnlineUsers(new Set());
        setNotifications([]);
      }
    }
  }, [currentUser]);

  // Socket utility functions
  const joinTeamRoom = (teamId: string) => {
    if (socket) {
      socket.emit('join_team_room', teamId);
    }
  };

  const leaveTeamRoom = (teamId: string) => {
    if (socket) {
      socket.emit('leave_team_room', teamId);
    }
  };

  const joinProjectRoom = (projectId: string) => {
    if (socket) {
      socket.emit('join_project_room', projectId);
    }
  };

  const leaveProjectRoom = (projectId: string) => {
    if (socket) {
      socket.emit('leave_project_room', projectId);
    }
  };

  const joinConversationRoom = (conversationId: string) => {
    if (socket) {
      socket.emit('join_conversation_room', conversationId);
    }
  };

  const leaveConversationRoom = (conversationId: string) => {
    if (socket) {
      socket.emit('leave_conversation_room', conversationId);
    }
  };

  const sendMessage = (messageData: { recipientId: string; content: string; projectId?: string; teamId?: string }) => {
    if (socket) {
      socket.emit('send_message', messageData);
    }
  };

  const startTyping = (roomId: string, userId: string) => {
    if (socket) {
      socket.emit('typing_start', { roomId, userId });
    }
  };

  const stopTyping = (roomId: string, userId: string) => {
    if (socket) {
      socket.emit('typing_stop', { roomId, userId });
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    // Send to server via socket
    if (socket) {
      socket.emit('mark_notification_read', notificationId);
    }
    
    // Update locally (will be confirmed by server)
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, read: true }
          : notif
      )
    );
  };

  const clearAllNotifications = () => {
    // Send to server via socket
    if (socket) {
      socket.emit('mark_all_notifications_read');
    }
    
    // Update locally
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.has(userId);
  };

  // Collaboration functions
  const joinCollaboration = useCallback((sessionId: string, contextId: string, contextType: string) => {
    if (socket) {
      socket.emit('join_collaboration', { sessionId, contextId, contextType });
    }
  }, [socket]);

  const leaveCollaboration = useCallback((sessionId: string, contextId: string, contextType: string) => {
    if (socket) {
      socket.emit('leave_collaboration', { sessionId, contextId, contextType });
    }
  }, [socket]);

  const broadcastCollaborationEvent = useCallback((event: CollaborationEvent) => {
    if (socket) {
      socket.emit('collaboration_event', event);
    }
  }, [socket]);

  // Generic socket event handlers
  const emit = useCallback((event: string, data?: any) => {
    if (socket) {
      socket.emit(event, data);
    }
  }, [socket]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, handler);
    }
  }, [socket]);

  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    if (socket) {
      if (handler) {
        socket.off(event, handler);
      } else {
        socket.off(event);
      }
    }
  }, [socket]);

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    notifications,
    joinTeamRoom,
    leaveTeamRoom,
    joinProjectRoom,
    leaveProjectRoom,
    joinConversationRoom,
    leaveConversationRoom,
    joinCollaboration,
    leaveCollaboration,
    broadcastCollaborationEvent,
    sendMessage,
    startTyping,
    stopTyping,
    markNotificationAsRead,
    clearAllNotifications,
    isUserOnline,
    emit,
    on,
    off
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};