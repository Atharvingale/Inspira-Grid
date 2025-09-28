/**
 * Video Call System Types
 * 
 * TypeScript interfaces for WebRTC-based video calling system
 * including call management, screen sharing, recording, and meeting history.
 */

export interface VideoCall {
  id: string;
  roomId: string;
  projectId?: string;
  teamId?: string;
  conversationId?: string;
  
  // Call metadata
  title?: string;
  description?: string;
  type: 'direct' | 'group' | 'project_meeting' | 'team_meeting' | 'interview';
  status: 'scheduled' | 'waiting' | 'active' | 'ended' | 'cancelled';
  
  // Timing
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number; // in seconds
  
  // Host and participants
  hostId: string;
  hostName: string;
  participants: CallParticipant[];
  maxParticipants?: number;
  
  // Call settings
  settings: {
    videoEnabled: boolean;
    audioEnabled: boolean;
    screenShareEnabled: boolean;
    chatEnabled: boolean;
    recordingEnabled: boolean;
    waitingRoomEnabled: boolean;
    participantCanShareScreen: boolean;
    participantCanUnmute: boolean;
  };
  
  // Recording
  recording?: {
    isRecording: boolean;
    recordingId?: string;
    recordingUrl?: string;
    recordingStartedAt?: string;
    recordingDuration?: number;
  };
  
  // Meeting metadata
  metadata?: {
    agenda?: string;
    notes?: string;
    tags?: string[];
    isPrivate?: boolean;
    requiresApproval?: boolean;
  };
}

export interface CallParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  email?: string;
  role: 'host' | 'co-host' | 'participant' | 'observer';
  
  // Connection status
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  joinedAt?: string;
  leftAt?: string;
  
  // Media status
  mediaStatus: {
    video: boolean;
    audio: boolean;
    screenShare: boolean;
  };
  
  // Permissions
  permissions: {
    canUnmute: boolean;
    canShareScreen: boolean;
    canRecord: boolean;
    canManageParticipants: boolean;
    canEndCall: boolean;
  };
  
  // WebRTC connection info
  peerId?: string;
  streamId?: string;
  
  // Statistics
  stats?: {
    connectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
    bitrate?: number;
    latency?: number;
    packetLoss?: number;
  };
}

export interface CallInvitation {
  id: string;
  callId: string;
  invitedBy: string;
  invitedUser: string;
  invitedEmail?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: string;
  respondedAt?: string;
  expiresAt?: string;
  message?: string;
}

export interface ScheduledCall {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number; // in minutes
  timezone: string;
  
  // Recurrence
  isRecurring: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number; // every X days/weeks/months
    daysOfWeek?: number[]; // for weekly (0 = Sunday)
    endDate?: string;
    maxOccurrences?: number;
  };
  
  // Organizer and invites
  organizerId: string;
  organizerName: string;
  invitees: Array<{
    userId?: string;
    email: string;
    name?: string;
    status: 'pending' | 'accepted' | 'declined' | 'tentative';
    responseAt?: string;
  }>;
  
  // Settings
  settings: VideoCall['settings'];
  
  // Integration
  projectId?: string;
  teamId?: string;
  
  // Reminders
  reminders?: Array<{
    type: 'email' | 'push' | 'sms';
    minutesBefore: number;
    sentAt?: string;
  }>;
}

export interface CallRecording {
  id: string;
  callId: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  
  // Recording details
  startedAt: string;
  endedAt: string;
  duration: number;
  fileSize: number;
  format: 'mp4' | 'webm';
  quality: '720p' | '1080p' | '1440p';
  
  // Metadata
  participants: string[];
  hasScreenShare: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  
  // Processing status
  status: 'processing' | 'ready' | 'failed';
  processedAt?: string;
  
  // Access control
  isPublic: boolean;
  allowedUsers?: string[];
  downloadable: boolean;
  expiresAt?: string;
  
  // Transcription
  transcription?: {
    status: 'processing' | 'ready' | 'failed';
    content?: string;
    language?: string;
    confidence?: number;
  };
}

// WebRTC and media types
export interface MediaDevices {
  videoDevices: MediaDeviceInfo[];
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  selectedDevices: {
    videoDeviceId?: string;
    audioInputDeviceId?: string;
    audioOutputDeviceId?: string;
  };
}

export interface MediaSettings {
  video: {
    enabled: boolean;
    deviceId?: string;
    resolution: '480p' | '720p' | '1080p';
    frameRate: 15 | 30 | 60;
    facingMode?: 'user' | 'environment';
  };
  audio: {
    enabled: boolean;
    deviceId?: string;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  };
  screenShare: {
    enabled: boolean;
    includeAudio: boolean;
    quality: 'low' | 'medium' | 'high';
  };
}

export interface ConnectionStats {
  connectionId: string;
  userId: string;
  
  // Connection quality
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  
  // Media stats
  video?: {
    bitrate: number;
    resolution: { width: number; height: number };
    frameRate: number;
    packetsLost: number;
    packetsReceived: number;
  };
  
  audio?: {
    bitrate: number;
    packetsLost: number;
    packetsReceived: number;
    audioLevel: number;
  };
  
  // Network stats
  rtt: number; // Round trip time
  availableOutgoingBitrate?: number;
  
  // Timestamps
  timestamp: number;
}

// Socket events for video calls
export interface VideoCallSocketEvents {
  // Call lifecycle
  'call:created': VideoCall;
  'call:started': { callId: string; startedAt: string };
  'call:ended': { callId: string; endedAt: string; duration: number };
  'call:cancelled': { callId: string; reason?: string };
  
