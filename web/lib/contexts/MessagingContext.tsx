'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { socket } from '@/lib/socket';

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  reactions?: MessageReaction[];
  replyTo?: string; // ID of message being replied to
  edited?: boolean;
  editedAt?: Date;
  isDeleted?: boolean;
}

export interface Conversation {
  id: string;
  name?: string;
  participants: User[];
  type: 'direct' | 'group' | 'project_group';
  projectId?: string;
  projectTitle?: string;
  lastMessage?: Message;
  unreadCount: number;
  isTyping?: string[]; // User IDs currently typing
  createdAt: Date;
  updatedAt: Date;
  isArchived?: boolean;
  isMuted?: boolean;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
}

interface MessagingState {
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  activeConversation: Conversation | null;
  onlineUsers: User[];
  typingIndicators: TypingIndicator[];
  searchQuery: string;
  searchResults: Message[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
}

type MessagingAction =
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'ADD_CONVERSATION'; payload: Conversation }
  | { type: 'UPDATE_CONVERSATION'; payload: Conversation }
  | { type: 'DELETE_CONVERSATION'; payload: string }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: Conversation | null }
  | { type: 'SET_MESSAGES'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: Message }
  | { type: 'DELETE_MESSAGE'; payload: { conversationId: string; messageId: string } }
  | { type: 'ADD_REACTION'; payload: { conversationId: string; messageId: string; reaction: MessageReaction } }
  | { type: 'REMOVE_REACTION'; payload: { conversationId: string; messageId: string; emoji: string; userId: string } }
  | { type: 'SET_ONLINE_USERS'; payload: User[] }
  | { type: 'USER_ONLINE'; payload: User }
  | { type: 'USER_OFFLINE'; payload: string }
  | { type: 'SET_TYPING'; payload: TypingIndicator }
  | { type: 'CLEAR_TYPING'; payload: { conversationId: string; userId: string } }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: Message[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_UNREAD_COUNT'; payload: number }
  | { type: 'MARK_CONVERSATION_READ'; payload: string };

const initialState: MessagingState = {
  conversations: [],
  messages: {},
  activeConversation: null,
  onlineUsers: [],
  typingIndicators: [],
  searchQuery: '',
  searchResults: [],
  loading: false,
  error: null,
  unreadCount: 0,
};

function messagingReducer(state: MessagingState, action: MessagingAction): MessagingState {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return {
        ...state,
        conversations: action.payload,
        unreadCount: action.payload.reduce((total, conv) => total + conv.unreadCount, 0),
      };

    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
      };

    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.id === action.payload.id ? action.payload : conv
        ),
        activeConversation:
          state.activeConversation?.id === action.payload.id ? action.payload : state.activeConversation,
      };

    case 'DELETE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(conv => conv.id !== action.payload),
        activeConversation:
          state.activeConversation?.id === action.payload ? null : state.activeConversation,
      };

    case 'SET_ACTIVE_CONVERSATION':
      return {
        ...state,
        activeConversation: action.payload,
      };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: action.payload.messages,
        },
      };

    case 'ADD_MESSAGE': {
      const conversationMessages = state.messages[action.payload.conversationId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: [...conversationMessages, action.payload],
        },
      };
    }

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: (state.messages[action.payload.conversationId] || []).map(msg =>
            msg.id === action.payload.id ? action.payload : msg
          ),
        },
      };

    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: (state.messages[action.payload.conversationId] || []).filter(
            msg => msg.id !== action.payload.messageId
          ),
        },
      };

    case 'SET_ONLINE_USERS':
      return {
        ...state,
        onlineUsers: action.payload,
      };

    case 'USER_ONLINE':
      return {
        ...state,
        onlineUsers: [...state.onlineUsers.filter(u => u.id !== action.payload.id), action.payload],
      };

    case 'USER_OFFLINE':
      return {
        ...state,
        onlineUsers: state.onlineUsers.filter(u => u.id !== action.payload),
      };

    case 'SET_TYPING': {
      const existingTyping = state.typingIndicators.find(
        t => t.conversationId === action.payload.conversationId && t.userId === action.payload.userId
      );
      if (existingTyping) return state;
      
      return {
        ...state,
        typingIndicators: [...state.typingIndicators, action.payload],
      };
    }

    case 'CLEAR_TYPING':
      return {
        ...state,
        typingIndicators: state.typingIndicators.filter(
          t => !(t.conversationId === action.payload.conversationId && t.userId === action.payload.userId)
        ),
      };

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };

    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        searchResults: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'UPDATE_UNREAD_COUNT':
      return {
        ...state,
        unreadCount: action.payload,
      };

    case 'MARK_CONVERSATION_READ':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.id === action.payload ? { ...conv, unreadCount: 0 } : conv
        ),
        unreadCount: state.unreadCount - (state.conversations.find(c => c.id === action.payload)?.unreadCount || 0),
      };

    default:
      return state;
  }
}

