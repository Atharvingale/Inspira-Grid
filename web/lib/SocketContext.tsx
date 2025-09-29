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
    console.log('🔌 Socket context not available - using default values');
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
    const SOCKET_DISABLED = process.env.NEXT_PUBLIC_DISABLE_SOCKET === 'true' || process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === 'false';
    
    if (SOCKET_DISABLED) {
      console.log('🔌 Sockets disabled via environment variable');
      return;
    }
    
    if (currentUser) {
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
        console.log('✅ Socket connected to server:', newSocket.id);
        setIsConnected(true);
        // Join user's personal room only after successful connection
        newSocket.emit('join_user_room', currentUser.uid);
      });

      // Listen for disconnect
      newSocket.on('disconnect', (reason) => {
        console.log('⚠️ Socket disconnected from server:', reason);
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

      // Listen for notifications
      newSocket.on('notification', (notification: Notification) => {
        setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications
      });

      // Listen for real-time updates
      newSocket.on('project_update', (data: { projectId: string; type: string; payload: any }) => {
        console.log('Project update received:', data);
        // Handle project updates (new applications, status changes, etc.)
      });

      newSocket.on('team_update', (data: { teamId: string; type: string; payload: any }) => {
        console.log('Team update received:', data);
        // Handle team updates (new members, role changes, etc.)
      });

      newSocket.on('message', (data: { messageId: string; senderId: string; content: string; timestamp: string }) => {
        console.log('New message received:', data);
        // Handle new messages
      });

      newSocket.on('typing_start', (data: { roomId: string; userId: string; userName: string }) => {
        console.log('User started typing:', data);
        // Handle typing indicators
      });

      newSocket.on('typing_stop', (data: { roomId: string; userId: string }) => {
        console.log('User stopped typing:', data);
        // Handle typing indicators
      });

      // Enhanced error handling with reduced logging
      let errorLogged = false;
      newSocket.on('connect_error', (error) => {
        if (!errorLogged) {
          console.log('🔌 Real-time features unavailable (server not running)');
          errorLogged = true;
        }
        // Don't throw error, just log it once as the app can work without real-time features
      });
      
      newSocket.on('reconnect_error', (error) => {
        // Silently handle reconnection errors to avoid spam
      });
      
      newSocket.on('reconnect_failed', () => {
        console.warn('❌ Socket failed to reconnect after maximum attempts');
      });
      
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected successfully after', attemptNumber, 'attempts');
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
      console.log(`Joined team room: ${teamId}`);
    }
  };

  const leaveTeamRoom = (teamId: string) => {
    if (socket) {
      socket.emit('leave_team_room', teamId);
      console.log(`Left team room: ${teamId}`);
    }
  };

  const joinProjectRoom = (projectId: string) => {
    if (socket) {
      socket.emit('join_project_room', projectId);
      console.log(`Joined project room: ${projectId}`);
    }
  };

  const leaveProjectRoom = (projectId: string) => {
    if (socket) {
      socket.emit('leave_project_room', projectId);
      console.log(`Left project room: ${projectId}`);
    }
  };

  const joinConversationRoom = (conversationId: string) => {
    if (socket) {
      socket.emit('join_conversation_room', conversationId);
      console.log(`Joined conversation room: ${conversationId}`);
    }
  };

  const leaveConversationRoom = (conversationId: string) => {
    if (socket) {
      socket.emit('leave_conversation_room', conversationId);
      console.log(`Left conversation room: ${conversationId}`);
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
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, read: true }
          : notif
      )
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.has(userId);
  };

  // Collaboration functions
  const joinCollaboration = useCallback((sessionId: string, contextId: string, contextType: string) => {
    if (socket) {
      socket.emit('join_collaboration', { sessionId, contextId, contextType });
      console.log(`Joined collaboration session: ${sessionId}`);
    }
  }, [socket]);

  const leaveCollaboration = useCallback((sessionId: string, contextId: string, contextType: string) => {
    if (socket) {
      socket.emit('leave_collaboration', { sessionId, contextId, contextType });
      console.log(`Left collaboration session: ${sessionId}`);
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