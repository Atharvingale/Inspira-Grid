/**
 * Real-time Collaboration Types
 * 
 * TypeScript interfaces for live collaboration features including
 * cursors, presence, document editing, and activity feeds.
 */

// =====================================
// Core Collaboration Types
// =====================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
}

export interface CollaborationContext {
  type: 'project' | 'document' | 'canvas' | 'whiteboard' | 'chat';
  id: string;
  title: string;
  permissions: CollaborationPermissions;
}

export interface CollaborationPermissions {
  canEdit: boolean;
  canComment: boolean;
  canView: boolean;
  canShare: boolean;
  isOwner: boolean;
  role: 'owner' | 'editor' | 'commenter' | 'viewer';
}

// =====================================
// Live Cursors & Presence
// =====================================

export interface LiveCursor {
  userId: string;
  user: User;
  position: {
    x: number;
    y: number;
  };
  elementId?: string; // ID of focused element
  elementType?: 'input' | 'textarea' | 'contenteditable' | 'canvas' | 'button' | 'link';
  timestamp: string;
  isActive: boolean;
  color: string; // User's assigned color
  label?: string; // Optional cursor label
}

export interface UserPresence {
  userId: string;
  user: User;
  status: 'active' | 'idle' | 'away' | 'offline';
  lastSeen: string;
  currentContext?: CollaborationContext;
  currentLocation?: {
    url: string;
    title: string;
    elementId?: string;
  };
  device: {
    type: 'desktop' | 'tablet' | 'mobile';
    browser: string;
    os: string;
  };
  joinedAt: string;
  isTyping: boolean;
  typingLocation?: string; // Element ID where user is typing
}

export interface PresenceUpdate {
  userId: string;
  type: 'join' | 'leave' | 'update' | 'cursor_move' | 'typing_start' | 'typing_stop';
  data?: Partial<UserPresence | LiveCursor>;
  timestamp: string;
  contextId: string;
  contextType: string;
}

// =====================================
// Document Editing Indicators
// =====================================

export interface EditingIndicator {
  id: string;
  userId: string;
  user: User;
  elementId: string;
  elementType: 'text' | 'image' | 'table' | 'list' | 'heading' | 'code' | 'custom';
  action: 'editing' | 'selecting' | 'commenting' | 'reviewing';
  startTime: string;
  lastUpdate: string;
  position?: {
    start: number;
    end: number;
  };
  content?: string; // Current content being edited
  isDirty: boolean; // Has unsaved changes
  color: string;
}

export interface DocumentChange {
  id: string;
  userId: string;
  user: User;
  timestamp: string;
  type: 'insert' | 'delete' | 'replace' | 'format' | 'move';
  elementId: string;
  position: {
    start: number;
    end: number;
  };
  oldContent?: string;
  newContent?: string;
  metadata?: {
    formatting?: Record<string, any>;
    attributes?: Record<string, any>;
  };
  isReverted?: boolean;
}

export interface ConflictResolution {
  id: string;
  documentId: string;
  conflictType: 'concurrent_edit' | 'version_mismatch' | 'permission_changed';
  users: User[];
  changes: DocumentChange[];
  resolution: 'merge' | 'overwrite' | 'manual' | 'pending';
  resolvedBy?: string;
  resolvedAt?: string;
  strategy: 'last_write_wins' | 'operational_transform' | 'three_way_merge' | 'user_choice';
}

// =====================================
// Activity Feed
// =====================================

export interface ActivityFeedItem {
  id: string;
  type: 'user_joined' | 'user_left' | 'document_created' | 'document_edited' | 'document_shared' | 
        'comment_added' | 'comment_resolved' | 'task_assigned' | 'task_completed' | 'milestone_reached' |
        'file_uploaded' | 'file_downloaded' | 'meeting_started' | 'meeting_ended' | 'permission_changed';
  
  userId: string;
  user: User;
  timestamp: string;
  
  // Context information
  contextType: 'project' | 'document' | 'task' | 'comment' | 'file' | 'meeting' | 'team';
  contextId: string;
  contextTitle: string;
  
  // Action details
  action: string; // Human-readable action description
  details?: {
    oldValue?: any;
    newValue?: any;
    additionalData?: Record<string, any>;
  };
  
  // Visual information
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Interaction data
  reactions?: ActivityReaction[];
  isRead: boolean;
  mentions?: string[]; // User IDs mentioned in activity
  
