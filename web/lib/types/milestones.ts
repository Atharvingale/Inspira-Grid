/**
 * Milestone and Timeline Management Types
 * 
 * TypeScript interfaces for project milestone management system
 * including timeline visualization, progress tracking, and dependencies.
 */

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  
  // Status and progress
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  progress: number; // 0-100 percentage
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Dates
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Assignment
  assignedTo: string[];
  createdBy: string;
  
  // Dependencies
  dependencies: string[]; // Array of milestone IDs
  dependents: string[]; // Milestones that depend on this one
  
  // Deliverables and tasks
  deliverables: MilestoneDeliverable[];
  tasks: MilestoneTask[];
  
  // Metadata
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
  cost?: {
    estimated: number;
    actual?: number;
    currency: string;
  };
  
  // Comments and updates
  commentsCount: number;
  lastActivity?: {
    type: 'status_change' | 'progress_update' | 'comment' | 'task_completed';
    by: string;
    at: string;
    description: string;
  };
}

export interface MilestoneDeliverable {
  id: string;
  milestoneId: string;
  title: string;
  description?: string;
  type: 'document' | 'prototype' | 'code' | 'design' | 'presentation' | 'other';
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  
  // Files
  attachments?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    uploadedBy: string;
    uploadedAt: string;
    size: number;
    mimeType: string;
  }>;
  
  // Review process
  reviewers?: string[];
  reviewNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  
  // Dates
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneTask {
  id: string;
  milestoneId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  
  // Assignment
  assignedTo?: string;
  assignedBy: string;
  
  // Dates
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Time tracking
  estimatedHours?: number;
  actualHours?: number;
  
  // Sub-tasks
  subtasks?: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
}

export interface Timeline {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  
  // Timeline settings
  startDate: string;
  endDate: string;
  workingDays: number[]; // 0-6, Sunday = 0
  holidays: Array<{
    date: string;
    name: string;
    type: 'holiday' | 'company_event' | 'blackout';
  }>;
  
  // Views and display
  defaultView: 'gantt' | 'kanban' | 'calendar' | 'list';
  timeScale: 'day' | 'week' | 'month' | 'quarter';
  
  // Milestones in this timeline
  milestones: string[]; // Array of milestone IDs
  
  // Timeline metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isTemplate: boolean;
  templateName?: string;
}

export interface MilestoneTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'software_dev' | 'design' | 'marketing' | 'research' | 'event' | 'custom';
  
  // Template data
  milestones: Array<{
    title: string;
    description?: string;
    priority: Milestone['priority'];
    estimatedDuration: number; // in days
    dependencies: string[]; // references to other milestone titles in template
    deliverables: Array<{
      title: string;
      type: MilestoneDeliverable['type'];
      description?: string;
    }>;
    tasks: Array<{
      title: string;
      description?: string;
      estimatedHours?: number;
    }>;
  }>;
  
  // Template metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  isPublic: boolean;
  tags: string[];
}

export interface MilestoneComment {
  id: string;
  milestoneId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  
  // Comment metadata
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
  
  // Threading
  parentId?: string; // For replies
  repliesCount: number;
  
  // Attachments
  attachments?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    size: number;
    mimeType: string;
  }>;
  
  // Mentions
  mentions?: Array<{
    userId: string;
    userName: string;
    startIndex: number;
    length: number;
  }>;
}

export interface MilestoneActivity {
  id: string;
  milestoneId?: string;
  projectId: string;
  type: 'created' | 'updated' | 'completed' | 'status_changed' | 'assigned' | 'commented' | 'dependency_added' | 'task_added' | 'deliverable_added';
  
  // Activity details
  description: string;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  
  // Actor
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  
  // Timestamp
  createdAt: string;
  
  // Additional context
  metadata?: {
    taskId?: string;
    deliverableId?: string;
    commentId?: string;
    dependencyId?: string;
  };
}

// Analytics and reporting types
export interface MilestoneAnalytics {
  projectId: string;
  timeframe: {
    startDate: string;
    endDate: string;
  };
  
  // Overall metrics
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  completionRate: number; // percentage
  averageCompletionTime: number; // in days
  
  // Progress tracking
  progressByStatus: Record<Milestone['status'], number>;
  progressByPriority: Record<Milestone['priority'], number>;
  progressOverTime: Array<{
    date: string;
    completed: number;
    total: number;
    completionRate: number;
  }>;
  
  // Team performance
  teamPerformance: Array<{
    userId: string;
    userName: string;
    assignedMilestones: number;
    completedMilestones: number;
    completionRate: number;
    averageDelay: number; // in days
    currentLoad: number; // active milestones
  }>;
  
  // Timeline health
  criticalPath: string[]; // Array of milestone IDs
  riskAssessment: {
    highRiskMilestones: string[];
    blockedMilestones: string[];
    delayedMilestones: string[];
    resourceConstraints: Array<{
      userId: string;
      userName: string;
      overloadFactor: number;
    }>;
  };
  
  // Predictions
  projectedCompletion: string;
  confidence: number; // 0-100
  recommendations: Array<{
    type: 'resource_allocation' | 'deadline_adjustment' | 'dependency_optimization' | 'priority_change';
    description: string;
    impact: 'low' | 'medium' | 'high';
  }>;
}

