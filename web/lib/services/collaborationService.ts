/**
 * Collaboration Service
 * 
 * Handles all real-time collaboration API interactions including
 * sessions, presence, cursors, document editing, comments, and activity feeds.
 */

import { BaseService } from './baseService';
import {
  CollaborationSession,
  JoinSessionRequest,
  JoinSessionResponse,
  SendOperationRequest,
  BroadcastEventRequest,
  UserPresence,
  LiveCursor,
  EditingIndicator,
  DocumentState,
  DocumentChange,
  ConflictResolution,
  SyncConflict,
  Operation,
  ActivityFeedItem,
  ActivityFilter,
  ActivityReaction,
  Comment,
  CommentThread,
  CommentReaction,
  LiveSelection,
  SharedHighlight,
  AwarenessInfo,
  ContextAwareness,
  CollaborationEvent,
  SessionParticipant
} from '@/lib/types/collaboration';

class CollaborationService extends BaseService {
  constructor() {
    super();
  }
  private readonly endpoint = '/collaboration';

  // =====================================
  // Session Management
  // =====================================

  /**
   * Join a collaboration session
   */
  async joinSession(request: JoinSessionRequest): Promise<JoinSessionResponse> {
    const response = await this.post<any>(`${this.endpoint}/sessions/join`, request);
    return response.data;
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(sessionId: string): Promise<void> {
    await this.post<any>(`${this.endpoint}/sessions/${sessionId}/leave`);
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<CollaborationSession> {
    const response = await this.get<any>(`${this.endpoint}/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId?: string): Promise<CollaborationSession[]> {
    const response = await this.get<any>(`${this.endpoint}/sessions`, {
      params: userId ? { user_id: userId } : {}
    });
    return response.data;
  }

  /**
   * Create a new collaboration session
   */
  async createSession(session: {
    contextType: string;
    contextId: string;
    title: string;
    description?: string;
    maxParticipants?: number;
    settings: CollaborationSession['settings'];
  }): Promise<string> {
    const response = await this.post<any>(`${this.endpoint}/sessions`, session);
    return response.data.sessionId;
  }

  /**
   * Update session settings
   */
  async updateSession(
    sessionId: string,
    updates: Partial<Pick<CollaborationSession, 'title' | 'description' | 'maxParticipants' | 'settings'>>
  ): Promise<void> {
    await this.put<any>(`${this.endpoint}/sessions/${sessionId}`, updates);
  }

  /**
   * End a collaboration session
   */
  async endSession(sessionId: string): Promise<void> {
    await this.post<any>(`${this.endpoint}/sessions/${sessionId}/end`);
  }

  // =====================================
  // Presence & Awareness
  // =====================================

  /**
   * Get presence information for a context
   */
  async getPresence(contextId: string, contextType: string): Promise<UserPresence[]> {
    const response = await this.get<any>(`${this.endpoint}/presence/${contextType}/${contextId}`);
    return response.data;
  }

  /**
   * Update user presence
   */
  async updatePresence(
    contextId: string,
    contextType: string,
    presence: Partial<UserPresence>
  ): Promise<void> {
    await this.put<any>(`${this.endpoint}/presence/${contextType}/${contextId}`, presence);
  }

  /**
   * Get context awareness information
   */
  async getContextAwareness(contextId: string, contextType: string): Promise<ContextAwareness> {
    const response = await this.get<any>(`${this.endpoint}/awareness/${contextType}/${contextId}`);
    return response.data;
  }

  /**
   * Update awareness information
   */
  async updateAwareness(
    contextId: string,
    contextType: string,
    awareness: Partial<AwarenessInfo>
  ): Promise<void> {
    await this.put<any>(`${this.endpoint}/awareness/${contextType}/${contextId}`, awareness);
  }

  // =====================================
  // Live Cursors
  // =====================================

  /**
   * Get live cursors for a context
   */
  async getCursors(contextId: string, contextType: string): Promise<LiveCursor[]> {
    const response = await this.get<any>(`${this.endpoint}/cursors/${contextType}/${contextId}`);
    return response.data;
  }

  /**
   * Update cursor position
   */
  async updateCursor(
    contextId: string,
    contextType: string,
    cursor: Omit<LiveCursor, 'userId' | 'user' | 'timestamp'>
  ): Promise<void> {
    await this.put<any>(`${this.endpoint}/cursors/${contextType}/${contextId}`, cursor);
  }

  /**
   * Remove user cursor
   */
  async removeCursor(contextId: string, contextType: string): Promise<void> {
    await this.delete<any>(`${this.endpoint}/cursors/${contextType}/${contextId}`);
  }

  // =====================================
  // Document Operations
  // =====================================

  /**
   * Send document operation
   */
  async sendOperation(request: SendOperationRequest): Promise<void> {
    await this.post<any>(`${this.endpoint}/operations`, request);
  }

  /**
   * Get document state
   */
  async getDocumentState(documentId: string): Promise<DocumentState> {
    const response = await this.get<any>(`${this.endpoint}/documents/${documentId}/state`);
    return response.data;
  }

  /**
   * Get document operations history
   */
  async getOperations(
    documentId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<Operation[]> {
    const response = await this.get<any>(`${this.endpoint}/documents/${documentId}/operations`, {
      params: {
        from_version: fromVersion,
        to_version: toVersion
      }
    });
    return response.data;
  }

  /**
   * Get editing indicators for a document
   */
  async getEditingIndicators(documentId: string): Promise<EditingIndicator[]> {
    const response = await this.get<any>(`${this.endpoint}/documents/${documentId}/indicators`);
    return response.data;
  }

  /**
   * Start editing indicator
   */
  async startEditing(
    documentId: string,
    elementId: string,
    elementType: EditingIndicator['elementType']
  ): Promise<void> {
    await this.post<any>(`${this.endpoint}/documents/${documentId}/editing/start`, {
      element_id: elementId,
      element_type: elementType
    });
  }

  /**
   * Stop editing indicator
   */
  async stopEditing(documentId: string, elementId: string): Promise<void> {
    await this.post<any>(`${this.endpoint}/documents/${documentId}/editing/stop`, {
      element_id: elementId
    });
  }

  /**
   * Get document changes
   */
  async getDocumentChanges(
    documentId: string,
    since?: string,
    limit: number = 100
  ): Promise<DocumentChange[]> {
    const response = await this.get<any>(`${this.endpoint}/documents/${documentId}/changes`, {
      params: {
        since,
        limit
      }
    });
    return response.data;
  }

  /**
   * Revert document change
   */
  async revertChange(documentId: string, changeId: string): Promise<void> {
    await this.post<any>(`${this.endpoint}/documents/${documentId}/changes/${changeId}/revert`);
  }

  // =====================================
  // Conflict Resolution
  // =====================================

  /**
   * Get conflicts for a document
   */
  async getConflicts(documentId: string): Promise<SyncConflict[]> {
    const response = await this.get<any>(`${this.endpoint}/documents/${documentId}/conflicts`);
    return response.data;
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(
    documentId: string,
    conflictId: string,
    resolution: {
      strategy: 'local_wins' | 'remote_wins' | 'merged' | 'manual';
      mergedOperation?: Operation;
    }
  ): Promise<void> {
    await this.post(
      `${this.endpoint}/documents/${documentId}/conflicts/${conflictId}/resolve`,
      resolution
    );
  }

  /**
   * Get conflict resolution options
   */
  async getConflictResolutions(documentId: string): Promise<ConflictResolution[]> {
    const response = await this.get<any>(`${this.endpoint}/documents/${documentId}/resolutions`);
    return response.data;
  }

  // =====================================
  // Activity Feed
  // =====================================

  /**
   * Get activity feed
   */
  async getActivityFeed(
    contextId?: string,
    contextType?: string,
    filters?: ActivityFilter,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    activities: ActivityFeedItem[];
    totalCount: number;
    unreadCount: number;
    hasMore: boolean;
  }> {
    const response = await this.post<any>(`${this.endpoint}/activities/feed`, {
      context_id: contextId,
      context_type: contextType,
      filters,
      limit,
      offset
    });
    return response.data;
  }

  /**
   * Create activity
   */
  async createActivity(activity: Omit<ActivityFeedItem, 'id' | 'timestamp'>): Promise<string> {
    const response = await this.post<any>(`${this.endpoint}/activities`, activity);
    return response.data.activityId;
  }

  /**
   * Mark activity as read
   */
  async markActivityAsRead(activityId: string): Promise<void> {
    await this.post<any>(`${this.endpoint}/activities/${activityId}/read`);
  }

  /**
   * Mark all activities as read
   */
  async markAllActivitiesAsRead(
    contextId?: string,
    contextType?: string
  ): Promise<void> {
    await this.post<any>(`${this.endpoint}/activities/read-all`, {
      context_id: contextId,
      context_type: contextType
    });
  }

  /**
   * Add reaction to activity
   */
  async addActivityReaction(activityId: string, emoji: string): Promise<void> {
    await this.post<any>(`${this.endpoint}/activities/${activityId}/reactions`, {
      emoji
    });
  }

  /**
   * Remove reaction from activity
   */
  async removeActivityReaction(activityId: string, emoji: string): Promise<void> {
    await this.delete<any>(`${this.endpoint}/activities/${activityId}/reactions/${emoji}`);
  }

  /**
   * Get activity reactions
   */
  async getActivityReactions(activityId: string): Promise<ActivityReaction[]> {
    const response = await this.get<any>(`${this.endpoint}/activities/${activityId}/reactions`);
    return response.data;
  }

  // =====================================
  // Comments System
  // =====================================

  /**
   * Get comments for a context
   */
  async getComments(
    contextId: string,
    contextType: string,
    includeResolved: boolean = false
  ): Promise<Comment[]> {
    const response = await this.get<any>(`${this.endpoint}/comments/${contextType}/${contextId}`, {
      params: { include_resolved: includeResolved }
    });
    return response.data;
  }

  /**
   * Add comment
   */
  async addComment(comment: Omit<Comment, 'id' | 'timestamp'>): Promise<string> {
    const response = await this.post<any>(`${this.endpoint}/comments`, comment);
    return response.data.commentId;
  }

  /**
   * Update comment
   */
  async updateComment(commentId: string, updates: Partial<Comment>): Promise<void> {
    await this.put<any>(`${this.endpoint}/comments/${commentId}`, updates);
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string): Promise<void> {
    await this.delete<any>(`${this.endpoint}/comments/${commentId}`);
  }

  /**
   * Resolve comment
   */
  async resolveComment(commentId: string, resolutionNote?: string): Promise<void> {
    await this.post<any>(`${this.endpoint}/comments/${commentId}/resolve`, {
      resolution_note: resolutionNote
    });
  }

  /**
   * Reopen comment
   */
  async reopenComment(commentId: string): Promise<void> {
    await this.post<any>(`${this.endpoint}/comments/${commentId}/reopen`);
  }

  /**
   * Add reaction to comment
   */
  async addCommentReaction(commentId: string, emoji: string): Promise<void> {
    await this.post<any>(`${this.endpoint}/comments/${commentId}/reactions`, {
      emoji
    });
  }

  /**
   * Remove reaction from comment
   */
  async removeCommentReaction(commentId: string, emoji: string): Promise<void> {
    await this.delete<any>(`${this.endpoint}/comments/${commentId}/reactions/${emoji}`);
  }

  /**
   * Get comment threads
   */
  async getCommentThreads(
    contextId: string,
    contextType: string
  ): Promise<CommentThread[]> {
    const response = await this.get<any>(`${this.endpoint}/comments/${contextType}/${contextId}/threads`);
    return response.data;
  }

  /**
   * Get comment thread
   */
  async getCommentThread(threadId: string): Promise<CommentThread> {
    const response = await this.get<any>(`${this.endpoint}/comments/threads/${threadId}`);
    return response.data;
  }

  // =====================================
  // Live Selection & Highlighting
  // =====================================

  /**
   * Get live selections for a context
   */
  async getLiveSelections(contextId: string, contextType: string): Promise<LiveSelection[]> {
    const response = await this.get<any>(`${this.endpoint}/selections/${contextType}/${contextId}`);
    return response.data;
  }

  /**
   * Update live selection
   */
  async updateSelection(
    contextId: string,
    contextType: string,
    selection: Omit<LiveSelection, 'userId' | 'user' | 'timestamp'>
  ): Promise<void> {
    await this.put<any>(`${this.endpoint}/selections/${contextType}/${contextId}`, selection);
  }

  /**
   * Clear user selection
   */
  async clearSelection(contextId: string, contextType: string): Promise<void> {
    await this.delete<any>(`${this.endpoint}/selections/${contextType}/${contextId}`);
  }

  /**
   * Create shared highlight
   */
  async createHighlight(
    highlight: Omit<SharedHighlight, 'id' | 'createdBy' | 'creator' | 'timestamp'>
  ): Promise<string> {
    const response = await this.post<any>(`${this.endpoint}/highlights`, highlight);
    return response.data.highlightId;
  }

  /**
   * Get shared highlights
   */
  async getHighlights(contextId: string, contextType: string): Promise<SharedHighlight[]> {
    const response = await this.get<any>(`${this.endpoint}/highlights/${contextType}/${contextId}`);
    return response.data;
  }

  /**
   * Update shared highlight
   */
  async updateHighlight(highlightId: string, updates: Partial<SharedHighlight>): Promise<void> {
    await this.put<any>(`${this.endpoint}/highlights/${highlightId}`, updates);
  }

  /**
   * Delete shared highlight
   */
  async deleteHighlight(highlightId: string): Promise<void> {
    await this.delete<any>(`${this.endpoint}/highlights/${highlightId}`);
  }

  // =====================================
  // Real-time Events
  // =====================================

  /**
   * Broadcast collaboration event
   */
  async broadcastEvent(request: BroadcastEventRequest): Promise<void> {
    await this.post<any>(`${this.endpoint}/events/broadcast`, request);
  }

  /**
   * Get event history
   */
  async getEventHistory(
    contextId: string,
    contextType: string,
    since?: string,
    limit: number = 100
  ): Promise<CollaborationEvent[]> {
    const response = await this.get<any>(`${this.endpoint}/events/${contextType}/${contextId}`, {
      params: {
        since,
        limit
      }
    });
    return response.data;
  }

  // =====================================
  // Session Participants
  // =====================================

  /**
   * Get session participants
   */
  async getSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
    const response = await this.get<any>(`${this.endpoint}/sessions/${sessionId}/participants`);
    return response.data;
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(
    sessionId: string,
    userId: string,
    role: SessionParticipant['role']
  ): Promise<void> {
    await this.put<any>(`${this.endpoint}/sessions/${sessionId}/participants/${userId}/role`, {
      role
    });
  }

  /**
   * Remove participant from session
   */
  async removeParticipant(sessionId: string, userId: string): Promise<void> {
    await this.delete<any>(`${this.endpoint}/sessions/${sessionId}/participants/${userId}`);
  }

  /**
   * Invite user to session
   */
  async inviteToSession(
    sessionId: string,
    invitations: Array<{
      userId?: string;
      email?: string;
      role: SessionParticipant['role'];
      message?: string;
    }>
  ): Promise<void> {
    await this.post<any>(`${this.endpoint}/sessions/${sessionId}/invite`, {
      invitations
    });
  }

  // =====================================
  // Analytics & Insights
  // =====================================

  /**
   * Get collaboration analytics
   */
  async getCollaborationAnalytics(
    contextId: string,
    contextType: string,
    timeframe: {
      startDate: string;
      endDate: string;
    }
  ): Promise<{
    totalSessions: number;
    totalParticipants: number;
    averageSessionDuration: number;
    totalEdits: number;
    totalComments: number;
    mostActiveUsers: Array<{
      userId: string;
      userName: string;
      editCount: number;
      commentCount: number;
      timeSpent: number;
    }>;
    activityHeatmap: Array<{
      hour: number;
      day: number;
      activityCount: number;
    }>;
    collaborationScore: number;
  }> {
    type AnalyticsResponse = {
      totalSessions: number;
      totalParticipants: number;
      averageSessionDuration: number;
      totalEdits: number;
      totalComments: number;
      mostActiveUsers: Array<{
        userId: string;
        userName: string;
        editCount: number;
        commentCount: number;
        timeSpent: number;
      }>;
      activityHeatmap: Array<{
        hour: number;
        day: number;
        activityCount: number;
      }>;
      collaborationScore: number;
    };
    
    const response = await this.get<AnalyticsResponse>(
      `${this.endpoint}/analytics/${contextType}/${contextId}`,
      {
        params: {
          start_date: timeframe.startDate,
          end_date: timeframe.endDate
        }
      }
    );
    return response.data;
  }

  /**
   * Get user collaboration stats
   */
  async getUserCollaborationStats(
    userId: string,
    timeframe: {
      startDate: string;
      endDate: string;
    }
  ): Promise<{
    sessionsJoined: number;
    totalTimeSpent: number; // minutes
    editsCount: number;
    commentsCount: number;
    collaborationScore: number;
    topCollaborators: Array<{
      userId: string;
      userName: string;
      collaborationCount: number;
    }>;
    activityDistribution: {
      editing: number;
      commenting: number;
      reviewing: number;
      viewing: number;
    };
  }> {
    const response = await this.get<any>(`${this.endpoint}/analytics/users/${userId}`, {
      params: {
        start_date: timeframe.startDate,
        end_date: timeframe.endDate
      }
    });
    return response.data;
  }

  // =====================================
  // Permissions & Access Control
  // =====================================

  /**
   * Check user permissions for context
   */
  async checkPermissions(
    contextId: string,
    contextType: string,
    userId?: string
  ): Promise<{
    canView: boolean;
    canEdit: boolean;
    canComment: boolean;
    canShare: boolean;
    canManage: boolean;
    role: string;
  }> {
    type PermissionsResponse = {
      canView: boolean;
      canEdit: boolean;
      canComment: boolean;
      canShare: boolean;
      canManage: boolean;
      role: string;
    };
    
    const response = await this.get<PermissionsResponse>(
      `${this.endpoint}/permissions/${contextType}/${contextId}`,
      {
        params: userId ? { user_id: userId } : {}
      }
    );
    return response.data;
  }

  /**
   * Update context permissions
   */
  async updatePermissions(
    contextId: string,
    contextType: string,
    permissions: Array<{
      userId: string;
      role: 'owner' | 'editor' | 'commenter' | 'viewer';
      permissions: {
        canView: boolean;
        canEdit: boolean;
        canComment: boolean;
        canShare: boolean;
      };
    }>
  ): Promise<void> {
    await this.put<any>(`${this.endpoint}/permissions/${contextType}/${contextId}`, {
      permissions
    });
  }

  // =====================================
  // Search & Discovery
  // =====================================

  /**
   * Search across collaborative content
   */
  async searchCollaborativeContent(
    query: string,
    filters?: {
      contextTypes?: string[];
      contextIds?: string[];
      contentTypes?: ('comments' | 'documents' | 'activities')[];
      users?: string[];
      dateRange?: {
        startDate: string;
        endDate: string;
      };
    },
    limit: number = 50
  ): Promise<{
    results: Array<{
      id: string;
      type: 'comment' | 'document' | 'activity';
      title: string;
      excerpt: string;
      contextId: string;
      contextType: string;
      userId: string;
      userName: string;
      timestamp: string;
      relevanceScore: number;
    }>;
    totalCount: number;
    facets: {
      contentTypes: Record<string, number>;
      contexts: Record<string, number>;
      users: Record<string, number>;
    };
  }> {
    const response = await this.post<any>(`${this.endpoint}/search`, {
      query,
      filters,
      limit
    });
    return response.data;
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService();