  // Grouping
  groupId?: string; // For grouping similar activities
  groupCount?: number;
}

export interface ActivityReaction {
  userId: string;
  user: User;
  emoji: string;
  timestamp: string;
}

export interface ActivityFilter {
  types?: ActivityFeedItem['type'][];
  users?: string[];
  contextTypes?: string[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  priority?: ActivityFeedItem['priority'][];
  isRead?: boolean;
  mentions?: boolean; // Show only items mentioning current user
}

export interface ActivityFeedConfig {
  realTime: boolean;
  groupSimilar: boolean;
  showReactions: boolean;
  maxItems: number;
  refreshInterval: number; // seconds
  filters: ActivityFilter;
  notifications: {
    enabled: boolean;
    types: ActivityFeedItem['type'][];
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
}

// =====================================
// Real-time Comments & Annotations
// =====================================

export interface Comment {
  id: string;
  authorId: string;
  author: User;
  content: string;
  timestamp: string;
  updatedAt?: string;
  
  // Location information
  contextType: 'document' | 'canvas' | 'code' | 'design' | 'task';
  contextId: string;
  elementId?: string;
  position?: {
    x: number;
    y: number;
    page?: number;
    line?: number;
    column?: number;
  };
  
  // Comment properties
  status: 'open' | 'resolved' | 'archived';
  priority: 'low' | 'medium' | 'high';
  isPrivate: boolean;
  
  // Threading
  parentId?: string; // For reply threads
  replies?: Comment[];
  replyCount: number;
  
  // Interactions
  reactions: CommentReaction[];
  mentions: string[]; // User IDs mentioned
  assignees: string[]; // Users assigned to resolve
  
  // Resolution
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  
  // Visual styling
  color: string;
  isHighlighted: boolean;
}

export interface CommentReaction {
  userId: string;
  user: User;
  emoji: string;
  timestamp: string;
}

export interface CommentThread {
  id: string;
  rootComment: Comment;
  replies: Comment[];
  participants: User[];
  lastActivity: string;
  isActive: boolean;
  unreadCount: number;
}

// =====================================
// Live Selection & Highlighting
// =====================================

export interface LiveSelection {
  userId: string;
  user: User;
  selectionId: string;
  elementId: string;
  range: {
    startOffset: number;
    endOffset: number;
    startContainer?: string;
    endContainer?: string;
  };
  text: string;
  timestamp: string;
  color: string;
  isTemporary: boolean; // Clears after a timeout
  intent: 'select' | 'copy' | 'cut' | 'highlight' | 'comment' | 'edit';
}

export interface SharedHighlight {
  id: string;
  createdBy: string;
  creator: User;
  elementId: string;
  range: {
    startOffset: number;
    endOffset: number;
  };
  text: string;
  color: string;
  note?: string;
  timestamp: string;
  isVisible: boolean;
  permissions: {
    canEdit: string[]; // User IDs who can edit
    canView: string[]; // User IDs who can view
  };
  tags: string[];
}

// =====================================
// Operational Transform & Sync
// =====================================

export interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'retain' | 'format' | 'move';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  userId: string;
  timestamp: string;
  contextId: string;
  version: number;
}

export interface DocumentState {
  id: string;
  content: string;
  version: number;
  lastModified: string;
  lastModifiedBy: string;
  checksum: string;
  operations: Operation[];
  activeEditors: string[];
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
}

export interface SyncConflict {
  id: string;
  documentId: string;
  localOperation: Operation;
  remoteOperation: Operation;
  conflictType: 'position' | 'content' | 'concurrent';
  timestamp: string;
  resolution?: 'local_wins' | 'remote_wins' | 'merged' | 'manual';
  mergedOperation?: Operation;
}

// =====================================
// Collaborative Sessions
// =====================================

export interface CollaborationSession {
  id: string;
  contextType: string;
  contextId: string;
  title: string;
  description?: string;
  
  // Session management
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
  host: User;
  
  // Participants
  participants: SessionParticipant[];
  maxParticipants?: number;
  
  // Session settings
  settings: {
    allowAnonymous: boolean;
    requirePermission: boolean;
    enableVoiceChat: boolean;
    enableVideoChat: boolean;
    enableScreenShare: boolean;
    recordSession: boolean;
    allowComments: boolean;
    autoSave: boolean;
    autoSaveInterval: number; // seconds
  };
  
