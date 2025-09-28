/**
 * Analytics Service
 * 
 * Handles all analytics API interactions including dashboard metrics,
 * project analytics, team performance, financial data, and report generation.
 */

import { BaseService } from './baseService';
import {
  DashboardMetrics,
  ProjectAnalytics,
  TeamAnalytics,
  FinancialAnalytics,
  ProductivityAnalytics,
  ReportTemplate,
  ReportGenerationRequest,
  AnalyticsRequest,
  DashboardConfig,
  DashboardWidget,
  DashboardDataRequest,
  DateRange,
  ChartDataPoint
} from '@/lib/types/analytics';

class AnalyticsService extends BaseService {
  private readonly endpoint = '/analytics';

  constructor() {
    super();
  }

  // =====================================
  // Dashboard Metrics
  // =====================================

  /**
   * Load overview dashboard metrics
   */
  async getDashboardMetrics(timeframe: DateRange): Promise<DashboardMetrics> {
    const response = await this.get<DashboardMetrics>(`${this.endpoint}/dashboard`, {
      params: {
        start_date: timeframe.startDate,
        end_date: timeframe.endDate
      }
    });

    return response.data;
  }

  /**
   * Get real-time dashboard updates
   */
  async getDashboardUpdates(): Promise<Partial<DashboardMetrics>> {
    const response = await this.get<Partial<DashboardMetrics>>(`${this.endpoint}/dashboard/updates`);
    return response.data;
  }

  // =====================================
  // Project Analytics
  // =====================================

  /**
   * Get detailed analytics for a specific project
   */
  async getProjectAnalytics(
    projectId: string, 
    timeframe: DateRange
  ): Promise<ProjectAnalytics> {
    const response = await this.get<ProjectAnalytics>(`${this.endpoint}/projects/${projectId}`, {
      params: {
        start_date: timeframe.startDate,
        end_date: timeframe.endDate
      }
    });

    return response.data;
  }

  /**
   * Get analytics for multiple projects
   */
  async getMultipleProjectsAnalytics(
    projectIds: string[],
    timeframe: DateRange
  ): Promise<ProjectAnalytics[]> {
    const response = await this.post<ProjectAnalytics[]>(`${this.endpoint}/projects/bulk`, {
      project_ids: projectIds,
      start_date: timeframe.startDate,
      end_date: timeframe.endDate
    });

    return response.data;
  }

  /**
   * Get project comparison analytics
   */
  async compareProjects(
    projectIds: string[],
    metrics: string[],
    timeframe: DateRange
  ): Promise<{
    projects: Array<{
      projectId: string;
      projectName: string;
      metrics: Record<string, number>;
    }>;
    comparison: Record<string, {
      best: string;
      worst: string;
      average: number;
    }>;
  }> {
    type CompareProjectsResponse = {
      projects: Array<{
        projectId: string;
        projectName: string;
        metrics: Record<string, number>;
      }>;
      comparison: Record<string, {
        best: string;
        worst: string;
        average: number;
      }>;
    };
    
    const response = await this.post<CompareProjectsResponse>(`${this.endpoint}/projects/compare`, {
      project_ids: projectIds,
      metrics,
      start_date: timeframe.startDate,
      end_date: timeframe.endDate
    });

    return response.data;
  }

  // =====================================
  // Team Analytics
  // =====================================

  /**
   * Get team performance analytics
   */
  async getTeamAnalytics(
    teamId: string,
    timeframe: DateRange
  ): Promise<TeamAnalytics> {
    const response = await this.get<TeamAnalytics>(`${this.endpoint}/teams/${teamId}`, {
      params: {
        start_date: timeframe.startDate,
        end_date: timeframe.endDate
      }
    });

    return response.data;
  }

  /**
   * Get organization-wide team analytics
   */
  async getOrganizationAnalytics(timeframe: DateRange): Promise<TeamAnalytics> {
    const response = await this.get<TeamAnalytics>(`${this.endpoint}/organization`, {
      params: {
        start_date: timeframe.startDate,
        end_date: timeframe.endDate
      }
    });

    return response.data;
  }

