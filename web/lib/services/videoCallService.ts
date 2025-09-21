import { BaseService } from './baseService';
import type {
  VideoCall,
  CreateCallRequest,
  JoinCallRequest,
  UpdateCallRequest,
  ScheduleCallRequest,
  ScheduledCall,
  CallRecording,
  CallParticipant,
  ApiResponse,
  PaginatedResponse
} from '@/lib/types';

/**
 * Video Call Service
 * 
 * Handles all video call-related API operations including:
 * - Call creation and management
 * - WebRTC room management
 * - Recording management
 * - Call scheduling
 * - Participant management
 */
class VideoCallService extends BaseService {
  constructor() {
    super('/api/calls');
  }

  // =====================================
  // Call Management
  // =====================================

  /**
   * Create a new video call
   */
  async createCall(data: CreateCallRequest): Promise<ApiResponse<VideoCall>> {
    return this.post<VideoCall>('/create', data);
  }

  /**
   * Get call by ID
   */
  async getCall(callId: string): Promise<ApiResponse<VideoCall>> {
    return this.get<VideoCall>(`/${callId}`);
  }

  /**
   * Join an existing call
   */
  async joinCall(data: JoinCallRequest): Promise<ApiResponse<{
    call: VideoCall;
    participant: CallParticipant;
    iceServers: RTCIceServer[];
    roomToken: string;
  }>> {
    return this.post(`/${data.callId}/join`, data);
  }