  // Activity tracking
  totalEdits: number;
  totalComments: number;
  totalParticipants: number;
  peakConcurrentUsers: number;
  averageSessionTime: number; // minutes
}

export interface SessionParticipant {
  userId: string;
  user: User;
  joinedAt: string;
  leftAt?: string;
  isActive: boolean;
  role: 'host' | 'co-host' | 'participant' | 'observer';
  permissions: CollaborationPermissions;
  
  // Activity stats
  editCount: number;
  commentCount: number;
  timeSpent: number; // minutes
  lastActivity: string;
  
  // Real-time status
  isTyping: boolean;
  currentFocus?: string; // Element ID
  cursor?: LiveCursor;
}

// =====================================
// Awareness & Context
// =====================================

export interface AwarenessInfo {
  userId: string;
  user: User;
  contextId: string;
  contextType: string;
  
  // Current state
  isActive: boolean;
  lastSeen: string;
  currentAction?: string;
  focusedElement?: string;
  
  // Location in document/interface
  viewport?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  scrollPosition?: {
    x: number;
    y: number;
  };
  
  // Interaction state
  isSelecting: boolean;
  isEditing: boolean;
  isCommenting: boolean;
  hasUnsavedChanges: boolean;
  
  // Collaboration preferences
  preferences: {
    showCursor: boolean;
    showPresence: boolean;
    showTypingIndicator: boolean;
    soundNotifications: boolean;
    colorScheme: string;
  };
}

export interface ContextAwareness {
  contextId: string;
  contextType: string;
  activeUsers: AwarenessInfo[];
  totalUsers: number;
  lastActivity: string;
  
  // Aggregated statistics
  currentEditors: number;
  currentViewers: number;
  currentCommenters: number;
  
  // Hot spots - areas with most activity
  hotSpots: Array<{
    elementId: string;
    userCount: number;
    activityType: string;
    intensity: number; // 0-100
  }>;
}

// =====================================
// WebSocket Events
// =====================================

export interface CollaborationEvent {
  type: 'presence_update' | 'cursor_move' | 'editing_start' | 'editing_stop' | 
        'document_change' | 'comment_added' | 'comment_updated' | 'comment_resolved' |
        'selection_change' | 'focus_change' | 'typing_start' | 'typing_stop' |
        'user_join' | 'user_leave' | 'session_start' | 'session_end' |
        'conflict_detected' | 'conflict_resolved' | 'activity_created';
  
  payload: any;
  userId: string;
  contextId: string;
  contextType: string;
  timestamp: string;
  eventId: string;
  version?: number;
}

export interface CollaborationMessage {
  event: CollaborationEvent;
  recipients?: string[]; // Specific users to send to (broadcast if empty)
  excludeUsers?: string[]; // Users to exclude from broadcast
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requiresAck?: boolean; // Requires acknowledgment
}

// =====================================
// API Request/Response Types
// =====================================

export interface JoinSessionRequest {
  contextType: string;
  contextId: string;
  permissions?: Partial<CollaborationPermissions>;
  preferences?: Partial<AwarenessInfo['preferences']>;
}

export interface JoinSessionResponse {
  sessionId: string;
  session: CollaborationSession;
  currentState: DocumentState;
  activeParticipants: SessionParticipant[];
  userColor: string;
  permissions: CollaborationPermissions;
}

export interface SendOperationRequest {
  sessionId: string;
  operation: Omit<Operation, 'id' | 'userId' | 'timestamp'>;
}

export interface BroadcastEventRequest {
  sessionId: string;
  event: Omit<CollaborationEvent, 'eventId' | 'timestamp'>;
  recipients?: string[];
}

// =====================================
// Component Props
// =====================================

export interface LiveCursorsProps {
  cursors: LiveCursor[];
  currentUserId: string;
  containerRef: React.RefObject<HTMLElement>;
  showLabels?: boolean;
  fadeTimeout?: number;
  className?: string;
}

export interface PresenceIndicatorProps {
  users: UserPresence[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showTooltip?: boolean;
  onClick?: (user: User) => void;
  className?: string;
}

export interface ActivityFeedProps {
  activities: ActivityFeedItem[];
  config: ActivityFeedConfig;
  onActivityClick?: (activity: ActivityFeedItem) => void;
  onReaction?: (activityId: string, emoji: string) => void;
  onMarkAsRead?: (activityId: string) => void;
  onLoadMore?: () => void;
  loading?: boolean;
  hasMore?: boolean;
  className?: string;
}

export interface CollaborativeEditorProps {
  documentId: string;
  initialContent?: string;
  permissions: CollaborationPermissions;
  onContentChange?: (content: string, operation: Operation) => void;
  onCursorMove?: (position: { x: number; y: number }) => void;
  onSelectionChange?: (selection: LiveSelection) => void;
  showOtherCursors?: boolean;
  showEditingIndicators?: boolean;
  className?: string;
}

export interface CommentSystemProps {
  contextId: string;
  contextType: string;
  comments: Comment[];
  currentUser: User;
  permissions: CollaborationPermissions;
  onAddComment?: (comment: Omit<Comment, 'id' | 'timestamp'>) => void;
  onResolveComment?: (commentId: string) => void;
  onReactToComment?: (commentId: string, emoji: string) => void;
  showResolved?: boolean;
  allowThreading?: boolean;
  className?: string;
}

// =====================================
// Hook Return Types
// =====================================

export interface UseCollaborationReturn {
  // Session management
  session: CollaborationSession | null;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  
  // Presence & awareness
  activeUsers: UserPresence[];
  cursors: LiveCursor[];
  awareness: ContextAwareness | null;
  
