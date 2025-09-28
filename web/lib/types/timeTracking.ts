/**
 * Time Tracking System Types
 * 
 * TypeScript interfaces for project time tracking system
 * including timer functionality, manual entry, and productivity analytics.
 */

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  
  // Project and task association
  projectId: string;
  projectName: string;
  milestoneId?: string;
  milestoneName?: string;
  taskId?: string;
  taskName?: string;
  
  // Time details
  startTime: string;
  endTime?: string;
  duration: number; // in seconds
  description?: string;
  
  // Entry metadata
  type: 'timer' | 'manual' | 'imported';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  
  // Billing and rates
  billable: boolean;
  hourlyRate?: number;
  currency: string;
  
  // Categories and tags
  category?: 'development' | 'design' | 'meeting' | 'research' | 'testing' | 'documentation' | 'other';
  tags?: string[];
  
  // Approval workflow
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Additional context
  metadata?: {
    location?: string;
    device?: string;
    screenshots?: Array<{
      id: string;
      url: string;
      timestamp: string;
    }>;
    activityLevel?: number; // 0-100
  };
}

export interface Timer {
  id: string;
  userId: string;
  projectId: string;
  milestoneId?: string;
  taskId?: string;
  
  // Timer state
  status: 'running' | 'paused' | 'stopped';
  startTime: string;
  pausedDuration: number; // total paused time in seconds
  description?: string;
  
  // Current session info
  currentSessionStart?: string;
  totalDuration: number; // in seconds
  
  // Settings
  billable: boolean;
  category?: TimeEntry['category'];
  tags?: string[];
  
  // Auto-pause settings
  autoPauseEnabled: boolean;
  autoPauseThreshold: number; // minutes of inactivity
  
  // Reminders
  reminderEnabled: boolean;
  reminderInterval: number; // minutes
  lastReminderAt?: string;
  
  // Metadata
  createdAt: string;
  lastActivityAt: string;
}

export interface Timesheet {
  id: string;
  userId: string;
  userName: string;
  
  // Timesheet period
  startDate: string;
  endDate: string;
  weekNumber?: number;
  month?: number;
  year: number;
  
