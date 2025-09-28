/**
 * Analytics & Reporting Dashboard Types
 * 
 * TypeScript interfaces for comprehensive analytics system
 * including project metrics, team performance, and productivity insights.
 */

// =====================================
// Core Analytics Types
// =====================================

export interface DashboardMetrics {
  // Overview metrics
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTeamMembers: number;
  totalHours: number;
  
  // Performance indicators
  projectCompletionRate: number; // percentage
  averageProjectDuration: number; // in days
  onTimeDeliveryRate: number; // percentage
  teamUtilization: number; // percentage
  
  // Recent activity
  recentActivities: ActivityMetric[];
  
  // Trends
  monthOverMonth: {
    projectsCreated: number; // percentage change
    hoursLogged: number;
    teamProductivity: number;
    completionRate: number;
  };
}

export interface ActivityMetric {
  id: string;
  type: 'project_created' | 'milestone_completed' | 'team_joined' | 'hours_logged';
  description: string;
  value?: number;
  timestamp: string;
  projectId?: string;
  userId?: string;
}

// =====================================
// Project Analytics
// =====================================

export interface ProjectAnalytics {
  projectId: string;
  projectName: string;
  timeframe: DateRange;
  
  // Basic metrics
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  progress: number; // 0-100
  teamSize: number;
  totalHours: number;
  estimatedHours?: number;
  
  // Timeline metrics
  startDate: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  daysRemaining?: number;
  isOnTime: boolean;
  scheduleVariance: number; // days ahead/behind
  
  // Budget metrics
  budgetAllocated?: number;
  budgetSpent?: number;
  budgetRemaining?: number;
  costPerHour?: number;
  
  // Team performance
  teamMembers: Array<{
    userId: string;
    userName: string;
    role: string;
    hoursLogged: number;
    tasksCompleted: number;
    productivity: 'low' | 'medium' | 'high';
    lastActive: string;
  }>;
  
  // Milestone progress
  milestones: Array<{
    id: string;
    title: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
    progress: number;
    dueDate?: string;
    completedDate?: string;
    daysOverdue?: number;
  }>;
  
  // Time allocation
  timeByCategory: Record<string, {
    hours: number;
    percentage: number;
  }>;
  
  timeByMember: Array<{
    userId: string;
    userName: string;
    hours: number;
    percentage: number;
    dailyAverage: number;
  }>;
  
  // Activity trends
  dailyActivity: Array<{
    date: string;
    hours: number;
    commits?: number;
    messagesCount: number;
    tasksCompleted: number;
  }>;
  
  // Risk assessment
  risks: Array<{
    type: 'schedule' | 'budget' | 'quality' | 'resource';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
    recommendation: string;
  }>;
  
  // Quality metrics
  qualityMetrics?: {
    codeQuality?: number; // 0-100
    testCoverage?: number; // 0-100
    bugCount?: number;
    clientSatisfaction?: number; // 0-100
  };
}

// =====================================
// Team Analytics
// =====================================

export interface TeamAnalytics {
  teamId?: string;
  teamName?: string;
  timeframe: DateRange;
  
  // Team overview
  memberCount: number;
  activeMembers: number;
  averageExperience: number; // years
  totalCapacity: number; // hours per week
  
  // Performance metrics
  totalHours: number;
  billableHours: number;
  utilization: number; // percentage
  productivity: number; // tasks completed per hour
  collaborationScore: number; // 0-100
  
  // Individual performance
  memberPerformance: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    role: string;
    
    // Time metrics
    hoursLogged: number;
    billableHours: number;
    utilization: number;
    
    // Productivity
    tasksCompleted: number;
    milestonesCompleted: number;
    averageTaskTime: number; // hours
    
    // Collaboration
    messagesCount: number;
    meetingsAttended: number;
    codeReviews: number;
    
    // Quality
    bugReports?: number;
    clientFeedback?: number; // 0-100
    
    // Trends
    trend: 'improving' | 'stable' | 'declining';
    lastActiveProjects: string[];
  }>;
  
  // Skill analysis
  skillsMatrix: Array<{
    skill: string;
    proficiencyLevel: number; // 0-100
    memberCount: number;
    demandLevel: 'low' | 'medium' | 'high';
  }>;
  
  // Workload distribution
  workloadBalance: {
    overloaded: string[]; // user IDs
    underutilized: string[]; // user IDs
    balanced: string[]; // user IDs
    averageWorkload: number; // hours per week
  };
  
  // Communication patterns
  communicationMetrics: {
    messagesPerDay: number;
    meetingHours: number;
    responseTime: number; // average hours
    collaborationIndex: number; // 0-100
  };
  
  // Project involvement
  projectDistribution: Array<{
    projectId: string;
    projectName: string;
    memberCount: number;
    totalHours: number;
    status: string;
  }>;
}