  // Document state
  documentState: DocumentState | null;
  editingIndicators: EditingIndicator[];
  conflicts: SyncConflict[];
  
  // Actions
  actions: {
    joinSession: (request: JoinSessionRequest) => Promise<void>;
    leaveSession: () => Promise<void>;
    sendOperation: (operation: Omit<Operation, 'id' | 'userId' | 'timestamp'>) => void;
    moveCursor: (position: { x: number; y: number }, elementId?: string) => void;
    updatePresence: (updates: Partial<UserPresence>) => void;
    startEditing: (elementId: string) => void;
    stopEditing: (elementId: string) => void;
    broadcastEvent: (event: Omit<CollaborationEvent, 'eventId' | 'timestamp'>) => void;
  };
}

export interface UseActivityFeedReturn {
  activities: ActivityFeedItem[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  
  actions: {
    loadActivities: (filters?: ActivityFilter) => Promise<void>;
    loadMore: () => Promise<void>;
    markAsRead: (activityId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    addReaction: (activityId: string, emoji: string) => Promise<void>;
    removeReaction: (activityId: string, emoji: string) => Promise<void>;
    createActivity: (activity: Omit<ActivityFeedItem, 'id' | 'timestamp'>) => Promise<void>;
  };
}

export interface UseCommentsReturn {
  comments: Comment[];
  threads: CommentThread[];
  loading: boolean;
  
  actions: {
    loadComments: (contextId: string, contextType: string) => Promise<void>;
    addComment: (comment: Omit<Comment, 'id' | 'timestamp'>) => Promise<string>;
    updateComment: (commentId: string, updates: Partial<Comment>) => Promise<void>;
    deleteComment: (commentId: string) => Promise<void>;
    resolveComment: (commentId: string, resolutionNote?: string) => Promise<void>;
    addReaction: (commentId: string, emoji: string) => Promise<void>;
    removeReaction: (commentId: string, emoji: string) => Promise<void>;
  };
}

// =====================================
// Configuration Types
// =====================================

export interface CollaborationConfig {
  // WebSocket settings
  wsUrl: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  
  // Cursor settings
  cursorFadeTimeout: number;
  cursorColors: string[];
  showCursorLabels: boolean;
  
  // Presence settings
  idleTimeout: number; // seconds
  awayTimeout: number; // seconds
  presenceUpdateInterval: number; // seconds
  
  // Document sync
  operationBatchSize: number;
  syncInterval: number; // milliseconds
  conflictResolutionStrategy: 'last_write_wins' | 'operational_transform' | 'manual';
  
  // Activity feed
  maxActivities: number;
  activityGroupingWindow: number; // minutes
  realTimeUpdates: boolean;
  
  // Comments
  maxCommentLength: number;
  allowAnonymousComments: boolean;
  autoResolveTimeout: number; // days
  
  // Performance
  throttleInterval: number; // milliseconds
  batchUpdates: boolean;
  enableCompression: boolean;
  
  // Features
  enableVoiceChat: boolean;
  enableVideoChat: boolean;
  enableScreenShare: boolean;
  enableFileSharing: boolean;
  enableWhiteboard: boolean;
}