  // Time entries
  entries: TimeEntry[];
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  
  // Breakdown by project
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    hours: number;
    billableHours: number;
    percentage: number;
  }>;
  
  // Breakdown by category
  categoryBreakdown: Record<NonNullable<TimeEntry['category']> | 'other', {
    hours: number;
    percentage: number;
  }>;
  
  // Status and approval
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
  
  // Financial information
  totalEarnings?: number;
  currency: string;
  invoiceId?: string;
  paidAt?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface WorkSchedule {
  id: string;
  userId: string;
  
  // Schedule definition
  workingDays: Array<{
    day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0
    startTime: string; // HH:MM format
    endTime: string;
    breakDuration: number; // minutes
  }>;
  
  // Time zone and locale
  timezone: string;
  hoursPerWeek: number;
  
  // Holidays and time off
  holidays: Array<{
    date: string;
    name: string;
    type: 'holiday' | 'vacation' | 'sick' | 'personal';
  }>;
  
  // Overtime settings
  overtimeThreshold: number; // hours per week
  overtimeRate: number; // multiplier (e.g., 1.5 for time and a half)
  
  // Effective period
  effectiveFrom: string;
  effectiveTo?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface ProductivityMetrics {
  userId: string;
  projectId?: string;
  timeframe: {
    startDate: string;
    endDate: string;
  };
  
  // Time distribution
  totalHours: number;
  workingDays: number;
  averageHoursPerDay: number;
  
  // Focus and efficiency
  focusScore: number; // 0-100
  averageSessionDuration: number; // minutes
  interruptionCount: number;
  deepWorkHours: number; // uninterrupted sessions > 2 hours
  
  // Activity patterns
  mostProductiveHours: number[]; // array of hours (0-23)
  peakProductivityDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  leastProductiveDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  
  // Category distribution
  timeByCategory: Record<NonNullable<TimeEntry['category']> | 'other', {
    hours: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  
  // Trends and insights
  weeklyTrends: Array<{
    week: string;
    totalHours: number;
    focusScore: number;
    averageSessionDuration: number;
  }>;
  
  // Goals and achievements
  weeklyGoalHours?: number;
  goalAchievementRate: number; // percentage
  streaks: {
    currentStreak: number; // days
    longestStreak: number;
    goalMeetingStreak: number;
  };
  
  // Recommendations
  insights: Array<{
    type: 'productivity' | 'focus' | 'schedule' | 'goal';
    title: string;
    description: string;
    actionable: boolean;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export interface TeamTimeAnalytics {
  teamId?: string;
  projectId: string;
  timeframe: {
    startDate: string;
    endDate: string;
  };
  
  // Team overview
  totalMembers: number;
  activeMembers: number;
  totalHours: number;
  billableHours: number;
  averageHoursPerMember: number;
  
  // Member performance
  memberStats: Array<{
    userId: string;
    userName: string;
    totalHours: number;
    billableHours: number;
    billableRate: number;
    focusScore: number;
    productivity: 'low' | 'medium' | 'high';
    trend: 'improving' | 'declining' | 'stable';
  }>;
  
  // Project breakdown
  milestoneBreakdown: Array<{
    milestoneId: string;
    milestoneName: string;
    hours: number;
    estimatedHours: number;
    progress: number;
    membersWorking: number;
    onTrack: boolean;
  }>;
  
  // Time allocation
  categoryDistribution: Record<NonNullable<TimeEntry['category']> | 'other', {
    hours: number;
    percentage: number;
    members: number;
  }>;
  
  // Efficiency metrics
  utilizationRate: number; // percentage of available time tracked
  focusEfficiency: number; // ratio of deep work to total work
  collaborationTime: number; // hours spent in meetings/calls
  
  // Predictions and forecasts
  projectCompletion: {
    estimatedDate: string;
    confidence: number;
    remainingHours: number;
    currentVelocity: number; // hours per day
  };
  
  // Issues and recommendations
  risks: Array<{
    type: 'underutilization' | 'overwork' | 'blocked_tasks' | 'skill_gaps';
    description: string;
    affectedMembers: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }>;
}

// API request/response types
export interface StartTimerRequest {
  projectId: string;
  milestoneId?: string;
  taskId?: string;
  description?: string;
  billable?: boolean;
  category?: TimeEntry['category'];
  tags?: string[];
  reminderEnabled?: boolean;
  reminderInterval?: number;
}

export interface StopTimerRequest {
  timerId: string;
  description?: string;
  billable?: boolean;
  category?: TimeEntry['category'];
  tags?: string[];
}

export interface CreateTimeEntryRequest {
  projectId: string;
  milestoneId?: string;
  taskId?: string;
  startTime: string;
  endTime: string;
  description?: string;
  billable?: boolean;
  hourlyRate?: number;
  currency?: string;
  category?: TimeEntry['category'];
  tags?: string[];
}

export interface UpdateTimeEntryRequest {
  description?: string;
  startTime?: string;
  endTime?: string;
  billable?: boolean;
  hourlyRate?: number;
  category?: TimeEntry['category'];
  tags?: string[];
}

export interface CreateTimesheetRequest {
  startDate: string;
  endDate: string;
  entryIds?: string[];
  notes?: string;
}

export interface SubmitTimesheetRequest {
  timesheetId: string;
  notes?: string;
}

export interface ApproveTimesheetRequest {
  timesheetId: string;
  approved: boolean;
  notes?: string;
  adjustments?: Array<{
    entryId: string;
    newDuration?: number;
    newBillable?: boolean;
    reason: string;
  }>;
}

// Component prop types
export interface TimerWidgetProps {
  currentTimer?: Timer;
  recentProjects: Array<{
    id: string;
    name: string;
    lastUsed: string;
  }>;
  onStart: (data: StartTimerRequest) => void;
  onStop: (data: StopTimerRequest) => void;
  onPause: (timerId: string) => void;
  onResume: (timerId: string) => void;
  compact?: boolean;
}

export interface TimeEntryListProps {
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entryId: string) => void;
  onToggleBillable: (entryId: string, billable: boolean) => void;
  onCategorize: (entryId: string, category: TimeEntry['category']) => void;
  groupBy?: 'date' | 'project' | 'category';
  showApprovalStatus?: boolean;
  editable?: boolean;
}

export interface TimesheetViewProps {
  timesheet: Timesheet;
  onSubmit?: (timesheetId: string, notes?: string) => void;
  onApprove?: (data: ApproveTimesheetRequest) => void;
  onReject?: (timesheetId: string, reason: string) => void;
  onEntryEdit?: (entryId: string, updates: UpdateTimeEntryRequest) => void;
  canEdit?: boolean;
  canApprove?: boolean;
}

export interface ProductivityDashboardProps {
  metrics: ProductivityMetrics;
  teamMetrics?: TeamTimeAnalytics;
  timeframe: { start: string; end: string };
  onTimeframeChange: (timeframe: { start: string; end: string }) => void;
  onGoalSet: (weeklyHours: number) => void;
  showTeamView?: boolean;
}

export interface TimeTrackingReportsProps {
  projectId?: string;
  teamId?: string;
  dateRange: { start: string; end: string };
  onExport: (format: 'csv' | 'pdf' | 'excel', filters: any) => void;
  onFilterChange: (filters: any) => void;
  canExport?: boolean;
}

// Hook return types
export interface UseTimerReturn {
  // Current timer state
  currentTimer?: Timer;
  isRunning: boolean;
  currentDuration: number;
  
  // Actions
  actions: {
    startTimer: (data: StartTimerRequest) => Promise<string>;
    stopTimer: (data: StopTimerRequest) => Promise<void>;
    pauseTimer: (timerId: string) => Promise<void>;
    resumeTimer: (timerId: string) => Promise<void>;
    updateTimer: (timerId: string, updates: Partial<StartTimerRequest>) => Promise<void>;
  };
  
  // Loading states
  loading: {
    starting: boolean;
    stopping: boolean;
    pausing: boolean;
  };
}

export interface UseTimeEntriesReturn {
  // Entries state
  entries: TimeEntry[];
  totalHours: number;
  billableHours: number;
  
  // Filtering and grouping
  filters: {
    projectId?: string;
    dateRange: { start: string; end: string };
    billable?: boolean;
    category?: TimeEntry['category'];
    approved?: boolean;
  };
  
  // Actions
  actions: {
    loadEntries: (filters?: Partial<UseTimeEntriesReturn['filters']>) => Promise<void>;
    createEntry: (data: CreateTimeEntryRequest) => Promise<string>;
    updateEntry: (entryId: string, updates: UpdateTimeEntryRequest) => Promise<void>;
    deleteEntry: (entryId: string) => Promise<void>;
    bulkUpdate: (entryIds: string[], updates: UpdateTimeEntryRequest) => Promise<void>;
    setFilters: (filters: Partial<UseTimeEntriesReturn['filters']>) => void;
  };
  
  // Loading states
  loading: {
    entries: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
  };
}

export interface UseTimesheetsReturn {
  // Timesheets state
  timesheets: Timesheet[];
  currentTimesheet?: Timesheet;
  
  // Actions
  actions: {
    loadTimesheets: (filters?: { status?: Timesheet['status']; userId?: string }) => Promise<void>;
    createTimesheet: (data: CreateTimesheetRequest) => Promise<string>;
    submitTimesheet: (data: SubmitTimesheetRequest) => Promise<void>;
    approveTimesheet: (data: ApproveTimesheetRequest) => Promise<void>;
    rejectTimesheet: (timesheetId: string, reason: string) => Promise<void>;
    generateTimesheet: (userId: string, startDate: string, endDate: string) => Promise<string>;
  };
  
  // Loading states
  loading: {
    timesheets: boolean;
    creating: boolean;
    submitting: boolean;
    approving: boolean;
  };
}

export interface UseTimeAnalyticsReturn {
  // Analytics state
  productivity: ProductivityMetrics | null;
  teamAnalytics: TeamTimeAnalytics | null;
  
  // Actions
  actions: {
    loadProductivityMetrics: (userId: string, timeframe: { start: string; end: string }) => Promise<void>;
    loadTeamAnalytics: (projectId: string, timeframe: { start: string; end: string }) => Promise<void>;
    setProductivityGoal: (weeklyHours: number) => Promise<void>;
    exportReport: (format: 'csv' | 'pdf', filters: any) => Promise<void>;
  };
  
  // Loading states
  loading: {
    productivity: boolean;
    teamAnalytics: boolean;
    exporting: boolean;
  };
}