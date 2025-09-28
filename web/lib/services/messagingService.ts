import { BaseService } from './baseService';
import type {
  EnhancedMessage,
  Conversation,
  CreateConversationRequest,
  SendMessageRequest,
  MessageSearchParams,
  MessagesLoadOptions,
  ApiResponse,
  PaginatedResponse
} from '@/lib/types';

/**
 * Enhanced Messaging Service
 * 
 * Handles all messaging-related API operations including:
 * - Real-time messaging with Socket.IO integration
 * - File attachments and media sharing
 * - Message reactions and threading
 * - Conversation management
 * - Search and filtering
 */
class MessagingService extends BaseService {
  constructor() {
    super('/api/messages');
  }

  // =====================================
  // Conversation Management
  // =====================================

  /**
   * Get all conversations for the current user
   */
  async getConversations(
    filter?: 'all' | 'unread' | 'pinned' | 'archived',
    search?: string
  ): Promise<ApiResponse<Conversation[]>> {
    const params: Record<string, any> = {};
    if (filter && filter !== 'all') params.filter = filter;
    if (search) params.search = search;

    const endpoint = this.buildEndpoint('/conversations', params);
    return this.get<Conversation[]>(endpoint);
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    return this.get<Conversation>(`/conversations/${conversationId}`);
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: CreateConversationRequest): Promise<ApiResponse<Conversation>> {
    return this.post<Conversation>('/conversations', data);
  }

  /**
   * Update conversation settings
   */
  async updateConversation(
    conversationId: string,
    updates: {
      name?: string;
      description?: string;
      settings?: Partial<Conversation['settings']>;
    }
  ): Promise<ApiResponse<Conversation>> {
    return this.patch<Conversation>(`/conversations/${conversationId}`, updates);
  }