  /**
   * Get individual user performance analytics
   */
  async getUserAnalytics(
    userId: string,
    timeframe: DateRange
  ): Promise<{
    userId: string;
    userName: string;
    performance: TeamAnalytics['memberPerformance'][0];
    projectContributions: Array<{
      projectId: string;
      projectName: string;
      contribution: number; // percentage
      role: string;
      hours: number;
    }>;
    skillDevelopment: Array<{
      skill: string;
      previousLevel: number;
      currentLevel: number;
      improvement: number;
    }>;
  }> {
    const response = await this.get<any>(`${this.endpoint}/users/${userId}`, {
      params: {
        start_date: timeframe.startDate,
        end_date: timeframe.endDate
      }
    });

    return response.data;
  }

  // =====================================
  // Financial Analytics
  // =====================================

  /**
   * Get financial analytics and metrics
   */
  async getFinancialAnalytics(timeframe: DateRange): Promise<FinancialAnalytics> {
    const response = await this.get<any>(`${this.endpoint}/financial`, {
      params: {
        start_date: timeframe.startDate,
        end_date: timeframe.endDate
      }
    });

    return response.data;
  }

  /**
   * Get revenue forecasting data
   */
  async getRevenueForecasting(
    months: number = 6
  ): Promise<{
    historical: Array<{
      month: string;
      revenue: number;
      costs: number;
      profit: number;
    }>;
    forecast: Array<{
      month: string;
      estimatedRevenue: number;
      projectedCosts: number;
      expectedProfit: number;
      confidence: number; // 0-100
    }>;
  }> {
    const response = await this.get<any>(`${this.endpoint}/financial/forecast`, {
      params: { months }
    });

    return response.data;
  }

  /**
   * Get client profitability analysis
   */
  async getClientProfitability(
    timeframe: DateRange,
    clientId?: string
  ): Promise<{
    clients: Array<{
      clientId: string;
      clientName: string;
      totalRevenue: number;
      totalCosts: number;
      profit: number;
      margin: number;
      projectCount: number;
      averageProjectValue: number;
      riskScore: number; // 0-100
    }>;
    summary: {
      totalClients: number;
      profitableClients: number;
      averageMargin: number;
      topClient: string;
    };
  }> {
    const response = await this.get<any>(`${this.endpoint}/financial/clients`, {
      params: {
        start_date: timeframe.startDate,
        end_date: timeframe.endDate,
        client_id: clientId
      }
    });

    return response.data;
  }

  // =====================================
  // Productivity Analytics
  // =====================================

  /**
   * Get productivity analytics for user, team, or organization
   */
  async getProductivityAnalytics(
    scope: 'individual' | 'team' | 'organization',
    targetId: string,
    timeframe: DateRange
  ): Promise<ProductivityAnalytics> {
    const response = await this.get<any>(`${this.endpoint}/productivity/${scope}/${targetId}`, {
      params: {
        start_date: timeframe.startDate,
        end_date: timeframe.endDate
      }
    });

    return response.data;
  }

  /**
   * Get productivity recommendations
   */
  async getProductivityRecommendations(
    userId: string,
    timeframe: DateRange
  ): Promise<{
    recommendations: Array<{
      category: string;
      title: string;
      description: string;
      impact: string;
      effort: string;
      priority: number;
      actionItems: string[];
    }>;
    benchmarks: {
      industryAverage: number;
      teamAverage: number;
      topPerformer: number;
    };
  }> {
    const response = await this.get<any>(`${this.endpoint}/productivity/recommendations/${userId}`, {
      params: {
        start_date: timeframe.startDate,
        end_date: timeframe.endDate
      }
    });

    return response.data;
  }

  // =====================================
  // Report Generation
  // =====================================

  /**
   * Get all report templates
   */
  async getReportTemplates(): Promise<ReportTemplate[]> {
    const response = await this.get<any>(`${this.endpoint}/reports/templates`);
    return response.data;
  }

  /**
   * Create a new report template
   */
  async createReportTemplate(
    template: Omit<ReportTemplate, 'id' | 'createdAt'>
  ): Promise<string> {
    const response = await this.post<{ id: string }>(`${this.endpoint}/reports/templates`, template);
    return response.data.id;
  }

  /**
   * Update an existing report template
   */
  async updateReportTemplate(
    templateId: string,
    updates: Partial<ReportTemplate>
  ): Promise<void> {
    await this.put<any>(`${this.endpoint}/reports/templates/${templateId}`, updates);
  }