// =====================================
// Financial Analytics
// =====================================

export interface FinancialAnalytics {
  timeframe: DateRange;
  
  // Revenue metrics
  totalRevenue: number;
  billableRevenue: number;
  recurringRevenue: number;
  newRevenue: number;
  
  // Cost metrics
  totalCosts: number;
  laborCosts: number;
  operatingCosts: number;
  toolCosts: number;
  
  // Profitability
  grossProfit: number;
  netProfit: number;
  profitMargin: number; // percentage
  
  // Billing metrics
  averageHourlyRate: number;
  utilizationRate: number;
  billableHours: number;
  nonBillableHours: number;
  
  // Project profitability
  projectProfitability: Array<{
    projectId: string;
    projectName: string;
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
    hoursLogged: number;
    ratePerHour: number;
  }>;
  
  // Client analysis
  clientMetrics: Array<{
    clientId: string;
    clientName: string;
    totalRevenue: number;
    projectCount: number;
    averageProjectValue: number;
    paymentTerms: number; // days
    satisfaction: number; // 0-100
  }>;
  
  // Forecasting
  forecast: {
    nextMonth: {
      estimatedRevenue: number;
      projectedCosts: number;
      expectedProfit: number;
    };
    nextQuarter: {
      estimatedRevenue: number;
      projectedCosts: number;
      expectedProfit: number;
    };
  };
}

// =====================================
// Productivity Analytics
// =====================================

export interface ProductivityAnalytics {
  timeframe: DateRange;
  scope: 'individual' | 'team' | 'organization';
  
  // Overall productivity
  productivityScore: number; // 0-100
  efficiencyRating: number; // 0-100
  focusIndex: number; // 0-100
  
  // Time analysis
  timeDistribution: {
    deepWork: number; // hours
    meetings: number;
    communication: number;
    administrative: number;
    breaks: number;
  };
  
  // Work patterns
  peakHours: Array<{
    hour: number; // 0-23
    productivityLevel: number; // 0-100
  }>;
  
  peakDays: Array<{
    day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0
    productivityLevel: number;
  }>;
  
  // Interruption analysis
  interruptions: {
    frequency: number; // per day
    averageDuration: number; // minutes
    types: Array<{
      type: 'meeting' | 'message' | 'call' | 'email' | 'other';
      count: number;
      impact: 'low' | 'medium' | 'high';
    }>;
  };
  
  // Focus metrics
  focusSessions: Array<{
    date: string;
    duration: number; // minutes
    quality: 'low' | 'medium' | 'high';
    achievements: string[];
  }>;
  
  // Goals and achievements
  goalProgress: Array<{
    goalType: 'daily' | 'weekly' | 'monthly';
    target: number;
    actual: number;
    achievement: number; // percentage
  }>;
  
  // Recommendations
  recommendations: Array<{
    category: 'time_management' | 'focus' | 'collaboration' | 'tools';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'easy' | 'moderate' | 'difficult';
  }>;
}

// =====================================
// Report Generation Types
// =====================================

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'project' | 'team' | 'financial' | 'productivity' | 'custom';
  
  // Report configuration
  sections: ReportSection[];
  filters: ReportFilter[];
  visualizations: VisualizationType[];
  
  // Schedule and delivery
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string; // HH:MM format
  };
  
  recipients: string[]; // user IDs or email addresses
  format: 'pdf' | 'excel' | 'csv' | 'html';
  
  // Metadata
  createdBy: string;
  createdAt: string;
  lastRun?: string;
  isActive: boolean;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'metrics' | 'chart' | 'table' | 'text';
  dataSource: string;
  configuration: Record<string, any>;
  order: number;
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: any;
  label: string;
}

export type VisualizationType = 
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'area_chart'
  | 'scatter_plot'
  | 'heatmap'
  | 'gauge'
  | 'table'
  | 'metric_card';