  /**
   * Leave a call
   */
  async leaveCall(callId: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/${callId}/leave`);
  }

  /**
   * Update call settings
   */
  async updateCall(callId: string, data: UpdateCallRequest): Promise<ApiResponse<VideoCall>> {
    return this.patch<VideoCall>(`/${callId}`, data);
  }

  /**
   * End a call (host only)
   */
  async endCall(callId: string, reason?: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/${callId}/end`, { reason });
  }

  /**
   * Get active calls for user
   */
  async getActiveCalls(): Promise<ApiResponse<VideoCall[]>> {
    return this.get<VideoCall[]>('/active');
  }

  /**
   * Get call history
   */
  async getCallHistory(
    projectId?: string,
    teamId?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse<PaginatedResponse<VideoCall>>> {
    const params: Record<string, any> = { limit, offset };
    if (projectId) params.projectId = projectId;
    if (teamId) params.teamId = teamId;

    const endpoint = this.buildEndpoint('/history', params);
    return this.get<PaginatedResponse<VideoCall>>(endpoint);
  }

  // =====================================
  // Participant Management
  // =====================================

  /**
   * Invite participant to call
   */
  async inviteParticipant(
    callId: string,
    email: string,
    message?: string
  ): Promise<ApiResponse<{ invitationId: string }>> {
    return this.post(`/${callId}/invite`, { email, message });
  }

  /**
   * Remove participant from call
   */
  async removeParticipant(callId: string, userId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/${callId}/participants/${userId}`);
  }

  /**
   * Mute/unmute participant (host only)
   */
  async muteParticipant(
    callId: string,
    userId: string,
    muted: boolean
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/${callId}/participants/${userId}/mute`, { muted });
  }

  /**
   * Change participant role
   */
  async changeParticipantRole(
    callId: string,
    userId: string,
    role: CallParticipant['role']
  ): Promise<ApiResponse<void>> {
    return this.patch<void>(`/${callId}/participants/${userId}`, { role });
  }

  /**
   * Update participant media status
   */
  async updateParticipantMedia(
    callId: string,
    mediaStatus: {
      audio?: boolean;
      video?: boolean;
      screenShare?: boolean;
    }
  ): Promise<ApiResponse<void>> {
    return this.patch<void>(`/${callId}/media`, mediaStatus);
  }

  // =====================================
  // Recording Management
  // =====================================

  /**
   * Start call recording
   */
  async startRecording(
    callId: string,
    options?: {
      includeScreenShare?: boolean;
      quality?: '720p' | '1080p';
      format?: 'mp4' | 'webm';
    }
  ): Promise<ApiResponse<{ recordingId: string }>> {
    return this.post(`/${callId}/recording/start`, options || {});
  }

  /**
   * Stop call recording
   */
  async stopRecording(callId: string, recordingId: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/${callId}/recording/stop`, { recordingId });
  }

  /**
   * Get call recordings
   */
  async getCallRecordings(callId?: string): Promise<ApiResponse<CallRecording[]>> {
    const endpoint = callId ? `/${callId}/recordings` : '/recordings';
    return this.get<CallRecording[]>(endpoint);
  }

  /**
   * Get recording by ID
   */
  async getRecording(recordingId: string): Promise<ApiResponse<CallRecording>> {
    return this.get<CallRecording>(`/recordings/${recordingId}`);
  }

  /**
   * Download recording
   */
  async downloadRecording(recordingId: string): Promise<ApiResponse<{ downloadUrl: string }>> {
    return this.get(`/recordings/${recordingId}/download`);
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/recordings/${recordingId}`);
  }

  /**
   * Share recording with users
   */
  async shareRecording(
    recordingId: string,
    userIds: string[],
    permissions: {
      canDownload?: boolean;
      expiresAt?: string;
    } = {}
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/recordings/${recordingId}/share`, {
      userIds,
      ...permissions
    });
  }

  /**
   * Update recording access
   */
  async updateRecordingAccess(
    recordingId: string,
    updates: {
      isPublic?: boolean;
      downloadable?: boolean;
      expiresAt?: string;
      allowedUsers?: string[];
    }
  ): Promise<ApiResponse<CallRecording>> {
    return this.patch<CallRecording>(`/recordings/${recordingId}/access`, updates);
  }

  // =====================================
  // Call Scheduling
  // =====================================

  /**
   * Schedule a call
   */
  async scheduleCall(data: ScheduleCallRequest): Promise<ApiResponse<ScheduledCall>> {
    return this.post<ScheduledCall>('/schedule', data);
  }

  /**
   * Get scheduled calls
   */
  async getScheduledCalls(
    filter: 'upcoming' | 'past' | 'all' = 'upcoming',
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<ScheduledCall>>> {
    const endpoint = this.buildEndpoint('/scheduled', { filter, limit });
    return this.get<PaginatedResponse<ScheduledCall>>(endpoint);
  }

  /**
   * Update scheduled call
   */
  async updateScheduledCall(
    callId: string,
    updates: Partial<ScheduleCallRequest>
  ): Promise<ApiResponse<ScheduledCall>> {
    return this.patch<ScheduledCall>(`/scheduled/${callId}`, updates);
  }

  /**
   * Cancel scheduled call
   */
  async cancelScheduledCall(callId: string, reason?: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/scheduled/${callId}/cancel`, { reason });
  }

  /**
   * Respond to call invitation
   */
  async respondToInvitation(
    invitationId: string,
    response: 'accept' | 'decline' | 'tentative',
    message?: string
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/invitations/${invitationId}/respond`, {
      response,
      message
    });
  }

  /**
   * Get call invitations for user
   */
  async getInvitations(status?: 'pending' | 'responded'): Promise<ApiResponse<Array<{
    id: string;
    callId: string;
    callTitle: string;
    scheduledAt: string;
    invitedBy: string;
    status: 'pending' | 'accepted' | 'declined' | 'tentative';
    sentAt: string;
  }>>> {
    const endpoint = this.buildEndpoint('/invitations', status ? { status } : {});
    return this.get(endpoint);
  }

  // =====================================
  // WebRTC Support
  // =====================================

  /**
   * Get ICE servers configuration
   */
  async getIceServers(): Promise<ApiResponse<RTCIceServer[]>> {
    return this.get<RTCIceServer[]>('/ice-servers');
  }

  /**
   * Create peer connection offer
   */
  async createOffer(
    callId: string,
    targetUserId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<ApiResponse<void>> {
    // This would typically be handled via WebSocket, but keeping API endpoint for fallback
    return this.post<void>(`/${callId}/webrtc/offer`, {
      targetUserId,
      offer
    });
  }

  /**
   * Create peer connection answer
   */
  async createAnswer(
    callId: string,
    targetUserId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<ApiResponse<void>> {
    // This would typically be handled via WebSocket, but keeping API endpoint for fallback
    return this.post<void>(`/${callId}/webrtc/answer`, {
      targetUserId,
      answer
    });
  }

  /**
   * Send ICE candidate
   */
  async sendIceCandidate(
    callId: string,
    targetUserId: string,
    candidate: RTCIceCandidateInit
  ): Promise<ApiResponse<void>> {
    // This would typically be handled via WebSocket, but keeping API endpoint for fallback
    return this.post<void>(`/${callId}/webrtc/ice-candidate`, {
      targetUserId,
      candidate
    });
  }

  // =====================================
  // Analytics and Statistics
  // =====================================

  /**
   * Get call analytics
   */
  async getCallAnalytics(
    callId: string
  ): Promise<ApiResponse<{
    duration: number;
    participantCount: number;
    averageConnectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
    peakParticipants: number;
    screenShareDuration: number;
    recordingDuration: number;
    chatMessages: number;
    participantStats: Array<{
      userId: string;
      joinTime: number;
      leaveTime?: number;
      speakingTime: number;
      avgConnectionQuality: string;
    }>;
  }>> {
    return this.get(`/${callId}/analytics`);
  }

  /**
   * Get user call statistics
   */
  async getUserCallStats(
    timeframe: 'week' | 'month' | 'year' = 'month'
  ): Promise<ApiResponse<{
    totalCalls: number;
    totalDuration: number;
    averageCallDuration: number;
    callsByType: Record<string, number>;
    callsByDay: Array<{ date: string; count: number }>;
    mostActiveProjects: Array<{ projectId: string; projectName: string; callCount: number }>;
  }>> {
    const endpoint = this.buildEndpoint('/stats/user', { timeframe });
    return this.get(endpoint);
  }

  /**
   * Get project call statistics
   */
  async getProjectCallStats(
    projectId: string,
    timeframe: 'week' | 'month' | 'year' = 'month'
  ): Promise<ApiResponse<{
    totalCalls: number;
    totalDuration: number;
    uniqueParticipants: number;
    averageParticipants: number;
    callFrequency: Array<{ date: string; count: number }>;
    topParticipants: Array<{ userId: string; userName: string; callCount: number }>;
  }>> {
    const endpoint = this.buildEndpoint(`/stats/project/${projectId}`, { timeframe });
    return this.get(endpoint);
  }

  // =====================================
  // Call Quality and Diagnostics
  // =====================================

  /**
   * Submit connection statistics
   */
  async submitConnectionStats(
    callId: string,
    stats: {
      userId: string;
      connectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
      bitrate?: number;
      latency?: number;
      packetLoss?: number;
      audioLevel?: number;
      timestamp: number;
    }
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/${callId}/stats`, stats);
  }

  /**
   * Get call quality report
   */
  async getCallQualityReport(callId: string): Promise<ApiResponse<{
    overallQuality: 'poor' | 'fair' | 'good' | 'excellent';
    participantQuality: Array<{
      userId: string;
      userName: string;
      avgQuality: 'poor' | 'fair' | 'good' | 'excellent';
      connectionIssues: string[];
    }>;
    networkStats: {
      avgLatency: number;
      avgBitrate: number;
      avgPacketLoss: number;
    };
    recommendations: string[];
  }>> {
    return this.get(`/${callId}/quality-report`);
  }

  // =====================================
  // Settings and Preferences
  // =====================================

  /**
   * Update user call preferences
   */
  async updateCallPreferences(preferences: {
    defaultVideoEnabled?: boolean;
    defaultAudioEnabled?: boolean;
    preferredResolution?: '480p' | '720p' | '1080p';
    autoJoinAudio?: boolean;
    showConnectionStats?: boolean;
    enableNoiseCancellation?: boolean;
    joinBeforeHost?: boolean;
  }): Promise<ApiResponse<void>> {
    return this.patch<void>('/preferences', preferences);
  }

  /**
   * Get user call preferences
   */
  async getCallPreferences(): Promise<ApiResponse<{
    defaultVideoEnabled: boolean;
    defaultAudioEnabled: boolean;
    preferredResolution: '480p' | '720p' | '1080p';
    autoJoinAudio: boolean;
    showConnectionStats: boolean;
    enableNoiseCancellation: boolean;
    joinBeforeHost: boolean;
  }>> {
    return this.get('/preferences');
  }

  // =====================================
  // Device Management
  // =====================================

  /**
   * Test media devices
   */
  async testMediaDevices(devices: {
    videoDeviceId?: string;
    audioInputDeviceId?: string;
    audioOutputDeviceId?: string;
  }): Promise<ApiResponse<{
    videoTest: { success: boolean; error?: string };
    audioInputTest: { success: boolean; level: number; error?: string };
    audioOutputTest: { success: boolean; error?: string };
  }>> {
    return this.post('/test-devices', devices);
  }

  /**
   * Get recommended device settings
   */
  async getRecommendedSettings(): Promise<ApiResponse<{
    video: {
      resolution: '480p' | '720p' | '1080p';
      frameRate: 15 | 30 | 60;
    };
    audio: {
      echoCancellation: boolean;
      noiseSuppression: boolean;
      autoGainControl: boolean;
    };
  }>> {
    return this.get('/recommended-settings');
  }
}

// Export singleton instance
export const videoCallService = new VideoCallService();