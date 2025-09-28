/**
 * API Endpoints and WebSocket Events Configuration
 * 
 * Centralized configuration for all API endpoints and real-time events
 * used throughout the application.
 */

// Environment configuration
export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
    url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000')
  },
  
  // WebSocket Configuration
  websocket: {
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000',
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000
  },
  
  // Feature flags
  features: {
    realTime: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === 'true',
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    collaboration: true,
    videoCall: true,
    messaging: true
  },
  
  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES?.split(',') || [
      'image/*', 'video/*', '.pdf', '.doc', '.docx', '.txt', '.zip'
    ],
    endpoint: '/upload'
  },
  
  // Collaboration settings
  collaboration: {
    timeout: parseInt(process.env.NEXT_PUBLIC_COLLABORATION_TIMEOUT || '30000'),
    cursorFadeTimeout: parseInt(process.env.NEXT_PUBLIC_CURSOR_FADE_TIMEOUT || '3000'),
    maxConcurrentUsers: 50,
    syncInterval: 100 // milliseconds
  }
};

// API Endpoints
export const endpoints = {
  // Authentication
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    register: '/auth/register',
    profile: '/auth/profile',
    refreshToken: '/auth/refresh'
  },
  
  // Projects
  projects: {
    base: '/projects',
    byId: (id: string) => `/projects/${id}`,
    applications: (id: string) => `/projects/${id}/applications`,
    members: (id: string) => `/projects/${id}/members`,
    analytics: (id: string) => `/projects/${id}/analytics`
  },
  
  // Applications
  applications: {
    base: '/applications',
    byId: (id: string) => `/applications/${id}`,
    approve: (id: string) => `/applications/${id}/approve`,
    reject: (id: string) => `/applications/${id}/reject`,
    review: (id: string) => `/applications/${id}/review`
  },
  
  // Teams
  teams: {
    base: '/teams',
    byId: (id: string) => `/teams/${id}`,
    members: (id: string) => `/teams/${id}/members`,
    projects: (id: string) => `/teams/${id}/projects`
  },
  
  // Messaging
  messaging: {
    conversations: '/messaging/conversations',
    conversation: (id: string) => `/messaging/conversations/${id}`,
    messages: (conversationId: string) => `/messaging/conversations/${conversationId}/messages`,
    message: (conversationId: string, messageId: string) => 
      `/messaging/conversations/${conversationId}/messages/${messageId}`,
    reactions: (conversationId: string, messageId: string) => 
      `/messaging/conversations/${conversationId}/messages/${messageId}/reactions`,
    threads: (conversationId: string, messageId: string) => 
      `/messaging/conversations/${conversationId}/messages/${messageId}/threads`,
    search: '/messaging/search',
    media: '/messaging/media'
  },
  
  // Video Calls
  videoCalls: {
    base: '/video-calls',
    call: (id: string) => `/video-calls/${id}`,
    join: (id: string) => `/video-calls/${id}/join`,
    leave: (id: string) => `/video-calls/${id}/leave`,
    recording: (id: string) => `/video-calls/${id}/recording`,
    schedule: '/video-calls/schedule'
  },
  
  // Collaboration
  collaboration: {
    sessions: '/collaboration/sessions',
    session: (id: string) => `/collaboration/sessions/${id}`,
    join: '/collaboration/sessions/join',
    leave: (sessionId: string) => `/collaboration/sessions/${sessionId}/leave`,
    presence: (contextType: string, contextId: string) => 
      `/collaboration/presence/${contextType}/${contextId}`,
    cursors: (contextType: string, contextId: string) => 
      `/collaboration/cursors/${contextType}/${contextId}`,
    operations: '/collaboration/operations',
    documents: (id: string) => `/collaboration/documents/${id}`,
    comments: '/collaboration/comments',
    highlights: '/collaboration/highlights',
    awareness: (contextType: string, contextId: string) => 
      `/collaboration/awareness/${contextType}/${contextId}`,
    activities: '/collaboration/activities'
  },
  
  // Analytics
  analytics: {
    dashboard: '/analytics/dashboard',
    projects: (id: string) => `/analytics/projects/${id}`,
    teams: (id: string) => `/analytics/teams/${id}`,
    users: (id: string) => `/analytics/users/${id}`,
    financial: '/analytics/financial',
    productivity: (scope: string, id: string) => `/analytics/productivity/${scope}/${id}`,
    reports: '/analytics/reports',
    templates: '/analytics/reports/templates',
    export: '/analytics/export',
    charts: (type: string) => `/analytics/charts/${type}`,
    alerts: '/analytics/alerts',
    benchmarks: '/analytics/benchmarks'
  },
  
  // Time Tracking
  timeTracking: {
    base: '/time-tracking',
    entries: '/time-tracking/entries',
    entry: (id: string) => `/time-tracking/entries/${id}`,
    timers: '/time-tracking/timers',
    timesheets: '/time-tracking/timesheets',
    reports: '/time-tracking/reports',
    approvals: '/time-tracking/approvals'
  },
  
  // Milestones
  milestones: {
    base: '/milestones',
    byId: (id: string) => `/milestones/${id}`,
    project: (projectId: string) => `/milestones/project/${projectId}`,
    templates: '/milestones/templates',
    dependencies: (id: string) => `/milestones/${id}/dependencies`,
    activities: (id: string) => `/milestones/${id}/activities`
  },
  
  // File Management
  files: {
    upload: '/files/upload',
    download: (id: string) => `/files/${id}/download`,
    delete: (id: string) => `/files/${id}`,
    metadata: (id: string) => `/files/${id}/metadata`,
    preview: (id: string) => `/files/${id}/preview`
  },
  
  // Notifications
  notifications: {
    base: '/notifications',
    read: (id: string) => `/notifications/${id}/read`,
    readAll: '/notifications/read-all',
    settings: '/notifications/settings',
    subscribe: '/notifications/subscribe',
    unsubscribe: '/notifications/unsubscribe'
  }
};

