/**
 * Collaboration Hooks
 * 
 * React hooks for managing real-time collaboration features including
 * sessions, presence, cursors, document editing, comments, and activity feeds.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { collaborationService } from '@/lib/services/collaborationService';
import { useSocketContext } from '@/lib/SocketContext';
import {
  CollaborationSession,
  JoinSessionRequest,
  UserPresence,
  LiveCursor,
  EditingIndicator,
  DocumentState,
  SyncConflict,
  Operation,
  ActivityFeedItem,
  ActivityFilter,
  Comment,
  CommentThread,
  LiveSelection,
  SharedHighlight,
  AwarenessInfo,
  ContextAwareness,
  CollaborationEvent,
  UseCollaborationReturn,
  UseActivityFeedReturn,
  UseCommentsReturn
} from '@/lib/types/collaboration';

// =====================================
// Main Collaboration Hook
// =====================================

export const useCollaboration = (
  contextId: string,
  contextType: string,
  autoJoin: boolean = true
): UseCollaborationReturn => {
  // State
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [cursors, setCursors] = useState<LiveCursor[]>([]);
  const [awareness, setAwareness] = useState<ContextAwareness | null>(null);
  const [documentState, setDocumentState] = useState<DocumentState | null>(null);
  const [editingIndicators, setEditingIndicators] = useState<EditingIndicator[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  // Socket context
  const { socket, isConnected: socketConnected } = useSocketContext();

  // Refs for cleanup and throttling
  const cursorUpdateThrottle = useRef<NodeJS.Timeout>();
  const presenceUpdateThrottle = useRef<NodeJS.Timeout>();
  const currentSessionId = useRef<string | null>(null);

  // Join collaboration session
  const joinSession = useCallback(async (request: JoinSessionRequest) => {
    try {
      setConnectionStatus('connecting');
      
      const response = await collaborationService.joinSession({
        ...request,
        contextId,
        contextType
      });
      
      setSession(response.session);
      setDocumentState(response.currentState);
      setActiveUsers(response.activeParticipants.map(p => p.user as unknown as UserPresence));
      currentSessionId.current = response.sessionId;
      
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Join socket room for real-time updates
      if (socket && socketConnected) {
        socket.emit('join_collaboration', {
          sessionId: response.sessionId,
          contextId,
          contextType
        });
      }
      
    } catch (error) {
      console.error('Failed to join collaboration session:', error);
      setConnectionStatus('error');
      throw error;
    }
  }, [contextId, contextType, socket, socketConnected]);

  // Leave collaboration session
  const leaveSession = useCallback(async () => {
    if (!currentSessionId.current) return;
    
    try {
      await collaborationService.leaveSession(currentSessionId.current);
      
      // Leave socket room
      if (socket && socketConnected) {
        socket.emit('leave_collaboration', {
          sessionId: currentSessionId.current,
          contextId,
          contextType
        });
      }
      
      setSession(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setActiveUsers([]);
      setCursors([]);
      setAwareness(null);
      setEditingIndicators([]);
      setConflicts([]);
      currentSessionId.current = null;
      
    } catch (error) {
      console.error('Failed to leave collaboration session:', error);
    }
  }, [contextId, contextType, socket, socketConnected]);

  // Send document operation
  const sendOperation = useCallback((operation: Omit<Operation, 'id' | 'userId' | 'timestamp'>) => {
    if (!currentSessionId.current) return;
    
    collaborationService.sendOperation({
      sessionId: currentSessionId.current,
      operation
    }).catch(error => {
      console.error('Failed to send operation:', error);
    });
  }, []);

  // Move cursor with throttling
  const moveCursor = useCallback((
    position: { x: number; y: number },
    elementId?: string
  ) => {
    if (!isConnected) return;
    
    // Throttle cursor updates to avoid spam
    if (cursorUpdateThrottle.current) {
      clearTimeout(cursorUpdateThrottle.current);
    }
    
    cursorUpdateThrottle.current = setTimeout(() => {
      collaborationService.updateCursor(contextId, contextType, {
        position,
        elementId,
        isActive: true,
        color: '#3b82f6' // Default color, should be user-specific
      }).catch(error => {
        console.error('Failed to update cursor:', error);
      });
    }, 50); // 20 FPS
  }, [contextId, contextType, isConnected]);

  // Update presence with throttling
  const updatePresence = useCallback((updates: Partial<UserPresence>) => {
    if (!isConnected) return;
    
    // Throttle presence updates
    if (presenceUpdateThrottle.current) {
      clearTimeout(presenceUpdateThrottle.current);
    }
    
    presenceUpdateThrottle.current = setTimeout(() => {
      collaborationService.updatePresence(contextId, contextType, updates).catch(error => {
        console.error('Failed to update presence:', error);
      });
    }, 1000); // 1 second throttle
  }, [contextId, contextType, isConnected]);

  // Start editing indicator
  const startEditing = useCallback(async (elementId: string) => {
    if (!documentState) return;
    
    try {
      await collaborationService.startEditing(documentState.id, elementId, 'text');
    } catch (error) {
      console.error('Failed to start editing:', error);
    }
  }, [documentState]);

  // Stop editing indicator
  const stopEditing = useCallback(async (elementId: string) => {
    if (!documentState) return;
    
    try {
      await collaborationService.stopEditing(documentState.id, elementId);
    } catch (error) {
      console.error('Failed to stop editing:', error);
    }
  }, [documentState]);

  // Broadcast custom event
  const broadcastEvent = useCallback((event: Omit<CollaborationEvent, 'eventId' | 'timestamp'>) => {
    if (!currentSessionId.current) return;
    
    collaborationService.broadcastEvent({
      sessionId: currentSessionId.current,
      event: {
        ...event,
        contextId,
        contextType
      }
    }).catch(error => {
      console.error('Failed to broadcast event:', error);
    });
  }, [contextId, contextType]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !socketConnected || !isConnected) return;

    // Handle real-time collaboration events
    const handleCollaborationEvent = (data: CollaborationEvent) => {
      switch (data.type) {
        case 'presence_update':
          setActiveUsers(prev => {
            const updated = [...prev];
            const index = updated.findIndex(u => u.userId === data.userId);
            if (index >= 0) {
              updated[index] = { ...updated[index], ...data.payload };
            } else if (data.payload) {
              updated.push(data.payload as UserPresence);
            }
            return updated;
          });
          break;

        case 'cursor_move':
          setCursors(prev => {
            const updated = [...prev];
            const index = updated.findIndex(c => c.userId === data.userId);
            if (index >= 0) {
              updated[index] = { ...updated[index], ...data.payload };
            } else if (data.payload) {
              updated.push(data.payload as LiveCursor);
            }
            return updated;
          });
          break;

        case 'editing_start':
          setEditingIndicators(prev => {
            const indicator = data.payload as EditingIndicator;
            return [...prev.filter(i => i.elementId !== indicator.elementId || i.userId !== data.userId), indicator];
          });
          break;

        case 'editing_stop':
          setEditingIndicators(prev => 
            prev.filter(i => !(i.elementId === data.payload.elementId && i.userId === data.userId))
          );
          break;

        case 'document_change':
          // Handle document changes and update state
          if (documentState && data.payload.operation) {
            setDocumentState(prev => prev ? {
              ...prev,
              version: prev.version + 1,
              lastModified: data.timestamp,
              lastModifiedBy: data.userId,
              operations: [...prev.operations, data.payload.operation]
            } : prev);
          }
          break;

        case 'user_join':
          if (data.payload) {
            setActiveUsers(prev => [...prev.filter(u => u.userId !== data.userId), data.payload]);
          }
          break;

        case 'user_leave':
          setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
          setCursors(prev => prev.filter(c => c.userId !== data.userId));
          setEditingIndicators(prev => prev.filter(i => i.userId !== data.userId));
          break;

        case 'conflict_detected':
          setConflicts(prev => [...prev, data.payload]);
          break;

        case 'conflict_resolved':
          setConflicts(prev => prev.filter(c => c.id !== data.payload.conflictId));
          break;
      }
    };

    // Handle user disconnect
    const handleUserDisconnect = (data: { userId: string }) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
      setCursors(prev => prev.filter(c => c.userId !== data.userId));
    };

    socket.on('collaboration_event', handleCollaborationEvent);
    socket.on('user_disconnected', handleUserDisconnect);

    return () => {
      socket.off('collaboration_event', handleCollaborationEvent);
      socket.off('user_disconnected', handleUserDisconnect);
    };
  }, [socket, socketConnected, isConnected, documentState]);

  // Auto-join session on mount
  useEffect(() => {
    if (autoJoin && contextId && contextType && !isConnected) {
      joinSession({
        contextId,
        contextType,
        permissions: {
          canEdit: true,
          canComment: true,
          canView: true,
          canShare: false,
          isOwner: false,
          role: 'editor'
        }
      }).catch(console.error);
    }

    return () => {
      if (autoJoin) {
        leaveSession().catch(console.error);
      }
    };
  }, [autoJoin, contextId, contextType, isConnected, joinSession, leaveSession]);

  // Cleanup throttles
  useEffect(() => {
    return () => {
      if (cursorUpdateThrottle.current) {
        clearTimeout(cursorUpdateThrottle.current);
      }
      if (presenceUpdateThrottle.current) {
        clearTimeout(presenceUpdateThrottle.current);
      }
    };
  }, []);

  // Load initial data when session is established
  useEffect(() => {
    if (!isConnected || !contextId) return;

    const loadInitialData = async () => {
      try {
        // Load cursors, presence, and awareness
        const [cursorsData, presenceData, awarenessData] = await Promise.all([
          collaborationService.getCursors(contextId, contextType),
          collaborationService.getPresence(contextId, contextType),
          collaborationService.getContextAwareness(contextId, contextType)
        ]);

        setCursors(cursorsData);
        setActiveUsers(presenceData);
        setAwareness(awarenessData);

        // Load editing indicators if we have a document
        if (documentState) {
          const indicators = await collaborationService.getEditingIndicators(documentState.id);
          setEditingIndicators(indicators);
        }
      } catch (error) {
        console.error('Failed to load collaboration data:', error);
      }
    };

    loadInitialData();
  }, [isConnected, contextId, contextType, documentState]);

  return {
    session,
    isConnected,
    connectionStatus,
    activeUsers,
    cursors,
    awareness,
    documentState,
    editingIndicators,
    conflicts,
    actions: {
      joinSession,
      leaveSession,
      sendOperation,
      moveCursor,
      updatePresence,
      startEditing,
      stopEditing,
      broadcastEvent
    }
  };
};

// =====================================
// Activity Feed Hook
// =====================================

export const useActivityFeed = (
  contextId?: string,
  contextType?: string,
  autoLoad: boolean = true
): UseActivityFeedReturn => {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { socket, isConnected: socketConnected } = useSocketContext();

  // Load activities
  const loadActivities = useCallback(async (filters?: ActivityFilter) => {
    try {
      setLoading(true);
      const response = await collaborationService.getActivityFeed(
        contextId,
        contextType,
        filters,
        50,
        0
      );
      
      setActivities(response.activities);
      setUnreadCount(response.unreadCount);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Failed to load activities:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contextId, contextType]);

  // Load more activities
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    try {
      setLoading(true);
      const response = await collaborationService.getActivityFeed(
        contextId,
        contextType,
        undefined,
        50,
        activities.length
      );
      
      setActivities(prev => [...prev, ...response.activities]);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Failed to load more activities:', error);
    } finally {
      setLoading(false);
    }
  }, [contextId, contextType, activities.length, hasMore, loading]);

  // Mark activity as read
  const markAsRead = useCallback(async (activityId: string) => {
    try {
      await collaborationService.markActivityAsRead(activityId);
      setActivities(prev => 
        prev.map(activity => 
          activity.id === activityId ? { ...activity, isRead: true } : activity
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark activity as read:', error);
    }
  }, []);

  // Mark all activities as read
  const markAllAsRead = useCallback(async () => {
    try {
      await collaborationService.markAllActivitiesAsRead(contextId, contextType);
      setActivities(prev => prev.map(activity => ({ ...activity, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all activities as read:', error);
    }
  }, [contextId, contextType]);

  // Add reaction to activity
  const addReaction = useCallback(async (activityId: string, emoji: string) => {
    try {
      await collaborationService.addActivityReaction(activityId, emoji);
      
      // Optimistically update UI
      setActivities(prev => prev.map(activity => {
        if (activity.id === activityId) {
          const reactions = activity.reactions || [];
          const existingReaction = reactions.find(r => r.emoji === emoji && r.userId === 'current-user'); // Replace with actual user ID
          
          if (!existingReaction) {
            return {
              ...activity,
              reactions: [...reactions, {
                userId: 'current-user', // Replace with actual user ID
                user: { id: 'current-user', name: 'Current User', email: '', role: '', status: 'online' }, // Replace with actual user
                emoji,
                timestamp: new Date().toISOString()
              }]
            };
          }
        }
        return activity;
      }));
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }, []);

  // Remove reaction from activity
  const removeReaction = useCallback(async (activityId: string, emoji: string) => {
    try {
      await collaborationService.removeActivityReaction(activityId, emoji);
      
      // Optimistically update UI
      setActivities(prev => prev.map(activity => {
        if (activity.id === activityId) {
          const reactions = activity.reactions || [];
          return {
            ...activity,
            reactions: reactions.filter(r => !(r.emoji === emoji && r.userId === 'current-user'))
          };
        }
        return activity;
      }));
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  }, []);

  // Create new activity
  const createActivity = useCallback(async (activity: Omit<ActivityFeedItem, 'id' | 'timestamp'>) => {
    try {
      await collaborationService.createActivity(activity);
      // The real-time update will handle adding it to the feed
    } catch (error) {
      console.error('Failed to create activity:', error);
    }
  }, []);

  // Real-time activity updates
  useEffect(() => {
    if (!socket || !socketConnected) return;

    const handleNewActivity = (activity: ActivityFeedItem) => {
      setActivities(prev => [activity, ...prev]);
      if (!activity.isRead) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleActivityUpdate = (data: { activityId: string; updates: Partial<ActivityFeedItem> }) => {
      setActivities(prev => 
        prev.map(activity => 
          activity.id === data.activityId ? { ...activity, ...data.updates } : activity
        )
      );
    };

    socket.on('new_activity', handleNewActivity);
    socket.on('activity_updated', handleActivityUpdate);

    return () => {
      socket.off('new_activity', handleNewActivity);
      socket.off('activity_updated', handleActivityUpdate);
    };
  }, [socket, socketConnected]);

  // Auto-load activities
  useEffect(() => {
    if (autoLoad) {
      loadActivities();
    }
  }, [autoLoad, loadActivities]);

  return {
    activities,
    unreadCount,
    loading,
    hasMore,
    actions: {
      loadActivities,
      loadMore,
      markAsRead,
      markAllAsRead,
      addReaction,
      removeReaction,
      createActivity
    }
  };
};

// =====================================
// Comments Hook
// =====================================

export const useComments = (
  contextId: string,
  contextType: string,
  autoLoad: boolean = true
): UseCommentsReturn => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [loading, setLoading] = useState(false);

  const { socket, isConnected: socketConnected } = useSocketContext();

  // Load comments
  const loadComments = useCallback(async (
    loadContextId: string,
    loadContextType: string
  ) => {
    try {
      setLoading(true);
      const [commentsData, threadsData] = await Promise.all([
        collaborationService.getComments(loadContextId, loadContextType, true),
        collaborationService.getCommentThreads(loadContextId, loadContextType)
      ]);
      
      setComments(commentsData);
      setThreads(threadsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add comment
  const addComment = useCallback(async (comment: Omit<Comment, 'id' | 'timestamp'>): Promise<string> => {
    try {
      const commentId = await collaborationService.addComment(comment);
      
      // Optimistically add to UI (real-time update will override if needed)
      const newComment: Comment = {
        ...comment,
        id: commentId,
        timestamp: new Date().toISOString(),
        reactions: [],
        replyCount: 0
      };
      
      setComments(prev => [...prev, newComment]);
      return commentId;
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }, []);

  // Update comment
  const updateComment = useCallback(async (commentId: string, updates: Partial<Comment>) => {
    try {
      await collaborationService.updateComment(commentId, updates);
      
      // Optimistically update UI
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId ? { ...comment, ...updates } : comment
        )
      );
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  }, []);

  // Delete comment
  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await collaborationService.deleteComment(commentId);
      
      // Remove from UI
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }, []);

  // Resolve comment
  const resolveComment = useCallback(async (commentId: string, resolutionNote?: string) => {
    try {
      await collaborationService.resolveComment(commentId, resolutionNote);
      
      // Update UI
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                status: 'resolved',
                resolvedAt: new Date().toISOString(),
                resolutionNote
              }
            : comment
        )
      );
    } catch (error) {
      console.error('Failed to resolve comment:', error);
      throw error;
    }
  }, []);

  // Add reaction to comment
  const addReaction = useCallback(async (commentId: string, emoji: string) => {
    try {
      await collaborationService.addCommentReaction(commentId, emoji);
      
      // Optimistically update UI
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          const reactions = comment.reactions || [];
          const existingReaction = reactions.find(r => r.emoji === emoji && r.userId === 'current-user');
          
          if (!existingReaction) {
            return {
              ...comment,
              reactions: [...reactions, {
                userId: 'current-user',
                user: { id: 'current-user', name: 'Current User', email: '', role: '', status: 'online' },
                emoji,
                timestamp: new Date().toISOString()
              }]
            };
          }
        }
        return comment;
      }));
    } catch (error) {
      console.error('Failed to add reaction to comment:', error);
      throw error;
    }
  }, []);

  // Remove reaction from comment
  const removeReaction = useCallback(async (commentId: string, emoji: string) => {
    try {
      await collaborationService.removeCommentReaction(commentId, emoji);
      
      // Optimistically update UI
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          const reactions = comment.reactions || [];
          return {
            ...comment,
            reactions: reactions.filter(r => !(r.emoji === emoji && r.userId === 'current-user'))
          };
        }
        return comment;
      }));
    } catch (error) {
      console.error('Failed to remove reaction from comment:', error);
      throw error;
    }
  }, []);

  // Real-time comment updates
  useEffect(() => {
    if (!socket || !socketConnected) return;

    const handleNewComment = (comment: Comment) => {
      setComments(prev => [...prev, comment]);
    };

    const handleCommentUpdate = (data: { commentId: string; updates: Partial<Comment> }) => {
      setComments(prev => 
        prev.map(comment => 
          comment.id === data.commentId ? { ...comment, ...data.updates } : comment
        )
      );
    };

    const handleCommentDelete = (data: { commentId: string }) => {
      setComments(prev => prev.filter(comment => comment.id !== data.commentId));
    };

    socket.on('comment_added', handleNewComment);
    socket.on('comment_updated', handleCommentUpdate);
    socket.on('comment_deleted', handleCommentDelete);

    return () => {
      socket.off('comment_added', handleNewComment);
      socket.off('comment_updated', handleCommentUpdate);
      socket.off('comment_deleted', handleCommentDelete);
    };
  }, [socket, socketConnected]);

  // Auto-load comments
  useEffect(() => {
    if (autoLoad && contextId && contextType) {
      loadComments(contextId, contextType);
    }
  }, [autoLoad, contextId, contextType, loadComments]);

  return {
    comments,
    threads,
    loading,
    actions: {
      loadComments,
      addComment,
      updateComment,
      deleteComment,
      resolveComment,
      addReaction,
      removeReaction
    }
  };
};

// =====================================
// Live Selection Hook
// =====================================

export const useLiveSelection = (contextId: string, contextType: string) => {
  const [selections, setSelections] = useState<LiveSelection[]>([]);
  const [highlights, setHighlights] = useState<SharedHighlight[]>([]);

  const { socket, isConnected: socketConnected } = useSocketContext();

  // Update current user's selection
  const updateSelection = useCallback(async (selection: Omit<LiveSelection, 'userId' | 'user' | 'timestamp'>) => {
    try {
      await collaborationService.updateSelection(contextId, contextType, selection);
    } catch (error) {
      console.error('Failed to update selection:', error);
    }
  }, [contextId, contextType]);

  // Clear current user's selection
  const clearSelection = useCallback(async () => {
    try {
      await collaborationService.clearSelection(contextId, contextType);
    } catch (error) {
      console.error('Failed to clear selection:', error);
    }
  }, [contextId, contextType]);

  // Create shared highlight
  const createHighlight = useCallback(async (
    highlight: Omit<SharedHighlight, 'id' | 'createdBy' | 'creator' | 'timestamp'>
  ): Promise<string> => {
    try {
      return await collaborationService.createHighlight(highlight);
    } catch (error) {
      console.error('Failed to create highlight:', error);
      throw error;
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [selectionsData, highlightsData] = await Promise.all([
          collaborationService.getLiveSelections(contextId, contextType),
          collaborationService.getHighlights(contextId, contextType)
        ]);
        
        setSelections(selectionsData);
        setHighlights(highlightsData);
      } catch (error) {
        console.error('Failed to load selection data:', error);
      }
    };

    if (contextId && contextType) {
      loadData();
    }
  }, [contextId, contextType]);

  // Real-time selection updates
  useEffect(() => {
    if (!socket || !socketConnected) return;

    const handleSelectionUpdate = (data: LiveSelection) => {
      setSelections(prev => {
        const updated = prev.filter(s => s.userId !== data.userId);
        return [...updated, data];
      });
    };

    const handleSelectionClear = (data: { userId: string }) => {
      setSelections(prev => prev.filter(s => s.userId !== data.userId));
    };

    const handleHighlightCreated = (highlight: SharedHighlight) => {
      setHighlights(prev => [...prev, highlight]);
    };

    socket.on('selection_updated', handleSelectionUpdate);
    socket.on('selection_cleared', handleSelectionClear);
    socket.on('highlight_created', handleHighlightCreated);

    return () => {
      socket.off('selection_updated', handleSelectionUpdate);
      socket.off('selection_cleared', handleSelectionClear);
      socket.off('highlight_created', handleHighlightCreated);
    };
  }, [socket, socketConnected]);

  return {
    selections,
    highlights,
    actions: {
      updateSelection,
      clearSelection,
      createHighlight
    }
  };
};