// =====================================
// Dashboard Configuration
// =====================================

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  
  // Layout configuration
  layout: 'grid' | 'masonry' | 'flexible';
  columns: number;
  
  // Widgets configuration
  widgets: DashboardWidget[];
  
  // Permissions
  ownerId: string;
  visibility: 'private' | 'team' | 'organization';
  sharedWith: string[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastViewed?: string;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'progress' | 'activity_feed';
  title: string;
  
  // Layout
  position: { x: number; y: number };
  size: { width: number; height: number };
  
  // Data configuration
  dataSource: string;
  filters: Record<string, any>;
  refreshInterval?: number; // minutes
  
  // Visualization
  chartType?: VisualizationType;
  chartOptions?: Record<string, any>;
  
  // Interactions
  clickAction?: 'drill_down' | 'open_detail' | 'navigate';
  drillDownTarget?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// =====================================
// Utility Types
// =====================================

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface MetricComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

// =====================================
// API Request/Response Types
// =====================================

export interface AnalyticsRequest {
  type: 'project' | 'team' | 'financial' | 'productivity';
  timeframe: DateRange;
  filters?: Record<string, any>;
  projectId?: string;
  teamId?: string;
  userId?: string;
}

export interface ReportGenerationRequest {
  templateId: string;
  timeframe: DateRange;
  filters?: Record<string, any>;
  format: 'pdf' | 'excel' | 'csv';
  recipients?: string[];
  schedule?: boolean;
}

export interface DashboardDataRequest {
  dashboardId: string;
  widgetIds?: string[];
  timeframe?: DateRange;
  filters?: Record<string, any>;
}

// =====================================
// Component Props
// =====================================

export interface AnalyticsDashboardProps {
  config: DashboardConfig;
  onConfigChange: (config: DashboardConfig) => void;
  onWidgetAdd: (widget: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onWidgetRemove: (widgetId: string) => void;
  onWidgetUpdate: (widgetId: string, updates: Partial<DashboardWidget>) => void;
  editMode?: boolean;
  className?: string;
}

export interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  comparison?: MetricComparison;
  trend?: 'up' | 'down' | 'stable';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface AnalyticsChartProps {
  type: VisualizationType;
  data: ChartDataPoint[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  color?: string;
  height?: number;
  loading?: boolean;
  onDataPointClick?: (point: ChartDataPoint) => void;
  options?: Record<string, any>;
  className?: string;
}

// =====================================
// Hook Return Types
// =====================================

export interface UseAnalyticsReturn {
  // Data
  dashboardMetrics?: DashboardMetrics;
  projectAnalytics?: ProjectAnalytics;
  teamAnalytics?: TeamAnalytics;
  financialAnalytics?: FinancialAnalytics;
  productivityAnalytics?: ProductivityAnalytics;
  
  // Loading states
  loading: {
    dashboard: boolean;
    project: boolean;
    team: boolean;
    financial: boolean;
    productivity: boolean;
  };
  
  // Actions
  actions: {
    loadDashboardMetrics: (timeframe: DateRange) => Promise<void>;
    loadProjectAnalytics: (projectId: string, timeframe: DateRange) => Promise<void>;
    loadTeamAnalytics: (teamId: string, timeframe: DateRange) => Promise<void>;
    loadFinancialAnalytics: (timeframe: DateRange) => Promise<void>;
    loadProductivityAnalytics: (userId: string, timeframe: DateRange) => Promise<void>;
    generateReport: (request: ReportGenerationRequest) => Promise<string>;
    exportData: (type: string, format: 'csv' | 'excel', filters?: any) => Promise<void>;
  };
}

export interface UseReportsReturn {
  // State
  templates: ReportTemplate[];
  generatedReports: Array<{
    id: string;
    templateId: string;
    name: string;
    status: 'generating' | 'completed' | 'failed';
    downloadUrl?: string;
    createdAt: string;
  }>;
  
  // Actions
  actions: {
    loadTemplates: () => Promise<void>;
    createTemplate: (template: Omit<ReportTemplate, 'id' | 'createdAt'>) => Promise<string>;
    updateTemplate: (templateId: string, updates: Partial<ReportTemplate>) => Promise<void>;
    deleteTemplate: (templateId: string) => Promise<void>;
    generateReport: (request: ReportGenerationRequest) => Promise<string>;
    scheduleReport: (templateId: string, schedule: ReportTemplate['schedule']) => Promise<void>;
    downloadReport: (reportId: string) => Promise<void>;
  };
  
  // Loading states
  loading: {
    templates: boolean;
    generating: boolean;
    downloading: boolean;
  };
}