// WebSocket Events
export const socketEvents = {
  // Connection events
  connection: {
    connect: 'connect',
    disconnect: 'disconnect',
    reconnect: 'reconnect',
    error: 'connect_error'
  },
  
  // Room management
  rooms: {
    join: 'join_room',
    leave: 'leave_room',
    joinUser: 'join_user_room',
    joinProject: 'join_project_room',
    leaveProject: 'leave_project_room',
    joinTeam: 'join_team_room',
    leaveTeam: 'leave_team_room',
    joinConversation: 'join_conversation_room',
    leaveConversation: 'leave_conversation_room'
  },
  
  // User presence
  presence: {
    online: 'user_online',
    offline: 'user_offline',
    onlineUsers: 'online_users',
    statusUpdate: 'user_status_update'
  },
  
  // Messaging
  messaging: {
    message: 'message',
    messageUpdate: 'message_update',
    messageDelete: 'message_delete',
    reaction: 'message_reaction',
    typingStart: 'typing_start',
    typingStop: 'typing_stop',
    threadReply: 'thread_reply',
    conversationUpdate: 'conversation_update'
  },
  
  // Collaboration
  collaboration: {
    join: 'join_collaboration',
    leave: 'leave_collaboration',
    event: 'collaboration_event',
    presenceUpdate: 'presence_update',
    cursorMove: 'cursor_move',
    editingStart: 'editing_start',
    editingStop: 'editing_stop',
    documentChange: 'document_change',
    selectionChange: 'selection_change',
    focusChange: 'focus_change',
    userJoin: 'user_join',
    userLeave: 'user_leave',
    conflictDetected: 'conflict_detected',
    conflictResolved: 'conflict_resolved',
    commentAdded: 'comment_added',
    commentUpdated: 'comment_updated',
    commentResolved: 'comment_resolved'
  },
  
  // Video calls
  videoCalls: {
    callCreated: 'call_created',
    callStarted: 'call_started',
    callEnded: 'call_ended',
    userJoined: 'call_user_joined',
    userLeft: 'call_user_left',
    mediaToggle: 'call_media_toggle',
    screenShare: 'call_screen_share',
    recordingStart: 'call_recording_start',
    recordingStop: 'call_recording_stop',
    qualityUpdate: 'call_quality_update'
  },
  
  // Notifications
  notifications: {
    new: 'notification',
    update: 'notification_update',
    read: 'notification_read',
    settings: 'notification_settings_update'
  },
  
  // Project updates
  projects: {
    update: 'project_update',
    memberAdded: 'project_member_added',
    memberRemoved: 'project_member_removed',
    statusChange: 'project_status_change',
    deadlineUpdate: 'project_deadline_update'
  },
  
  // Application updates
  applications: {
    new: 'application_submitted',
    statusUpdate: 'application_status_update',
    review: 'application_reviewed',
    approved: 'application_approved',
    rejected: 'application_rejected'
  },
  
  // Team updates
  teams: {
    update: 'team_update',
    memberAdded: 'team_member_added',
    memberRemoved: 'team_member_removed',
    roleUpdate: 'team_role_update'
  },
  
  // Activity feed
  activities: {
    new: 'new_activity',
    update: 'activity_updated',
    reaction: 'activity_reaction'
  },
  
  // Analytics
  analytics: {
    update: 'analytics_update',
    reportGenerated: 'report_generated',
    alertTriggered: 'alert_triggered'
  }
};

// Error codes
export const errorCodes = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // File errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  
  // Collaboration errors
  COLLABORATION_SESSION_NOT_FOUND: 'COLLABORATION_SESSION_NOT_FOUND',
  COLLABORATION_PERMISSION_DENIED: 'COLLABORATION_PERMISSION_DENIED',
  COLLABORATION_CONFLICT: 'COLLABORATION_CONFLICT',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

// HTTP status codes mapping
export const statusCodes = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const;

// Export default configuration
export default {
  config,
  endpoints,
  socketEvents,
  errorCodes,
  statusCodes
};