  // Participant events
  'participant:joined': { callId: string; participant: CallParticipant };
  'participant:left': { callId: string; userId: string; leftAt: string };
  'participant:media_changed': { callId: string; userId: string; mediaStatus: CallParticipant['mediaStatus'] };
  'participant:role_changed': { callId: string; userId: string; newRole: CallParticipant['role'] };
  
  // WebRTC signaling
  'webrtc:offer': { callId: string; from: string; to: string; offer: RTCSessionDescriptionInit };
  'webrtc:answer': { callId: string; from: string; to: string; answer: RTCSessionDescriptionInit };
  'webrtc:ice_candidate': { callId: string; from: string; to: string; candidate: RTCIceCandidateInit };
  
  // Screen sharing
  'screen_share:started': { callId: string; userId: string };
  'screen_share:stopped': { callId: string; userId: string };
  
  // Recording
  'recording:started': { callId: string; recordingId: string };
  'recording:stopped': { callId: string; recordingId: string };
  'recording:ready': { callId: string; recordingId: string; recording: CallRecording };
  
  // Chat during call
  'call_chat:message': { callId: string; message: { id: string; content: string; senderId: string; timestamp: string } };
  
  // Call quality
  'connection_quality:update': { callId: string; userId: string; quality: 'poor' | 'fair' | 'good' | 'excellent' };
}

// API request/response types
export interface CreateCallRequest {
  title?: string;
  description?: string;
  type: VideoCall['type'];
  participantIds?: string[];
  projectId?: string;
  teamId?: string;
  scheduledAt?: string;
  duration?: number;
  settings?: Partial<VideoCall['settings']>;
  isPrivate?: boolean;
}

export interface JoinCallRequest {
  callId: string;
  mediaSettings?: Partial<MediaSettings>;
}

export interface UpdateCallRequest {
  title?: string;
  description?: string;
  settings?: Partial<VideoCall['settings']>;
}

export interface ScheduleCallRequest {
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  timezone: string;
  invitees: Array<{ email: string; name?: string }>;
  isRecurring?: boolean;
  recurrence?: ScheduledCall['recurrence'];
  projectId?: string;
  teamId?: string;
  settings?: Partial<VideoCall['settings']>;
}

// Component prop types
export interface VideoCallPlayerProps {
  callId: string;
  participantId: string;
  stream?: MediaStream;
  isLocal: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  participant: CallParticipant;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onRemoveParticipant?: () => void;
  className?: string;
}

export interface CallControlsProps {
  callId: string;
  isHost: boolean;
  localMediaSettings: MediaSettings;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onEndCall: () => void;
  onOpenSettings: () => void;
  onOpenChat: () => void;
  isRecording?: boolean;
  participantCount: number;
}

export interface CallSettingsProps {
  mediaSettings: MediaSettings;
  availableDevices: MediaDevices;
  onSettingsChange: (settings: Partial<MediaSettings>) => void;
  onDeviceChange: (deviceType: 'video' | 'audioInput' | 'audioOutput', deviceId: string) => void;
}

export interface ParticipantListProps {
  participants: CallParticipant[];
  currentUserId: string;
  isHost: boolean;
  onMuteParticipant: (userId: string) => void;
  onRemoveParticipant: (userId: string) => void;
  onChangeRole: (userId: string, newRole: CallParticipant['role']) => void;
}

// Hook return types
export interface UseVideoCallReturn {
  // Call state
  currentCall?: VideoCall;
  participants: CallParticipant[];
  localParticipant?: CallParticipant;
  
  // Media state
  localStream?: MediaStream;
  remoteStreams: Map<string, MediaStream>;
  screenShareStream?: MediaStream;
  
  // Settings
  mediaSettings: MediaSettings;
  availableDevices: MediaDevices;
  
  // Connection state
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  connectionStats: Map<string, ConnectionStats>;
  
  // Actions
  actions: {
    joinCall: (callId: string, settings?: Partial<MediaSettings>) => Promise<void>;
    leaveCall: () => Promise<void>;
    toggleAudio: () => Promise<void>;
    toggleVideo: () => Promise<void>;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => Promise<void>;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    inviteParticipant: (email: string) => Promise<void>;
    removeParticipant: (userId: string) => Promise<void>;
    changeParticipantRole: (userId: string, role: CallParticipant['role']) => Promise<void>;
    updateSettings: (settings: Partial<MediaSettings>) => Promise<void>;
    sendChatMessage: (message: string) => void;
  };
  
  // Loading states
  loading: {
    joining: boolean;
    leaving: boolean;
    recording: boolean;
    inviting: boolean;
  };
}

export interface UseCallSchedulingReturn {
  scheduledCalls: ScheduledCall[];
  upcomingCalls: ScheduledCall[];
  
  actions: {
    scheduleCall: (request: ScheduleCallRequest) => Promise<string>;
    updateScheduledCall: (callId: string, updates: Partial<ScheduleCallRequest>) => Promise<void>;
    cancelScheduledCall: (callId: string, reason?: string) => Promise<void>;
    respondToInvitation: (invitationId: string, response: 'accept' | 'decline' | 'tentative') => Promise<void>;
  };
  
  loading: {
    scheduling: boolean;
    updating: boolean;
    responding: boolean;
  };
}

export interface UseCallRecordingsReturn {
  recordings: CallRecording[];
  
  actions: {
    getCallRecordings: (callId?: string) => Promise<CallRecording[]>;
    downloadRecording: (recordingId: string) => Promise<void>;
    deleteRecording: (recordingId: string) => Promise<void>;
    shareRecording: (recordingId: string, userIds: string[]) => Promise<void>;
  };
  
  loading: {
    loading: boolean;
    downloading: boolean;
    deleting: boolean;
    sharing: boolean;
  };
}