export interface MessagingContextType {
  state: MessagingState;
  // Conversation actions
  loadConversations: () => Promise<void>;
  createConversation: (participantIds: string[], type: Conversation['type'], projectId?: string, name?: string, projectTitle?: string) => Promise<Conversation>;
  deleteConversation: (conversationId: string) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  markConversationAsRead: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => Promise<void>;
  muteConversation: (conversationId: string) => Promise<void>;
  // Message actions
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, type?: Message['type'], replyTo?: string, fileUrl?: string, fileName?: string, fileSize?: number) => Promise<void>;
  editMessage: (conversationId: string, messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  addReaction: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  removeReaction: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  // File handling
  sendFile: (conversationId: string, file: File, caption?: string) => Promise<void>;
  // Typing indicators
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  // Search
  searchMessages: (query: string, conversationId?: string) => Promise<void>;
  clearSearch: () => void;
  // Utility
  getUserById: (userId: string) => User | undefined;
  isUserOnline: (userId: string) => boolean;
  getConversationName: (conversation: Conversation) => string;
  getUnreadCount: () => number;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(messagingReducer, initialState);
  const { currentUser } = useAuth();

  // Socket event handlers
  useEffect(() => {
    if (!currentUser || !socket) return;

    // Join user to their personal room for notifications
    socket.emit('user:join', currentUser.uid);

    // Message events
    socket.on('message:new', (message: Message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
      // Play notification sound if message is not from current user
      if (message.senderId !== currentUser.uid) {
        playNotificationSound();
      }
    });

    socket.on('message:updated', (message: Message) => {
      dispatch({ type: 'UPDATE_MESSAGE', payload: message });
    });

    socket.on('message:deleted', (message: Message) => {
      dispatch({ type: 'UPDATE_MESSAGE', payload: message });
    });

    // Reaction events
    socket.on('reaction:added', ({ conversationId, messageId, reaction }: { 
      conversationId: string; 
      messageId: string; 
      reaction: MessageReaction;
    }) => {
      dispatch({ 
        type: 'ADD_REACTION', 
        payload: { conversationId, messageId, reaction }
      });
    });

    socket.on('reaction:removed', ({ conversationId, messageId, emoji, userId }: {
      conversationId: string;
      messageId: string;
      emoji: string;
      userId: string;
    }) => {
      dispatch({
        type: 'REMOVE_REACTION',
        payload: { conversationId, messageId, emoji, userId }
      });
    });

    // User presence events
    socket.on('user:online', (user: User) => {
      dispatch({ type: 'USER_ONLINE', payload: user });
    });

    socket.on('user:offline', (userId: string) => {
      dispatch({ type: 'USER_OFFLINE', payload: userId });
    });

    // Typing events
    socket.on('typing:start', (indicator: TypingIndicator) => {
      // Don't show typing indicator for current user
      if (indicator.userId !== currentUser.uid) {
        dispatch({ type: 'SET_TYPING', payload: indicator });
      }
    });

    socket.on('typing:stop', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      dispatch({ type: 'CLEAR_TYPING', payload: { conversationId, userId } });
    });

    // Conversation events
    socket.on('conversation:updated', (conversation: Conversation) => {
      dispatch({ type: 'UPDATE_CONVERSATION', payload: conversation });
    });

    socket.on('conversation:new', (conversation: Conversation) => {
      dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
    });

    // Error handling
    socket.on('error', (error: string) => {
      console.error('Socket error:', error);
      dispatch({ type: 'SET_ERROR', payload: error });
    });

    return () => {
      if (socket) {
        socket.off('message:new');
        socket.off('message:updated');
        socket.off('message:deleted');
        socket.off('reaction:added');
        socket.off('reaction:removed');
        socket.off('user:online');
        socket.off('user:offline');
        socket.off('typing:start');
        socket.off('typing:stop');
        socket.off('conversation:updated');
        socket.off('conversation:new');
        socket.off('error');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Notification sound function
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Could not play notification sound:', e));
    } catch (_error) {
      console.log('Notification sound not available');
    }
  }, []);

  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data = await response.json();
      dispatch({ type: 'SET_CONVERSATIONS', payload: data.conversations || [] });
    } catch (error) {
      console.error('Error loading conversations:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load conversations' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentUser]);

  const createConversation = useCallback(async (participantIds: string[], type: Conversation['type'], projectId?: string, name?: string, projectTitle?: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participantIds,
          type,
          name,
          projectId,
          projectTitle
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.statusText}`);
      }

      const data = await response.json();
      dispatch({ type: 'ADD_CONVERSATION', payload: data.conversation });
      return data.conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }, [currentUser]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    dispatch({ type: 'DELETE_CONVERSATION', payload: conversationId });
  }, []);

  const setActiveConversation = useCallback((conversation: Conversation | null) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation });
    if (conversation && conversation.unreadCount > 0) {
      markConversationAsRead(conversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markConversationAsRead = useCallback((conversationId: string) => {
    dispatch({ type: 'MARK_CONVERSATION_READ', payload: conversationId });
    // TODO: Send API call to mark as read
  }, []);

  const archiveConversation = useCallback(async (conversationId: string) => {
    // TODO: Implement archive functionality
  }, []);

  const muteConversation = useCallback(async (conversationId: string) => {
    // TODO: Implement mute functionality
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!currentUser) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      const data = await response.json();
      dispatch({ type: 'SET_MESSAGES', payload: { conversationId, messages: data.messages || [] } });
    } catch (error) {
      console.error('Error loading messages:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load messages' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentUser]);

  const sendMessage = useCallback(async (conversationId: string, content: string, type: Message['type'] = 'text', replyTo?: string, fileUrl?: string, fileName?: string, fileSize?: number) => {
    if (!currentUser) return;
    
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          type,
          replyTo,
          fileUrl,
          fileName,
          fileSize
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();
      dispatch({ type: 'ADD_MESSAGE', payload: data.message });
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('message:send', data.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [currentUser]);

  const editMessage = useCallback(async (conversationId: string, messageId: string, newContent: string) => {
    if (!currentUser) return;
    
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'edit',
          content: newContent
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to edit message: ${response.statusText}`);
      }

      const data = await response.json();
      dispatch({ type: 'UPDATE_MESSAGE', payload: data.message });
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('message:edit', data.message);
      }
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }, [currentUser]);

  const deleteMessage = useCallback(async (conversationId: string, messageId: string) => {
    if (!currentUser) return;
    
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.statusText}`);
      }

      const data = await response.json();
      dispatch({ type: 'UPDATE_MESSAGE', payload: data.message });
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('message:delete', { conversationId, messageId });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, [currentUser]);

  const addReaction = useCallback(async (conversationId: string, messageId: string, emoji: string) => {
    if (!currentUser) return;
    
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'addReaction',
          emoji
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add reaction: ${response.statusText}`);
      }

      const data = await response.json();
      dispatch({ type: 'UPDATE_MESSAGE', payload: data.message });
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('reaction:add', { conversationId, messageId, emoji, userId: currentUser.uid });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, [currentUser]);

  const removeReaction = useCallback(async (conversationId: string, messageId: string, emoji: string) => {
    if (!currentUser) return;
    
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'removeReaction',
          emoji
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to remove reaction: ${response.statusText}`);
      }

      const data = await response.json();
      dispatch({ type: 'UPDATE_MESSAGE', payload: data.message });
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('reaction:remove', { conversationId, messageId, emoji, userId: currentUser.uid });
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }, [currentUser]);

  const sendFile = useCallback(async (conversationId: string, file: File, caption?: string) => {
    if (!currentUser) return;
    
    try {
      // First, upload the file
      const token = await currentUser.getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'message');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      
      // Then send the message with file info
      await sendMessage(
        conversationId,
        caption || '',
        uploadData.isImage ? 'image' : 'file',
        undefined,
        uploadData.url,
        uploadData.fileName,
        uploadData.fileSize
      );
    } catch (error) {
      console.error('Error sending file:', error);
      throw error;
    }
  }, [currentUser, sendMessage]);

  const startTyping = useCallback((conversationId: string) => {
    if (!currentUser || !socket) return;
    socket.emit('typing:start', { conversationId, userId: currentUser.uid, userName: currentUser.displayName });
  }, [currentUser]);

  const stopTyping = useCallback((conversationId: string) => {
    if (!currentUser || !socket) return;
    socket.emit('typing:stop', { conversationId, userId: currentUser.uid });
  }, [currentUser]);

  const searchMessages = useCallback(async (query: string, conversationId?: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    
    if (!query.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
      return;
    }
    
    // For now, implement client-side search
    // TODO: Replace with server-side search API for better performance
    const results: Message[] = [];
    
    if (conversationId) {
      // Search within specific conversation
      const messages = state.messages[conversationId] || [];
      const filteredMessages = messages.filter(message => 
        message.content.toLowerCase().includes(query.toLowerCase()) &&
        !message.isDeleted
      );
      results.push(...filteredMessages);
    } else {
      // Search across all conversations
      Object.values(state.messages).forEach(messages => {
        const filteredMessages = messages.filter(message => 
          message.content.toLowerCase().includes(query.toLowerCase()) &&
          !message.isDeleted
        );
        results.push(...filteredMessages);
      });
    }
    
    // Sort by timestamp (most recent first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
  }, [state.messages]);

  const clearSearch = useCallback(() => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
  }, []);

  const getUserById = useCallback((userId: string) => {
    const allUsers = state.conversations.flatMap(conv => conv.participants);
    return allUsers.find(user => user.id === userId);
  }, [state.conversations]);

  const isUserOnline = useCallback((userId: string) => {
    return state.onlineUsers.some(user => user.id === userId);
  }, [state.onlineUsers]);

  const getConversationName = useCallback((conversation: Conversation) => {
    if (conversation.name) return conversation.name;
    if (conversation.type === 'project_group') return `${conversation.projectTitle} Team`;
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(p => p.id !== currentUser?.uid);
      return otherParticipant?.name || 'Unknown';
    }
    return `Group (${conversation.participants.length} members)`;
  }, [currentUser]);

  const getUnreadCount = useCallback(() => state.unreadCount, [state.unreadCount]);

  const contextValue: MessagingContextType = {
    state,
    loadConversations,
    createConversation,
    deleteConversation,
    setActiveConversation,
    markConversationAsRead,
    archiveConversation,
    muteConversation,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    sendFile,
    startTyping,
    stopTyping,
    searchMessages,
    clearSearch,
    getUserById,
    isUserOnline,
    getConversationName,
    getUnreadCount,
  };

  return <MessagingContext.Provider value={contextValue}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}