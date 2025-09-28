/**
 * Enhanced Messaging System Types
 * 
 * Comprehensive type definitions for the real-time messaging system
 * including conversations, messages, reactions, threads, and file sharing.
 */

// Basic Message type for compatibility
export type Message = EnhancedMessage;

export interface EnhancedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: 'text' | 'file' | 'image' | 'video' | 'audio' | 'system' | 'call';
  
  // Message status and timestamps
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
  deletedAt?: string;
  
  // Rich content
  attachments?: MessageAttachment[];
  embeds?: MessageEmbed[];
  mentions?: MessageMention[];
  
  // Thread support
  threadId?: string;
  parentMessageId?: string;
  replyCount?: number;
  
  // Reactions
  reactions?: MessageReaction[];
  
  // Metadata
  metadata?: {
    edited?: boolean;
    forwarded?: boolean;
    originalMessageId?: string;
    callDuration?: number;
    callParticipants?: string[];
  };
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize: number;
  mimeType: string;
  uploadStatus: 'uploading' | 'uploaded' | 'failed';
  uploadProgress?: number;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number; // for video/audio files
  };
}

export interface MessageEmbed {
  type: 'link' | 'image' | 'video' | 'rich';
  url: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  siteName?: string;
  color?: string;
}

export interface MessageMention {
  userId: string;
  userName: string;
  startIndex: number;
  length: number;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  hasReacted: boolean; // for current user
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'project' | 'team';
  name?: string;
  description?: string;
  avatar?: string;
  
  // Participants
  participants: ConversationParticipant[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Latest message info
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    messageType: EnhancedMessage['messageType'];
  };
  
  // Conversation settings
  settings: {
    muted: boolean;
    mutedUntil?: string;
    notifications: boolean;
    archived: boolean;
    pinned: boolean;
  };
  
  // Metadata
  metadata?: {
    projectId?: string;
    teamId?: string;
    purpose?: string;
    topic?: string;
  };
  
  // Unread tracking
  unreadCount: number;
  lastReadMessageId?: string;
  lastSeenAt?: string;
}

export interface ConversationParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  lastSeenAt?: string;
  permissions: {
    canSendMessages: boolean;
    canAddMembers: boolean;
    canRemoveMembers: boolean;
    canEditConversation: boolean;
    canDeleteMessages: boolean;
  };
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  conversationId: string;
  timestamp: string;
}

export interface MessageDraft {
  id: string;
  conversationId: string;
  content: string;
  attachments?: File[];
  mentionedUsers?: string[];
  replyToMessageId?: string;
  lastModified: string;
}

// Real-time events
export interface MessagingSocketEvents {
  // Message events
  'message:new': EnhancedMessage;
  'message:updated': { messageId: string; updates: Partial<EnhancedMessage> };
  'message:deleted': { messageId: string; conversationId: string };
  'message:reaction_added': { messageId: string; reaction: MessageReaction };
  'message:reaction_removed': { messageId: string; emoji: string; userId: string };
  'message:read': { messageId: string; conversationId: string; userId: string };
  
  // Conversation events
  'conversation:created': Conversation;
  'conversation:updated': { conversationId: string; updates: Partial<Conversation> };
  'conversation:participant_added': { conversationId: string; participant: ConversationParticipant };
  'conversation:participant_removed': { conversationId: string; userId: string };
  'conversation:archived': { conversationId: string };
  
  // Typing events
  'typing:start': TypingIndicator;
  'typing:stop': { userId: string; conversationId: string };
  
  // Presence events
  'user:online': { userId: string; lastSeen: string };
  'user:offline': { userId: string; lastSeen: string };
  'user:status_changed': { userId: string; status: UserPresenceStatus };
}

export interface UserPresenceStatus {
  status: 'online' | 'away' | 'busy' | 'offline';
  customMessage?: string;
  lastSeen: string;
}

// API interfaces
export interface CreateConversationRequest {
  type: Conversation['type'];
  name?: string;
  description?: string;
  participantIds: string[];
  projectId?: string;
  teamId?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'file' | 'image';
  attachments?: File[];
  replyToMessageId?: string;
  mentionedUserIds?: string[];
}

export interface MessageSearchParams {
  conversationId?: string;
  query?: string;
  messageType?: EnhancedMessage['messageType'];
  senderId?: string;
  startDate?: string;
  endDate?: string;
  hasAttachments?: boolean;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

export interface MessagesLoadOptions {
  conversationId: string;
  limit?: number;
  before?: string; // message ID
  after?: string; // message ID
  includeThreads?: boolean;
}

// Component props interfaces
export interface MessageListProps {
  conversationId: string;
  messages: EnhancedMessage[];
  currentUserId: string;
  onMessageClick?: (message: EnhancedMessage) => void;
  onReactionAdd?: (messageId: string, emoji: string) => void;
  onReactionRemove?: (messageId: string, emoji: string) => void;
  onReplyClick?: (message: EnhancedMessage) => void;
  onEditClick?: (message: EnhancedMessage) => void;
  onDeleteClick?: (message: EnhancedMessage) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export interface MessageInputProps {
  conversationId: string;
  placeholder?: string;
  replyToMessage?: EnhancedMessage;
  draft?: MessageDraft;
  onSendMessage: (request: SendMessageRequest) => Promise<void>;
  onDraftSave?: (draft: MessageDraft) => void;
  onReplyCancel?: () => void;
  disabled?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

export interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onConversationCreate?: () => void;
  onConversationArchive?: (conversationId: string) => void;
  onConversationMute?: (conversationId: string) => void;
  currentUserId: string;
  searchQuery?: string;
  filter?: 'all' | 'unread' | 'pinned' | 'archived';
}

export interface TypingIndicatorProps {
  typingUsers: TypingIndicator[];
  currentUserId: string;
}

// Utility types
export type MessageWithSender = EnhancedMessage & {
  sender: {
    id: string;
    name: string;
    avatar?: string;
    status?: UserPresenceStatus;
  };
};

export type ConversationWithLastMessage = Conversation & {
  lastMessage: NonNullable<Conversation['lastMessage']>;
};

export type MessageGroup = {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  messages: EnhancedMessage[];
};

// Hooks interfaces
export interface UseMessagingReturn {
  // State
  conversations: Conversation[];
  currentConversation?: Conversation;
  messages: EnhancedMessage[];
  typingUsers: TypingIndicator[];
  onlineUsers: Set<string>;
  
  // Loading states
  loading: {
    conversations: boolean;
    messages: boolean;
    sending: boolean;
  };
  
  // Actions
  actions: {
    selectConversation: (conversationId: string) => void;
    sendMessage: (request: SendMessageRequest) => Promise<void>;
    loadMoreMessages: () => Promise<void>;
    createConversation: (request: CreateConversationRequest) => Promise<string>;
    markAsRead: (messageId: string) => void;
    addReaction: (messageId: string, emoji: string) => void;
    removeReaction: (messageId: string, emoji: string) => void;
    startTyping: (conversationId: string) => void;
    stopTyping: (conversationId: string) => void;
    searchMessages: (params: MessageSearchParams) => Promise<EnhancedMessage[]>;
    archiveConversation: (conversationId: string) => void;
    muteConversation: (conversationId: string, mutedUntil?: string) => void;
  };
}