  /**
   * Archive/unarchive a conversation
   */
  async toggleArchiveConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    return this.patch<Conversation>(`/conversations/${conversationId}/archive`);
  }

  /**
   * Mute/unmute a conversation
   */
  async muteConversation(
    conversationId: string,
    mutedUntil?: string
  ): Promise<ApiResponse<Conversation>> {
    return this.patch<Conversation>(`/conversations/${conversationId}/mute`, { mutedUntil });
  }

  /**
   * Pin/unpin a conversation
   */
  async togglePinConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    return this.patch<Conversation>(`/conversations/${conversationId}/pin`);
  }

  /**
   * Add participant to conversation
   */
  async addParticipant(
    conversationId: string,
    userId: string,
    role: 'admin' | 'moderator' | 'member' = 'member'
  ): Promise<ApiResponse<Conversation>> {
    return this.post<Conversation>(`/conversations/${conversationId}/participants`, {
      userId,
      role
    });
  }

  /**
   * Remove participant from conversation
   */
  async removeParticipant(
    conversationId: string,
    userId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/conversations/${conversationId}/participants/${userId}`);
  }

  /**
   * Leave conversation
   */
  async leaveConversation(conversationId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/conversations/${conversationId}/leave`);
  }

  // =====================================
  // Message Management
  // =====================================

  /**
   * Get messages for a conversation
   */
  async getMessages(options: MessagesLoadOptions): Promise<ApiResponse<PaginatedResponse<EnhancedMessage>>> {
    const { conversationId, ...params } = options;
    
    const endpoint = this.buildEndpoint(`/conversations/${conversationId}/messages`, params);
    return this.get<PaginatedResponse<EnhancedMessage>>(endpoint);
  }

  /**
   * Send a message
   */
  async sendMessage(data: SendMessageRequest): Promise<ApiResponse<EnhancedMessage>> {
    const { conversationId, ...messageData } = data;
    
    // Handle file uploads if attachments exist
    if (data.attachments && data.attachments.length > 0) {
      return this.sendMessageWithFiles(conversationId, messageData, data.attachments);
    }
    
    return this.post<EnhancedMessage>(`/conversations/${conversationId}/messages`, messageData);
  }

  /**
   * Send message with file attachments
   */
  private async sendMessageWithFiles(
    conversationId: string,
    messageData: Omit<SendMessageRequest, 'conversationId' | 'attachments'>,
    files: File[]
  ): Promise<ApiResponse<EnhancedMessage>> {
    const formData = new FormData();
    
    // Add message data
    Object.entries(messageData).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    });
    
    // Add files
    files.forEach((file, index) => {
      formData.append(`attachments[${index}]`, file);
    });

    return this.uploadFile<EnhancedMessage>(`/conversations/${conversationId}/messages`, files[0], messageData);
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    content: string
  ): Promise<ApiResponse<EnhancedMessage>> {
    return this.patch<EnhancedMessage>(`/messages/${messageId}`, { content });
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/messages/${messageId}`);
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/messages/${messageId}/read`);
  }

  /**
   * Mark all messages in conversation as read
   */
  async markConversationAsRead(conversationId: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/conversations/${conversationId}/mark-read`);
  }

  // =====================================
  // Message Reactions
  // =====================================

  /**
   * Add reaction to message
   */
  async addReaction(messageId: string, emoji: string): Promise<ApiResponse<EnhancedMessage>> {
    return this.post<EnhancedMessage>(`/messages/${messageId}/reactions`, { emoji });
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId: string, emoji: string): Promise<ApiResponse<EnhancedMessage>> {
    return this.delete<EnhancedMessage>(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  }

  // =====================================
  // Message Threads
  // =====================================

  /**
   * Get replies for a message thread
   */
  async getMessageReplies(
    messageId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse<PaginatedResponse<EnhancedMessage>>> {
    const endpoint = this.buildEndpoint(`/messages/${messageId}/replies`, { limit, offset });
    return this.get<PaginatedResponse<EnhancedMessage>>(endpoint);
  }

  /**
   * Reply to a message
   */
  async replyToMessage(
    parentMessageId: string,
    content: string,
    attachments?: File[]
  ): Promise<ApiResponse<EnhancedMessage>> {
    const messageData: SendMessageRequest = {
      conversationId: '', // Will be determined by parent message
      content,
      replyToMessageId: parentMessageId,
      attachments
    };
    
    if (attachments && attachments.length > 0) {
      // Handle file attachments for replies
      return this.uploadFile<EnhancedMessage>(`/messages/${parentMessageId}/replies`, attachments[0], {
        content,
        replyToMessageId: parentMessageId
      });
    }
    
    return this.post<EnhancedMessage>(`/messages/${parentMessageId}/replies`, { content });
  }

  // =====================================
  // Search and Discovery
  // =====================================

  /**
   * Search messages across conversations
   */
  async searchMessages(params: MessageSearchParams): Promise<ApiResponse<PaginatedResponse<EnhancedMessage>>> {
    const endpoint = this.buildEndpoint('/search/messages', params);
    return this.get<PaginatedResponse<EnhancedMessage>>(endpoint);
  }

  /**
   * Search conversations
   */
  async searchConversations(query: string): Promise<ApiResponse<Conversation[]>> {
    const endpoint = this.buildEndpoint('/search/conversations', { query });
    return this.get<Conversation[]>(endpoint);
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(
    conversationId: string,
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<ApiResponse<{
    messageCount: number;
    participantActivity: Array<{
      userId: string;
      messageCount: number;
      lastActive: string;
    }>;
    peakHours: number[];
    mediaShared: number;
    averageResponseTime: number;
  }>> {
    const endpoint = this.buildEndpoint(`/conversations/${conversationId}/analytics`, { timeframe });
    return this.get(endpoint);
  }

  // =====================================
  // File Management
  // =====================================

  /**
   * Upload file attachment
   */
  async uploadAttachment(
    conversationId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ fileId: string; fileUrl: string; thumbnailUrl?: string }>> {
    // TODO: Implement progress tracking for file uploads
    return this.uploadFile(`/conversations/${conversationId}/attachments`, file);
  }

  /**
   * Get shared media in conversation
   */
  async getSharedMedia(
    conversationId: string,
    mediaType: 'images' | 'videos' | 'files' | 'all' = 'all',
    limit: number = 50
  ): Promise<ApiResponse<PaginatedResponse<{
    messageId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    uploadedBy: string;
  }>>> {
    const endpoint = this.buildEndpoint(`/conversations/${conversationId}/media`, {
      type: mediaType,
      limit
    });
    return this.get(endpoint);
  }

  // =====================================
  // Draft Management
  // =====================================

  /**
   * Save message draft
   */
  async saveDraft(
    conversationId: string,
    content: string,
    replyToMessageId?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.post('/drafts', {
      conversationId,
      content,
      replyToMessageId
    });
  }

  /**
   * Get saved drafts
   */
  async getDrafts(): Promise<ApiResponse<Array<{
    id: string;
    conversationId: string;
    content: string;
    replyToMessageId?: string;
    lastModified: string;
  }>>> {
    return this.get<Array<any>>('/drafts');
  }

  /**
   * Delete draft
   */
  async deleteDraft(draftId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/drafts/${draftId}`);
  }

  // =====================================
  // Typing Indicators
  // =====================================

  /**
   * Send typing indicator (via WebSocket)
   */
  startTyping(conversationId: string): void {
    // This will be handled by the socket context
    // Just a placeholder for the service interface
  }

  /**
   * Stop typing indicator (via WebSocket)
   */
  stopTyping(conversationId: string): void {
    // This will be handled by the socket context
    // Just a placeholder for the service interface
  }

  // =====================================
  // Presence and Status
  // =====================================

  /**
   * Update user status
   */
  async updateStatus(
    status: 'online' | 'away' | 'busy' | 'offline',
    customMessage?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.post('/presence/status', { status, customMessage });
  }

  /**
   * Get online users in conversation
   */
  async getOnlineUsers(conversationId: string): Promise<ApiResponse<Array<{
    userId: string;
    userName: string;
    status: 'online' | 'away' | 'busy';
    lastSeen: string;
  }>>> {
    return this.get(`/conversations/${conversationId}/presence`);
  }
}

// Export singleton instance
export const messagingService = new MessagingService();