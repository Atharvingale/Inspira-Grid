/**
 * Enhanced Messaging Hook
 * 
 * React hook for managing real-time messaging functionality
 * including conversations, messages, typing indicators, and presence.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { useSocket } from '@/lib/SocketContext';
import { useAuth } from '@/lib/AuthContext';
import { messagingService } from '@/lib/services/messagingService';
import type {
  EnhancedMessage,
  Conversation,
  TypingIndicator,
  UserPresenceStatus,
  SendMessageRequest,
  CreateConversationRequest,
  MessageSearchParams,
  UseMessagingReturn
} from '@/lib/types/messaging';

export const useMessaging = (): UseMessagingReturn => {
  // Contexts
  const { currentUser } = useAuth();
  const socket = useSocket();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation>();
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Loading states
  const [loading, setLoading] = useState({
    conversations: true,
    messages: false,
    sending: false,
  });

  // Refs for cleanup
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const messageCache = useRef<Map<string, EnhancedMessage[]>>(new Map());

  // =====================================
  // Socket Event Handlers
  // =====================================

  useEffect(() => {
    if (!socket?.socket || !currentUser) return;

    const handleNewMessage = (message: EnhancedMessage) => {
      // Update conversation list with new last message
      setConversations(prev => prev.map(conv => 
        conv.id === message.conversationId 
          ? {
              ...conv,
              lastMessage: {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                senderName: message.senderName,
                timestamp: message.createdAt,
                messageType: message.messageType
              },
              unreadCount: message.senderId === currentUser.uid ? 0 : conv.unreadCount + 1,
              updatedAt: message.createdAt
            }
          : conv
      ));

      // Add message to current conversation if it matches
      if (currentConversation && message.conversationId === currentConversation.id) {
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === message.id);
          if (exists) return prev;
          return [...prev, message].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });

        // Mark as read if it's the current conversation and not from current user
        if (message.senderId !== currentUser.uid) {
          messagingService.markAsRead(message.id).catch(console.error);
        }
      }

      // Show notification for messages not from current user
      if (message.senderId !== currentUser.uid && 
          (!currentConversation || message.conversationId !== currentConversation.id)) {
        toast.info(`New message from ${message.senderName}`, {
          onClick: () => selectConversation(message.conversationId)
        });
      }
    };

    const handleMessageUpdated = ({ messageId, updates }: { messageId: string; updates: Partial<EnhancedMessage> }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      ));
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    const handleTypingStart = (indicator: TypingIndicator) => {
      if (indicator.userId === currentUser.uid) return;
      
      setTypingUsers(prev => {
        const exists = prev.some(t => t.userId === indicator.userId && t.conversationId === indicator.conversationId);
        if (exists) return prev;
        return [...prev, indicator];
      });

      // Clear typing indicator after timeout
      const key = `${indicator.userId}-${indicator.conversationId}`;
      const existingTimeout = typingTimeoutRef.current.get(key);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(() => {
        setTypingUsers(prev => prev.filter(t => 
          !(t.userId === indicator.userId && t.conversationId === indicator.conversationId)
        ));
        typingTimeoutRef.current.delete(key);
      }, 3000);

      typingTimeoutRef.current.set(key, timeout);
    };

    const handleTypingStop = ({ userId, conversationId }: { userId: string; conversationId: string }) => {
      setTypingUsers(prev => prev.filter(t => 
        !(t.userId === userId && t.conversationId === conversationId)
      ));

      const key = `${userId}-${conversationId}`;
      const timeout = typingTimeoutRef.current.get(key);
      if (timeout) {
        clearTimeout(timeout);
        typingTimeoutRef.current.delete(key);
      }
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    const handleConversationCreated = (conversation: Conversation) => {
      setConversations(prev => [conversation, ...prev]);
    };

    const handleConversationUpdated = ({ conversationId, updates }: { conversationId: string; updates: Partial<Conversation> }) => {
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, ...updates } : conv
      ));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, ...updates } : prev);
      }
    };

    // Register socket event listeners
    socket.socket.on('message:new', handleNewMessage);
    socket.socket.on('message:updated', handleMessageUpdated);
    socket.socket.on('message:deleted', handleMessageDeleted);
    socket.socket.on('typing:start', handleTypingStart);
    socket.socket.on('typing:stop', handleTypingStop);
    socket.socket.on('user:online', handleUserOnline);
    socket.socket.on('user:offline', handleUserOffline);
    socket.socket.on('conversation:created', handleConversationCreated);
    socket.socket.on('conversation:updated', handleConversationUpdated);

    return () => {
      if (socket?.socket) {
        socket.socket.off('message:new', handleNewMessage);
        socket.socket.off('message:updated', handleMessageUpdated);
        socket.socket.off('message:deleted', handleMessageDeleted);
        socket.socket.off('typing:start', handleTypingStart);
        socket.socket.off('typing:stop', handleTypingStop);
        socket.socket.off('user:online', handleUserOnline);
        socket.socket.off('user:offline', handleUserOffline);
        socket.socket.off('conversation:created', handleConversationCreated);
        socket.socket.off('conversation:updated', handleConversationUpdated);
      }

      // Clear all typing timeouts
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, [socket?.socket, currentUser, currentConversation]);

  // =====================================
  // Data Loading
  // =====================================

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [currentUser]);

  const loadConversations = async () => {
    if (!currentUser) return;

    try {
      setLoading(prev => ({ ...prev, conversations: true }));
      const response = await messagingService.getConversations();
      
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(prev => ({ ...prev, conversations: false }));
    }
  };

  const loadMessages = async (conversationId: string, loadMore: boolean = false) => {
    if (!conversationId) return;

    try {
      if (!loadMore) {
        setLoading(prev => ({ ...prev, messages: true }));
      }

      // Check cache first
      const cachedMessages = messageCache.current.get(conversationId);
      if (cachedMessages && !loadMore) {
        setMessages(cachedMessages);
        setLoading(prev => ({ ...prev, messages: false }));
        return;
      }

      const response = await messagingService.getMessages({
        conversationId,
        limit: 50,
        before: loadMore ? messages[0]?.id : undefined
      });

      if (response.success && response.data) {
        const newMessages = response.data.data || [];
        
        if (loadMore) {
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
          // Cache messages
          messageCache.current.set(conversationId, newMessages);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };

  // =====================================
  // Actions
  // =====================================

  const selectConversation = useCallback(async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    setCurrentConversation(conversation);
    await loadMessages(conversationId);

    // Mark conversation as read
    await messagingService.markConversationAsRead(conversationId);
    
    // Update unread count locally
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, unreadCount: 0 }
        : conv
    ));

    // Join conversation room for real-time updates
    if (socket?.socket) {
      socket.socket.emit('join_conversation_room', conversationId);
    }
  }, [conversations, socket]);

  const sendMessage = useCallback(async (request: SendMessageRequest): Promise<void> => {
    if (!currentUser || loading.sending) return;

    try {
      setLoading(prev => ({ ...prev, sending: true }));

      // Create optimistic message
      const optimisticMessage: EnhancedMessage = {
        id: `temp-${Date.now()}`,
        conversationId: request.conversationId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email || 'You',
        senderAvatar: currentUser.photoURL || undefined,
        content: request.content,
        messageType: request.messageType || 'text',
        status: 'sending',
        createdAt: new Date().toISOString(),
        reactions: [],
        mentions: request.mentionedUserIds?.map((userId, index) => ({
          userId,
          userName: '', // Will be populated by server
          startIndex: 0, // Will be calculated by server
          length: 0
        })) || []
      };

      // Add to messages immediately for responsive UI
      if (currentConversation?.id === request.conversationId) {
        setMessages(prev => [...prev, optimisticMessage]);
      }

      // Send message to server
      const response = await messagingService.sendMessage(request);

      if (response.success && response.data) {
        // Replace optimistic message with real message
        if (currentConversation?.id === request.conversationId) {
          setMessages(prev => prev.map(msg => 
            msg.id === optimisticMessage.id ? response.data! : msg
          ));
        }
      } else {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      
      // Remove optimistic message on error
      if (currentConversation?.id === request.conversationId) {
        setMessages(prev => prev.filter(msg => msg.id !== `temp-${Date.now()}`));
      }
    } finally {
      setLoading(prev => ({ ...prev, sending: false }));
    }
  }, [currentUser, loading.sending, currentConversation]);

  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!currentConversation || loading.messages) return;
    await loadMessages(currentConversation.id, true);
  }, [currentConversation, loading.messages]);

  const createConversation = useCallback(async (request: CreateConversationRequest): Promise<string> => {
    try {
      const response = await messagingService.createConversation(request);
      
      if (response.success && response.data) {
        // Conversation will be added via socket event
        return response.data.id;
      } else {
        throw new Error(response.error || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation');
      throw error;
    }
  }, []);

  const markAsRead = useCallback((messageId: string) => {
    messagingService.markAsRead(messageId).catch(console.error);
  }, []);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const response = await messagingService.addReaction(messageId, emoji);
      if (response.success && response.data) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? response.data! : msg
        ));
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to add reaction');
    }
  }, []);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const response = await messagingService.removeReaction(messageId, emoji);
      if (response.success && response.data) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? response.data! : msg
        ));
      }
    } catch (error) {
      console.error('Failed to remove reaction:', error);
      toast.error('Failed to remove reaction');
    }
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    if (socket?.socket && currentUser) {
      socket.socket.emit('typing:start', {
        conversationId,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email
      });
    }
  }, [socket, currentUser]);

  const stopTyping = useCallback((conversationId: string) => {
    if (socket?.socket && currentUser) {
      socket.socket.emit('typing:stop', {
        conversationId,
        userId: currentUser.uid
      });
    }
  }, [socket, currentUser]);

  const searchMessages = useCallback(async (params: MessageSearchParams): Promise<EnhancedMessage[]> => {
    try {
      const response = await messagingService.searchMessages(params);
      if (response.success && response.data) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to search messages:', error);
      toast.error('Failed to search messages');
      return [];
    }
  }, []);

  const archiveConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await messagingService.toggleArchiveConversation(conversationId);
      if (response.success && response.data) {
        // Update will come via socket event
        toast.success('Conversation archived');
      }
    } catch (error) {
      console.error('Failed to archive conversation:', error);
      toast.error('Failed to archive conversation');
    }
  }, []);

  const muteConversation = useCallback(async (conversationId: string, mutedUntil?: string) => {
    try {
      const response = await messagingService.muteConversation(conversationId, mutedUntil);
      if (response.success && response.data) {
        // Update will come via socket event
        toast.success(mutedUntil ? 'Conversation muted' : 'Conversation unmuted');
      }
    } catch (error) {
      console.error('Failed to mute conversation:', error);
      toast.error('Failed to update conversation');
    }
  }, []);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    typingUsers,
    onlineUsers,

    // Loading states
    loading,

    // Actions
    actions: {
      selectConversation,
      sendMessage,
      loadMoreMessages,
      createConversation,
      markAsRead,
      addReaction,
      removeReaction,
      startTyping,
      stopTyping,
      searchMessages,
      archiveConversation,
      muteConversation,
    }
  };
};