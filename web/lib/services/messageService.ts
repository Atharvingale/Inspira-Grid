import { BaseService } from './baseService';
import type {
  Message,
  Conversation,
  MessageAttachment,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

/**
 * Message service for handling all messaging-related API operations
 */
class MessageService extends BaseService {
  constructor() {
    super('/api');
  }

  /**
   * Get conversations for current user
   */
  async getConversations(
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<ApiResponse<PaginatedResponse<Conversation>>> {
    const endpoint = this.buildEndpoint('/conversations', pagination as unknown as Record<string, unknown>);
    return this.get<PaginatedResponse<Conversation>>(endpoint);
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string): Promise<ApiResponse<Conversation>> {
    return this.get<Conversation>(`/conversations/${conversationId}`);
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: {
    type: 'direct' | 'group' | 'project';
    participantIds: string[];
    title?: string;
    projectId?: string;
  }): Promise<ApiResponse<Conversation>> {
    return this.post<Conversation>('/conversations', data);
  }

  /**
   * Get messages from a conversation
   */
  async getMessages(
    conversationId: string,
    pagination: PaginationParams = { page: 1, limit: 50 }
  ): Promise<ApiResponse<PaginatedResponse<Message>>> {
    const endpoint = this.buildEndpoint(`/conversations/${conversationId}/messages`, pagination as unknown as Record<string, unknown>);
    return this.get<PaginatedResponse<Message>>(endpoint);
  }

  /**
   * Send a message
   */
  async sendMessage(conversationId: string, content: string, type: 'text' | 'file' = 'text'): Promise<ApiResponse<Message>> {
    return this.post<Message>(`/conversations/${conversationId}/messages`, {
      content,
      type,
    });
  }

  /**
   * Send a message with attachment
   */
  async sendMessageWithAttachment(
    conversationId: string,
    content: string,
    file: File
  ): Promise<ApiResponse<Message>> {
    return this.uploadFile<Message>(
      `/conversations/${conversationId}/messages/attachment`,
      file,
      { content }
    );
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    conversationId: string,
    messageIds?: string[]
  ): Promise<ApiResponse<{ updatedCount: number }>> {
    return this.patch<{ updatedCount: number }>(`/conversations/${conversationId}/read`, {
      messageIds,
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/messages/${messageId}`);
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, newContent: string): Promise<ApiResponse<Message>> {
    return this.patch<Message>(`/messages/${messageId}`, {
      content: newContent,
    });
  }

  /**
   * Search messages
   */
  async searchMessages(
    query: string,
    conversationId?: string,
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<ApiResponse<PaginatedResponse<Message>>> {
    const endpoint = this.buildEndpoint('/messages/search', {
      q: query,
      conversationId,
      ...pagination,
    });
    return this.get<PaginatedResponse<Message>>(endpoint);
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<ApiResponse<{ total: number; byConversation: Record<string, number> }>> {
    return this.get('/messages/unread-count');
  }

  /**
   * Archive/unarchive conversation
   */
  async toggleArchiveConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    return this.patch<Conversation>(`/conversations/${conversationId}/archive`);
  }

  /**
   * Leave conversation
   */
  async leaveConversation(conversationId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/conversations/${conversationId}/participants/me`);
  }

  /**
   * Add participants to conversation
   */
  async addParticipants(
    conversationId: string,
    participantIds: string[]
  ): Promise<ApiResponse<Conversation>> {
    return this.post<Conversation>(`/conversations/${conversationId}/participants`, {
      participantIds,
    });
  }

  /**
   * Remove participant from conversation
   */
  async removeParticipant(
    conversationId: string,
    participantId: string
  ): Promise<ApiResponse<Conversation>> {
    return this.delete<Conversation>(`/conversations/${conversationId}/participants/${participantId}`);
  }

  /**
   * Update conversation settings
   */
  async updateConversation(
    conversationId: string,
    updates: {
      title?: string;
      isArchived?: boolean;
    }
  ): Promise<ApiResponse<Conversation>> {
    return this.patch<Conversation>(`/conversations/${conversationId}`, updates);
  }

  /**
   * Get direct conversation with a user (create if doesn't exist)
   */
  async getOrCreateDirectConversation(userId: string): Promise<ApiResponse<Conversation>> {
    return this.post<Conversation>('/conversations/direct', { userId });
  }

  /**
   * Upload message attachment
   */
  async uploadAttachment(file: File): Promise<ApiResponse<MessageAttachment>> {
    return this.uploadFile<MessageAttachment>('/messages/attachments', file);
  }

  /**
   * Download message attachment
   */
  async downloadAttachment(attachmentId: string): Promise<ApiResponse<{ downloadUrl: string }>> {
    return this.get(`/messages/attachments/${attachmentId}/download`);
  }

  /**
   * Get conversation participants
   */
  async getConversationParticipants(conversationId: string): Promise<ApiResponse<Array<{
    userId: string;
    displayName: string;
    photoURL?: string;
    role?: string;
    joinedAt: Date;
    lastSeen: Date;
    isOnline: boolean;
  }>>> {
    return this.get(`/conversations/${conversationId}/participants`);
  }

  /**
   * Pin/unpin a message
   */
  async togglePinMessage(messageId: string): Promise<ApiResponse<Message>> {
    return this.patch<Message>(`/messages/${messageId}/pin`);
  }

  /**
   * Get pinned messages in a conversation
   */
  async getPinnedMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
    return this.get<Message[]>(`/conversations/${conversationId}/pinned`);
  }

  /**
   * React to a message
   */
  async reactToMessage(
    messageId: string,
    emoji: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>(`/messages/${messageId}/reactions`, {
      emoji,
    });
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(
    messageId: string,
    emoji: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(`/messages/${messageId}/reactions/${emoji}`);
  }

  /**
   * Get message reactions
   */
  async getMessageReactions(messageId: string): Promise<ApiResponse<Array<{
    emoji: string;
    count: number;
    users: Array<{ id: string; name: string; photoURL?: string }>;
    userReacted: boolean;
  }>>> {
    return this.get(`/messages/${messageId}/reactions`);
  }

  /**
   * Report a message
   */
  async reportMessage(
    messageId: string,
    reason: string,
    description?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>(`/messages/${messageId}/report`, {
      reason,
      description,
    });
  }

  /**
   * Get message history/edits
   */
  async getMessageHistory(messageId: string): Promise<ApiResponse<Array<{
    content: string;
    editedAt: Date;
    editedBy: string;
  }>>> {
    return this.get(`/messages/${messageId}/history`);
  }

  /**
   * Forward a message
   */
  async forwardMessage(
    messageId: string,
    conversationIds: string[]
  ): Promise<ApiResponse<{ success: boolean; sentCount: number }>> {
    return this.post<{ success: boolean; sentCount: number }>(`/messages/${messageId}/forward`, {
      conversationIds,
    });
  }

  /**
   * Get conversation insights/statistics
   */
  async getConversationStats(conversationId: string): Promise<ApiResponse<{
    totalMessages: number;
    totalParticipants: number;
    messagesByDay: Array<{ date: string; count: number }>;
    topSenders: Array<{ userId: string; userName: string; messageCount: number }>;
    averageResponseTime: number;
  }>> {
    return this.get(`/conversations/${conversationId}/stats`);
  }
}

// Export singleton instance
export const messageService = new MessageService();