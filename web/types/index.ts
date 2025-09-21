// Firebase Error Interface
export interface FirebaseError extends Error {
  code?: string;
  message: string;
}

// User Profile Interface
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  skills?: string[];
  githubUsername?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  university?: string;
  major?: string;
  graduationYear?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Project Interface
export interface Project {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  tags: string[];
  skillsRequired: string[];
  teamSize: number;
  currentTeamSize: number;
  status: 'draft' | 'open' | 'in-progress' | 'completed' | 'cancelled';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: string;
  githubRepo?: string;
  liveUrl?: string;
  imageUrl?: string;
  ownerId: string;
  ownerName: string;
  teamMembers: TeamMember[];
  applications: Application[];
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Team Member Interface
export interface TeamMember {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  joinedAt: Date;
  skills: string[];
  photoURL?: string;
}

// Application Interface
export interface Application {
  id: string;
  projectId: string;
  projectTitle: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  message: string;
  skills: string[];
  portfolioUrl?: string;
  githubUsername?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

// Message Interface
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'file';
  isRead: boolean;
  attachments?: MessageAttachment[];
}

// Message Attachment Interface
export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

// Conversation Interface
export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'project';
  participants: ConversationParticipant[];
  lastMessage?: Message;
  lastActivity: Date;
  title?: string; // For group conversations
  projectId?: string; // For project conversations
  isArchived: boolean;
  createdAt: Date;
}

// Conversation Participant Interface
export interface ConversationParticipant {
  userId: string;
  displayName: string;
  photoURL?: string;
  role?: string;
  joinedAt: Date;
  lastSeen: Date;
  unreadCount: number;
}

// Notification Interface
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'application' | 'project_update' | 'team_invite' | 'message' | 'system';
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

// API Response Interface
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Socket Event Types
export interface SocketEvents {
  // Message events
  'message:send': (message: Omit<Message, 'id' | 'timestamp'>) => void;
  'message:receive': (message: Message) => void;
  'message:typing': (data: { conversationId: string; userId: string; userName: string }) => void;
  'message:stop_typing': (data: { conversationId: string; userId: string }) => void;
  
  // User events
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'user:join': (data: { userId: string; conversationId: string }) => void;
  'user:leave': (data: { userId: string; conversationId: string }) => void;
  
  // Project events
  'project:update': (project: Project) => void;
  'project:application': (application: Application) => void;
  'project:team_update': (data: { projectId: string; teamMembers: TeamMember[] }) => void;
  
  // General events
  'notification': (notification: Notification) => void;
  'error': (error: { message: string; code?: string }) => void;
  'connect': () => void;
  'disconnect': () => void;
}

// Form Data Interfaces
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ProjectFormData {
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  tags: string[];
  skillsRequired: string[];
  teamSize: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  githubRepo?: string;
  imageUrl?: string;
}

export interface ProfileFormData {
  displayName: string;
  bio: string;
  skills: string[];
  githubUsername?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  university?: string;
  major?: string;
  graduationYear?: number;
}

// Filter and Search Interfaces
export interface ProjectFilters {
  category?: string;
  difficulty?: string;
  skills?: string[];
  teamSize?: number;
  status?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Component Props Interfaces
export interface ProjectCardProps {
  project: Project;
  onApply?: (projectId: string) => void;
  onView?: (projectId: string) => void;
  showActions?: boolean;
}

export interface UserAvatarProps {
  user: {
    displayName?: string;
    photoURL?: string;
    email?: string;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Admin Interfaces
export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalApplications: number;
  pendingApprovals: number;
  activeUsers: number;
  projectsByCategory: Record<string, number>;
  userGrowth: { month: string; count: number; }[];
  projectGrowth: { month: string; count: number; }[];
}

export interface AdminAction {
  type: 'approve' | 'reject' | 'suspend' | 'activate' | 'delete';
  targetId: string;
  targetType: 'user' | 'project' | 'application';
  reason?: string;
  adminId: string;
  timestamp: Date;
}

// API Response Types
export interface APIError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Auth Context Types
export interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

// Firebase User Type
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

// Socket Context Types
export interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Set<string>;
  notifications: Notification[];
  joinTeamRoom: (teamId: string) => void;
  leaveTeamRoom: (teamId: string) => void;
  joinProjectRoom: (projectId: string) => void;
  leaveProjectRoom: (projectId: string) => void;
  joinConversationRoom: (conversationId: string) => void;
  leaveConversationRoom: (conversationId: string) => void;
  sendMessage: (messageData: MessageData) => void;
  startTyping: (roomId: string, userId: string) => void;
  stopTyping: (roomId: string, userId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  clearAllNotifications: () => void;
  isUserOnline: (userId: string) => boolean;
}

export interface MessageData {
  conversationId: string;
  content: string;
  type: 'text' | 'file' | 'system';
  senderId: string;
  senderName: string;
}

// Socket Interface
export interface Socket {
  id: string;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, callback: (data: unknown) => void) => void;
  off: (event: string, callback?: (data: unknown) => void) => void;
  close: () => void;
}

// HTTP Methods for API
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface APIRequestConfig {
  method?: HTTPMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}