  /**
   * Delete a report template
   */
  async deleteReportTemplate(templateId: string): Promise<void> {
    await this.delete<any>(`${this.endpoint}/reports/templates/${templateId}`);
  }

  /**
   * Generate a report from template
   */
  async generateReport(request: ReportGenerationRequest): Promise<string> {
    const response = await this.post<{ reportId: string }>(`${this.endpoint}/reports/generate`, request);
    return response.data.reportId;
  }

  /**
   * Get report generation status
   */
  async getReportStatus(reportId: string): Promise<{
    id: string;
    status: 'generating' | 'completed' | 'failed';
    progress: number; // 0-100
    downloadUrl?: string;
    error?: string;
    estimatedTimeRemaining?: number; // minutes
  }> {
    const response = await this.get<any>(`${this.endpoint}/reports/${reportId}/status`);
    return response.data;
  }

  /**
   * Download generated report
   */
  async downloadReport(reportId: string): Promise<Blob> {
    const response = await this.get<Blob>(
      `${this.endpoint}/reports/${reportId}/download`,
      {
        responseType: 'blob'
      }
    );
    return response.data;
  }

  /**
   * Get generated reports history
   */
  async getGeneratedReports(limit: number = 50): Promise<Array<{
    id: string;
    templateId: string;
    name: string;
    format: string;
    status: 'generating' | 'completed' | 'failed';
    downloadUrl?: string;
    createdAt: string;
    completedAt?: string;
    fileSize?: number;
  }>> {
    const response = await this.get<any>(`${this.endpoint}/reports`, {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Schedule recurring report
   */
  async scheduleReport(
    templateId: string,
    schedule: ReportTemplate['schedule']
  ): Promise<void> {
    await this.post<any>(`${this.endpoint}/reports/templates/${templateId}/schedule`, {
      schedule
    });
  }

  /**
   * Cancel scheduled report
   */
  async cancelScheduledReport(templateId: string): Promise<void> {
    await this.delete<any>(`${this.endpoint}/reports/templates/${templateId}/schedule`);
  }

  // =====================================
  // Dashboard Configuration
  // =====================================

  /**
   * Get user's dashboard configurations
   */
  async getDashboardConfigs(): Promise<DashboardConfig[]> {
    const response = await this.get<any>(`${this.endpoint}/dashboards`);
    return response.data;
  }

  /**
   * Create a new dashboard configuration
   */
  async createDashboardConfig(
    config: Omit<DashboardConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const response = await this.post<{ id: string }>(`${this.endpoint}/dashboards`, config);
    return response.data.id;
  }

  /**
   * Update dashboard configuration
   */
  async updateDashboardConfig(
    dashboardId: string,
    updates: Partial<DashboardConfig>
  ): Promise<void> {
    await this.put<any>(`${this.endpoint}/dashboards/${dashboardId}`, updates);
  }

  /**
   * Delete dashboard configuration
   */
  async deleteDashboardConfig(dashboardId: string): Promise<void> {
    await this.delete<any>(`${this.endpoint}/dashboards/${dashboardId}`);
  }

  /**
   * Get dashboard data for widgets
   */
  async getDashboardData(request: DashboardDataRequest): Promise<{
    widgets: Record<string, {
      data: any;
      lastUpdated: string;
      error?: string;
    }>;
  }> {
    const response = await this.post<any>(`${this.endpoint}/dashboards/data`, request);
    return response.data;
  }

  /**
   * Add widget to dashboard
   */
  async addDashboardWidget(
    dashboardId: string,
    widget: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const response = await this.post<{ widgetId: string }>(
      `${this.endpoint}/dashboards/${dashboardId}/widgets`,
      widget
    );
    return response.data.widgetId;
  }

  /**
   * Update dashboard widget
   */
  async updateDashboardWidget(
    dashboardId: string,
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<void> {
    await this.put<void>(
      `${this.endpoint}/dashboards/${dashboardId}/widgets/${widgetId}`,
      updates
    );
  }

  /**
   * Remove widget from dashboard
   */
  async removeDashboardWidget(
    dashboardId: string,
    widgetId: string
  ): Promise<void> {
    await this.delete<void>(
      `${this.endpoint}/dashboards/${dashboardId}/widgets/${widgetId}`
    );
  }

  // =====================================
  // Data Export
  // =====================================

  /**
   * Export analytics data in various formats
   */
  async exportData(
    type: 'project' | 'team' | 'financial' | 'productivity',
    format: 'csv' | 'excel' | 'json',
    filters: {
      timeframe: DateRange;
      projectId?: string;
      teamId?: string;
      userId?: string;
      includeRawData?: boolean;
    }
  ): Promise<Blob> {
    const response = await this.post<Blob>(
      `${this.endpoint}/export`,
      {
        type,
        format,
        ...filters
      },
      {
        responseType: 'blob'
      }
    );
    return response.data;
  }

  /**
   * Export dashboard data
   */
  async exportDashboard(
    dashboardId: string,
    format: 'pdf' | 'png' | 'json'
  ): Promise<Blob> {
    const response = await this.get<Blob>(
      `${this.endpoint}/dashboards/${dashboardId}/export`,
      {
        params: { format },
        responseType: 'blob'
      }
    );
    return response.data;
  }

  // =====================================
  // Charts and Visualizations
  // =====================================

  /**
   * Get chart data for visualizations
   */
  async getChartData(
    chartType: string,
    dataSource: string,
    filters: Record<string, any> = {},
    timeframe?: DateRange
  ): Promise<{
    data: ChartDataPoint[];
    metadata: {
      title: string;
      xAxisLabel: string;
      yAxisLabel: string;
      total?: number;
      average?: number;
      trend?: 'up' | 'down' | 'stable';
    };
  }> {
    const response = await this.post<any>(`${this.endpoint}/charts/${chartType}`, {
      data_source: dataSource,
      filters,
      start_date: timeframe?.startDate,
      end_date: timeframe?.endDate
    });

    return response.data;
  }

  /**
   * Get available chart types for a data source
   */
  async getAvailableCharts(dataSource: string): Promise<Array<{
    type: string;
    name: string;
    description: string;
    supportedFilters: string[];
    requiredFilters: string[];
  }>> {
    const response = await this.get<any>(`${this.endpoint}/charts/available`, {
      params: { data_source: dataSource }
    });
    return response.data;
  }

  // =====================================
  // Alerts and Notifications
  // =====================================

  /**
   * Create analytics alert
   */
  async createAlert(alert: {
    name: string;
    description?: string;
    metric: string;
    condition: 'greater_than' | 'less_than' | 'equals' | 'change_by';
    threshold: number;
    scope: {
      type: 'project' | 'team' | 'user' | 'organization';
      targetId?: string;
    };
    frequency: 'real_time' | 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    isActive: boolean;
  }): Promise<string> {
    const response = await this.post<{ alertId: string }>(`${this.endpoint}/alerts`, alert);
    return response.data.alertId;
  }

  /**
   * Get user's analytics alerts
   */
  async getAlerts(): Promise<Array<{
    id: string;
    name: string;
    metric: string;
    condition: string;
    threshold: number;
    isActive: boolean;
    lastTriggered?: string;
    createdAt: string;
  }>> {
    const response = await this.get<any>(`${this.endpoint}/alerts`);
    return response.data;
  }

  /**
   * Update analytics alert
   */
  async updateAlert(
    alertId: string,
    updates: Partial<{
      name: string;
      threshold: number;
      isActive: boolean;
      recipients: string[];
    }>
  ): Promise<void> {
    await this.put<any>(`${this.endpoint}/alerts/${alertId}`, updates);
  }

  /**
   * Delete analytics alert
   */
  async deleteAlert(alertId: string): Promise<void> {
    await this.delete<any>(`${this.endpoint}/alerts/${alertId}`);
  }

  // =====================================
  // Benchmarking
  // =====================================

  /**
   * Get industry benchmarks for comparison
   */
  async getIndustryBenchmarks(
    industry: string,
    companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  ): Promise<{
    industry: string;
    companySize: string;
    benchmarks: {
      projectCompletionRate: number;
      averageProjectDuration: number;
      teamUtilization: number;
      clientSatisfaction: number;
      profitMargin: number;
      hourlyRate: {
        junior: number;
        mid: number;
        senior: number;
        lead: number;
      };
    };
    lastUpdated: string;
  }> {
    const response = await this.get<any>(`${this.endpoint}/benchmarks`, {
      params: {
        industry,
        company_size: companySize
      }
    });
    return response.data;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
