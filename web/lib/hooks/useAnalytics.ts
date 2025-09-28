/**
 * Analytics Hooks
 * 
 * React hooks for managing analytics data, dashboard configuration,
 * and real-time updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { analyticsService } from '@/lib/services/analyticsService';
import {
  DashboardMetrics,
  ProjectAnalytics,
  TeamAnalytics,
  FinancialAnalytics,
  ProductivityAnalytics,
  ReportTemplate,
  ReportGenerationRequest,
  DashboardConfig,
  DashboardWidget,
  DateRange,
  UseAnalyticsReturn,
  UseReportsReturn,
  ChartDataPoint
} from '@/lib/types/analytics';

// =====================================
// Main Analytics Hook
// =====================================

export const useAnalytics = (autoRefresh: boolean = true): UseAnalyticsReturn => {
  // State
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>();
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalytics>();
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics>();
  const [financialAnalytics, setFinancialAnalytics] = useState<FinancialAnalytics>();
  const [productivityAnalytics, setProductivityAnalytics] = useState<ProductivityAnalytics>();

  // Loading states
  const [loading, setLoading] = useState({
    dashboard: false,
    project: false,
    team: false,
    financial: false,
    productivity: false
  });

  // Refs for cleanup
  const refreshInterval = useRef<NodeJS.Timeout>();

  // Set loading state for specific type
  const setTypeLoading = useCallback((type: keyof typeof loading, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [type]: isLoading }));
  }, []);

  // Load dashboard metrics
  const loadDashboardMetrics = useCallback(async (timeframe: DateRange) => {
    try {
      setTypeLoading('dashboard', true);
      const data = await analyticsService.getDashboardMetrics(timeframe);
      setDashboardMetrics(data);
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      throw error;
    } finally {
      setTypeLoading('dashboard', false);
    }
  }, [setTypeLoading]);

  // Load project analytics
  const loadProjectAnalytics = useCallback(async (
    projectId: string, 
    timeframe: DateRange
  ) => {
    try {
      setTypeLoading('project', true);
      const data = await analyticsService.getProjectAnalytics(projectId, timeframe);
      setProjectAnalytics(data);
    } catch (error) {
      console.error('Failed to load project analytics:', error);
      throw error;
    } finally {
      setTypeLoading('project', false);
    }
  }, [setTypeLoading]);

  // Load team analytics
  const loadTeamAnalytics = useCallback(async (
    teamId: string, 
    timeframe: DateRange
  ) => {
    try {
      setTypeLoading('team', true);
      const data = await analyticsService.getTeamAnalytics(teamId, timeframe);
      setTeamAnalytics(data);
    } catch (error) {
      console.error('Failed to load team analytics:', error);
      throw error;
    } finally {
      setTypeLoading('team', false);
    }
  }, [setTypeLoading]);

  // Load financial analytics
  const loadFinancialAnalytics = useCallback(async (timeframe: DateRange) => {
    try {
      setTypeLoading('financial', true);
      const data = await analyticsService.getFinancialAnalytics(timeframe);
      setFinancialAnalytics(data);
    } catch (error) {
      console.error('Failed to load financial analytics:', error);
      throw error;
    } finally {
      setTypeLoading('financial', false);
    }
  }, [setTypeLoading]);

  // Load productivity analytics
  const loadProductivityAnalytics = useCallback(async (
    userId: string, 
    timeframe: DateRange
  ) => {
    try {
      setTypeLoading('productivity', true);
      const data = await analyticsService.getProductivityAnalytics('individual', userId, timeframe);
      setProductivityAnalytics(data);
    } catch (error) {
      console.error('Failed to load productivity analytics:', error);
      throw error;
    } finally {
      setTypeLoading('productivity', false);
    }
  }, [setTypeLoading]);

  // Generate report
  const generateReport = useCallback(async (request: ReportGenerationRequest): Promise<string> => {
    return await analyticsService.generateReport(request);
  }, []);

  // Export data
  const exportData = useCallback(async (
    type: string, 
    format: 'csv' | 'excel', 
    filters?: any
  ): Promise<void> => {
    const blob = await analyticsService.exportData(
      type as 'project' | 'team' | 'financial' | 'productivity',
      format,
      filters
    );
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${type}_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Setup auto-refresh for dashboard metrics
  useEffect(() => {
    if (autoRefresh && dashboardMetrics) {
      refreshInterval.current = setInterval(async () => {
        try {
          const updates = await analyticsService.getDashboardUpdates();
          setDashboardMetrics(prev => prev ? { ...prev, ...updates } : prev);
        } catch (error) {
          console.error('Failed to refresh dashboard:', error);
        }
      }, 60000); // Refresh every minute
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [autoRefresh, dashboardMetrics]);

  return {
    dashboardMetrics,
    projectAnalytics,
    teamAnalytics,
    financialAnalytics,
    productivityAnalytics,
    loading,
    actions: {
      loadDashboardMetrics,
      loadProjectAnalytics,
      loadTeamAnalytics,
      loadFinancialAnalytics,
      loadProductivityAnalytics,
      generateReport,
      exportData
    }
  };
};

// =====================================
// Reports Management Hook
// =====================================

export const useReports = (): UseReportsReturn => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [generatedReports, setGeneratedReports] = useState<Array<{
    id: string;
    templateId: string;
    name: string;
    status: 'generating' | 'completed' | 'failed';
    downloadUrl?: string;
    createdAt: string;
  }>>([]);

  const [loading, setLoading] = useState({
    templates: false,
    generating: false,
    downloading: false
  });

  const setTypeLoading = useCallback((type: keyof typeof loading, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [type]: isLoading }));
  }, []);

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      setTypeLoading('templates', true);
      const data = await analyticsService.getReportTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load report templates:', error);
      throw error;
    } finally {
      setTypeLoading('templates', false);
    }
  }, [setTypeLoading]);

  // Create template
  const createTemplate = useCallback(async (
    template: Omit<ReportTemplate, 'id' | 'createdAt'>
  ): Promise<string> => {
    const templateId = await analyticsService.createReportTemplate(template);
    await loadTemplates(); // Refresh templates
    return templateId;
  }, [loadTemplates]);

  // Update template
  const updateTemplate = useCallback(async (
    templateId: string,
    updates: Partial<ReportTemplate>
  ) => {
    await analyticsService.updateReportTemplate(templateId, updates);
    await loadTemplates(); // Refresh templates
  }, [loadTemplates]);

  // Delete template
  const deleteTemplate = useCallback(async (templateId: string) => {
    await analyticsService.deleteReportTemplate(templateId);
    await loadTemplates(); // Refresh templates
  }, [loadTemplates]);

  // Generate report
  const generateReport = useCallback(async (
    request: ReportGenerationRequest
  ): Promise<string> => {
    try {
      setTypeLoading('generating', true);
      const reportId = await analyticsService.generateReport(request);
      
      // Add to generated reports list
      setGeneratedReports(prev => [{
        id: reportId,
        templateId: request.templateId,
        name: `Report - ${new Date().toLocaleDateString()}`,
        status: 'generating',
        createdAt: new Date().toISOString()
      }, ...prev]);

      return reportId;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    } finally {
      setTypeLoading('generating', false);
    }
  }, [setTypeLoading]);

  // Schedule report
  const scheduleReport = useCallback(async (
    templateId: string,
    schedule: ReportTemplate['schedule']
  ) => {
    await analyticsService.scheduleReport(templateId, schedule);
    await loadTemplates(); // Refresh templates
  }, [loadTemplates]);

  // Download report
  const downloadReport = useCallback(async (reportId: string) => {
    try {
      setTypeLoading('downloading', true);
      const blob = await analyticsService.downloadReport(reportId);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      throw error;
    } finally {
      setTypeLoading('downloading', false);
    }
  }, [setTypeLoading]);

  // Load generated reports on mount
  useEffect(() => {
    const loadGeneratedReports = async () => {
      try {
        const reports = await analyticsService.getGeneratedReports();
        setGeneratedReports(reports);
      } catch (error) {
        console.error('Failed to load generated reports:', error);
      }
    };

    loadGeneratedReports();
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    generatedReports,
    loading,
    actions: {
      loadTemplates,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      generateReport,
      scheduleReport,
      downloadReport
    }
  };
};

// =====================================
// Dashboard Configuration Hook
// =====================================

export const useDashboardConfig = () => {
  const [configs, setConfigs] = useState<DashboardConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<DashboardConfig | null>(null);
  const [loading, setLoading] = useState(false);

  // Load dashboard configurations
  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getDashboardConfigs();
      setConfigs(data);
      
      // Set default config as current if none selected
      if (!currentConfig) {
        const defaultConfig = data.find(config => config.isDefault) || data[0];
        if (defaultConfig) {
          setCurrentConfig(defaultConfig);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard configs:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentConfig]);

  // Create new dashboard config
  const createConfig = useCallback(async (
    config: Omit<DashboardConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    const configId = await analyticsService.createDashboardConfig(config);
    await loadConfigs();
    return configId;
  }, [loadConfigs]);

  // Update dashboard config
  const updateConfig = useCallback(async (
    configId: string,
    updates: Partial<DashboardConfig>
  ) => {
    await analyticsService.updateDashboardConfig(configId, updates);
    await loadConfigs();
    
    // Update current config if it's the one being updated
    if (currentConfig?.id === configId) {
      setCurrentConfig(prev => prev ? { ...prev, ...updates } : prev);
    }
  }, [loadConfigs, currentConfig]);

  // Delete dashboard config
  const deleteConfig = useCallback(async (configId: string) => {
    await analyticsService.deleteDashboardConfig(configId);
    
    // Switch to default config if current is deleted
    if (currentConfig?.id === configId) {
      setCurrentConfig(null);
    }
    
    await loadConfigs();
  }, [loadConfigs, currentConfig]);

  // Add widget to dashboard
  const addWidget = useCallback(async (
    widget: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!currentConfig) return;
    
    const widgetId = await analyticsService.addDashboardWidget(currentConfig.id, widget);
    
    // Update current config with new widget
    const newWidget: DashboardWidget = {
      ...widget,
      id: widgetId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setCurrentConfig(prev => prev ? {
      ...prev,
      widgets: [...prev.widgets, newWidget]
    } : prev);
    
    return widgetId;
  }, [currentConfig]);

  // Update widget
  const updateWidget = useCallback(async (
    widgetId: string,
    updates: Partial<DashboardWidget>
  ) => {
    if (!currentConfig) return;
    
    await analyticsService.updateDashboardWidget(currentConfig.id, widgetId, updates);
    
    // Update current config
    setCurrentConfig(prev => prev ? {
      ...prev,
      widgets: prev.widgets.map(widget => 
        widget.id === widgetId 
          ? { ...widget, ...updates, updatedAt: new Date().toISOString() }
          : widget
      )
    } : prev);
  }, [currentConfig]);

  // Remove widget
  const removeWidget = useCallback(async (widgetId: string) => {
    if (!currentConfig) return;
    
    await analyticsService.removeDashboardWidget(currentConfig.id, widgetId);
    
    // Update current config
    setCurrentConfig(prev => prev ? {
      ...prev,
      widgets: prev.widgets.filter(widget => widget.id !== widgetId)
    } : prev);
  }, [currentConfig]);

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return {
    configs,
    currentConfig,
    loading,
    actions: {
      loadConfigs,
      createConfig,
      updateConfig,
      deleteConfig,
      addWidget,
      updateWidget,
      removeWidget,
      setCurrentConfig
    }
  };
};

// =====================================
// Chart Data Hook
// =====================================

export const useChartData = (
  chartType: string,
  dataSource: string,
  filters: Record<string, any> = {},
  timeframe?: DateRange,
  refreshInterval?: number
) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [metadata, setMetadata] = useState<{
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    total?: number;
    average?: number;
    trend?: 'up' | 'down' | 'stable';
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout>();

  const loadChartData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await analyticsService.getChartData(
        chartType,
        dataSource,
        filters,
        timeframe
      );
      
      setData(response.data);
      setMetadata(response.metadata);
    } catch (err) {
      console.error('Failed to load chart data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [chartType, dataSource, filters, timeframe]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  // Setup refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      intervalRef.current = setInterval(loadChartData, refreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval, loadChartData]);

  return {
    data,
    metadata,
    loading,
    error,
    refetch: loadChartData
  };
};

// =====================================
// Real-time Analytics Hook
// =====================================

export const useRealTimeAnalytics = (
  userId: string,
  enableRealTime: boolean = true
) => {
  const [realtimeData, setRealtimeData] = useState<{
    activeUsers: number;
    currentTasks: number;
    hoursToday: number;
    productivityScore: number;
    lastActivity: string;
  }>({
    activeUsers: 0,
    currentTasks: 0,
    hoursToday: 0,
    productivityScore: 0,
    lastActivity: ''
  });

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enableRealTime || !userId) return;

    // Create WebSocket connection for real-time updates
    const connectWebSocket = () => {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/analytics/${userId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Analytics WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'analytics_update') {
            setRealtimeData(prev => ({
              ...prev,
              ...data.payload
            }));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Analytics WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('Analytics WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userId, enableRealTime]);

  return realtimeData;
};