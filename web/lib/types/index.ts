/**
 * Global TypeScript interfaces and types for Inspira-Grid
 * 
 * This file contains all the TypeScript interfaces used throughout the application.
 * It replaces 'any' types with proper type definitions for better type safety.
 */

// Base types for common fields
export interface BaseEntity {
  id: string;
  createdAt: string | { seconds: number };
  updatedAt?: string | { seconds: number };
}

// User-related types
export interface User extends BaseEntity {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  skills?: string[];
  role?: 'user' | 'admin';
  verified?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  skills?: string[];
  verified?: boolean;
}

// Project-related types
export interface Project extends BaseEntity {
  title: string;
  description: string;
  category: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  ownerId: string;
  ownerName: string;
  ownerEmail?: string;
  requiredSkills: string[];
  teamSize: number;
  currentTeamSize?: number;
  deadline?: string | { seconds: number };
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  tags?: string[];
  visibility: 'public' | 'private';
  applicationDeadline?: string | { seconds: number };
}

export interface ProjectDetails extends Project {
  teamMembers?: User[];
  applicationsCount?: number;
  isOwner?: boolean;
  hasApplied?: boolean;
}

// Application-related types
export interface Application extends BaseEntity {
  projectId: string;
  projectTitle?: string;
  projectDetails?: {
    title: string;
    description: string;
    category: string;
    ownerName: string;
  };
  applicantId: string;
  applicantName?: string;
  applicantEmail?: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  reviewNote?: string;
  reviewedAt?: string | { seconds: number };
  reviewedBy?: string;
}

// Message and Communication types
export interface Message extends BaseEntity {
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  content: string;
  messageType: 'text' | 'file' | 'system';
  projectId?: string;
  teamId?: string;
  isRead: boolean;
  readAt?: string | { seconds: number };
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

// Team-related types
export interface Team extends BaseEntity {
  name: string;
  description?: string;
  projectId: string;
  ownerId: string;
  members: TeamMember[];
  invitations?: TeamInvitation[];
}

export interface TeamMember {
  userId: string;
  displayName: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string | { seconds: number };
  skills?: string[];
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  invitedBy: string;
  invitedEmail: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string | { seconds: number };
}

// Notification types
export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  message: string;
  type: 'application' | 'message' | 'team_invite' | 'project_update' | 'system';
  isRead: boolean;
  readAt?: string | { seconds: number };
  actionUrl?: string;
  metadata?: {
    projectId?: string;
    applicationId?: string;
    messageId?: string;
    teamId?: string;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Form data types
export interface ProjectFormData {
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  teamSize: number;
  deadline?: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  tags?: string[];
  visibility: 'public' | 'private';
  applicationDeadline?: string;
}

export interface ApplicationFormData {
  projectId: string;
  message: string;
}

export interface UserProfileFormData {
  displayName: string;
  bio?: string;
  skills?: string[];
}

export interface MessageFormData {
  recipientId: string;
  content: string;
  projectId?: string;
  teamId?: string;
}

// Error types
export interface ApiError {
  message: string;
  code?: string | number;
  field?: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Filter and Search types
export interface ProjectFilters {
  category?: string;
  skills?: string[];
  status?: string;
  search?: string;
  ownerId?: string;
  minTeamSize?: number;
  maxTeamSize?: number;
  sortBy?: 'created' | 'updated' | 'deadline' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
  filters?: Record<string, any>;
}

// Socket.io event types
export interface SocketEvents {
  // User events
  'user:online': { userId: string };
  'user:offline': { userId: string };
  
  // Message events
  'message:new': Message;
  'message:read': { messageId: string; readBy: string };
  
  // Project events
  'project:updated': Project;
  'project:application': Application;
  
  // Team events
  'team:member_joined': { teamId: string; member: TeamMember };
  'team:member_left': { teamId: string; userId: string };
  
  // Notification events
  'notification:new': Notification;
}

// Component props types
export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helpText?: string;
}

// Auth context types
export interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Socket context types
export interface SocketContextValue {
  socket: any; // Socket.io client instance
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: keyof SocketEvents, data?: any) => void;
  on: (event: keyof SocketEvents, handler: (data: any) => void) => void;
  off: (event: keyof SocketEvents, handler?: (data: any) => void) => void;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Additional types needed for services
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface HTTPMethod {
  GET: 'GET';
  POST: 'POST';
  PUT: 'PUT';
  PATCH: 'PATCH';
  DELETE: 'DELETE';
}

export interface APIRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  acceptTerms: boolean;
}

// Re-export messaging types
export type {
  EnhancedMessage,
  Conversation,
  CreateConversationRequest,
  SendMessageRequest,
  MessageSearchParams,
  MessagesLoadOptions,
  MessageReaction,
  MessageAttachment as MessageAttachmentEnhanced
} from './messaging';

// Re-export video call types
export type {
  VideoCall,
  CreateCallRequest,
  JoinCallRequest,
  UpdateCallRequest,
  ScheduleCallRequest,
  ScheduledCall,
  CallRecording,
  CallParticipant
} from './videoCalls';

// Export commonly used type combinations
export type ProjectWithDetails = RequiredFields<ProjectDetails, 'teamMembers' | 'applicationsCount'>;
export type UserWithProfile = User & { profile: UserProfile };
export type ApplicationWithProject = Application & { projectDetails: Required<Application['projectDetails']> };