// API request/response types
export interface CreateMilestoneRequest {
  projectId: string;
  title: string;
  description?: string;
  priority: Milestone['priority'];
  startDate?: string;
  dueDate?: string;
  assignedTo: string[];
  dependencies?: string[];
  tags?: string[];
  estimatedHours?: number;
  cost?: {
    estimated: number;
    currency: string;
  };
  deliverables?: Array<{
    title: string;
    description?: string;
    type: MilestoneDeliverable['type'];
    dueDate?: string;
  }>;
  tasks?: Array<{
    title: string;
    description?: string;
    assignedTo?: string;
    dueDate?: string;
    estimatedHours?: number;
  }>;
}

export interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
  status?: Milestone['status'];
  progress?: number;
  priority?: Milestone['priority'];
  startDate?: string;
  dueDate?: string;
  assignedTo?: string[];
  dependencies?: string[];
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
  cost?: {
    estimated?: number;
    actual?: number;
    currency?: string;
  };
}

export interface CreateTimelineRequest {
  projectId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  workingDays: number[];
  holidays?: Timeline['holidays'];
  defaultView?: Timeline['defaultView'];
  timeScale?: Timeline['timeScale'];
  milestoneIds?: string[];
}

export interface ApplyTemplateRequest {
  projectId: string;
  templateId: string;
  startDate: string;
  adjustments?: {
    milestoneAdjustments?: Array<{
      templateIndex: number;
      title?: string;
      dueDate?: string;
      assignedTo?: string[];
    }>;
    globalSettings?: {
      workingDays?: number[];
      skipWeekends?: boolean;
    };
  };
}

// Component prop types
export interface TimelineViewProps {
  projectId: string;
  milestones: Milestone[];
  timeline: Timeline;
  currentUserId: string;
  viewMode: 'gantt' | 'kanban' | 'calendar' | 'list';
  onMilestoneClick: (milestone: Milestone) => void;
  onMilestoneUpdate: (milestoneId: string, updates: UpdateMilestoneRequest) => void;
  onDependencyAdd: (fromId: string, toId: string) => void;
  onDependencyRemove: (fromId: string, toId: string) => void;
  readonly?: boolean;
}

export interface GanttChartProps {
  milestones: Milestone[];
  timeline: Timeline;
  onMilestoneResize: (milestoneId: string, newDates: { startDate?: string; endDate?: string }) => void;
  onMilestoneDrag: (milestoneId: string, newDates: { startDate: string; endDate: string }) => void;
  onDependencyCreate: (fromId: string, toId: string) => void;
  showCriticalPath?: boolean;
  showProgress?: boolean;
  timeScale: 'day' | 'week' | 'month';
}

export interface MilestoneCardProps {
  milestone: Milestone;
  isSelected?: boolean;
  onSelect: (milestone: Milestone) => void;
  onEdit: (milestone: Milestone) => void;
  onStatusChange: (milestoneId: string, status: Milestone['status']) => void;
  onProgressUpdate: (milestoneId: string, progress: number) => void;
  showDetails?: boolean;
  draggable?: boolean;
}

export interface MilestoneDetailsPanelProps {
  milestone: Milestone;
  comments: MilestoneComment[];
  activities: MilestoneActivity[];
  onUpdate: (updates: UpdateMilestoneRequest) => void;
  onCommentAdd: (content: string, parentId?: string) => void;
  onTaskAdd: (task: Omit<MilestoneTask, 'id' | 'milestoneId' | 'createdAt' | 'updatedAt'>) => void;
  onDeliverableAdd: (deliverable: Omit<MilestoneDeliverable, 'id' | 'milestoneId' | 'createdAt' | 'updatedAt'>) => void;
  canEdit: boolean;
}

// Hook return types
export interface UseMilestonesReturn {
  // State
  milestones: Milestone[];
  timeline?: Timeline;
  templates: MilestoneTemplate[];
  analytics?: MilestoneAnalytics;
  
  // Loading states
  loading: {
    milestones: boolean;
    timeline: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    analytics: boolean;
  };
  
  // Actions
  actions: {
    loadMilestones: (projectId: string) => Promise<void>;
    createMilestone: (data: CreateMilestoneRequest) => Promise<string>;
    updateMilestone: (milestoneId: string, updates: UpdateMilestoneRequest) => Promise<void>;
    deleteMilestone: (milestoneId: string) => Promise<void>;
    addDependency: (fromId: string, toId: string) => Promise<void>;
    removeDependency: (fromId: string, toId: string) => Promise<void>;
    updateProgress: (milestoneId: string, progress: number) => Promise<void>;
    createTimeline: (data: CreateTimelineRequest) => Promise<string>;
    applyTemplate: (data: ApplyTemplateRequest) => Promise<void>;
    loadAnalytics: (projectId: string, timeframe?: { start: string; end: string }) => Promise<void>;
  };
}

export interface UseTimelineReturn {
  // Timeline state
  timeline?: Timeline;
  viewMode: 'gantt' | 'kanban' | 'calendar' | 'list';
  timeScale: 'day' | 'week' | 'month' | 'quarter';
  selectedMilestone?: Milestone;
  
  // Gantt-specific state
  criticalPath: string[];
  dependencies: Map<string, string[]>;
  
  // Actions
  actions: {
    setViewMode: (mode: 'gantt' | 'kanban' | 'calendar' | 'list') => void;
    setTimeScale: (scale: 'day' | 'week' | 'month' | 'quarter') => void;
    selectMilestone: (milestone: Milestone | null) => void;
    updateMilestoneDates: (milestoneId: string, dates: { startDate?: string; endDate?: string }) => Promise<void>;
    recalculateCriticalPath: () => void;
    exportTimeline: (format: 'pdf' | 'png' | 'json') => Promise<void>;
  };
  
  // Loading states
  loading: {
    timeline: boolean;
    exporting: boolean;
  };
}