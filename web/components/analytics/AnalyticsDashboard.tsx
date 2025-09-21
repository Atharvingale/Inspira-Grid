'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  Activity,
  RefreshCw,
  Download,
  Settings,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAnalytics, useDashboardConfig } from '@/lib/hooks/useAnalytics';
import { 
  DashboardConfig, 
  DashboardWidget, 
  DateRange,
  MetricComparison 
} from '@/lib/types/analytics';
import MetricCard from './MetricCard';
import AnalyticsChart from './AnalyticsChart';
// import ActivityFeed from './ActivityFeed'; // Component not available
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';

interface AnalyticsDashboardProps {
  className?: string;
  defaultTimeframe?: DateRange;
  editMode?: boolean;
  onEditModeChange?: (editMode: boolean) => void;
}

export default function AnalyticsDashboard({
  className = '',
  defaultTimeframe = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString()
  },
  editMode = false,
  onEditModeChange
}: AnalyticsDashboardProps) {
  // State
  const [timeframe, setTimeframe] = useState<DateRange>(defaultTimeframe);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Hooks
  const {
    dashboardMetrics,
    projectAnalytics,
    teamAnalytics,
    financialAnalytics,
    loading,
    actions
  } = useAnalytics(true);

  const {
    currentConfig,
    actions: configActions
  } = useDashboardConfig();

  // Load initial dashboard data
  useEffect(() => {
    actions.loadDashboardMetrics(timeframe);
    actions.loadFinancialAnalytics(timeframe);
  }, [timeframe, actions]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        actions.loadDashboardMetrics(timeframe),
        actions.loadFinancialAnalytics(timeframe)
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle widget addition
  const handleAddWidget = async (widgetType: DashboardWidget['type']) => {
    if (!currentConfig) return;

    const newWidget: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'> = {
      type: widgetType,
      title: getWidgetTitle(widgetType),
      position: { x: 0, y: 0 },
      size: { width: 4, height: 3 },
      dataSource: getWidgetDataSource(widgetType),
      filters: {},
      chartType: widgetType === 'chart' ? 'line_chart' : undefined
    };

    await configActions.addWidget(newWidget);
  };

  // Handle widget removal
  const handleRemoveWidget = async (widgetId: string) => {
    await configActions.removeWidget(widgetId);
  };

  // Handle data export
  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      await actions.exportData('project', format, { timeframe });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Render loading state
  if (loading.dashboard && !dashboardMetrics) {
    return <DashboardSkeleton />;
  }

  return (
    <div className={`analytics-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-text-secondary dark:text-text-tertiary mt-1">
            Project insights and team performance metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Selector */}
          <select
            value={`${timeframe.startDate}_${timeframe.endDate}`}
            onChange={(e) => {
              const [start, end] = e.target.value.split('_');
              setTimeframe({ startDate: start, endDate: end });
            }}
            className="px-3 py-2 border border-dark-border dark:border-gray-600 rounded-lg bg-dark-card/80 dark:bg-dark-surface/50 text-sm"
          >
            <option value={`${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}_${new Date().toISOString()}`}>
              Last 7 days
            </option>
            <option value={`${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}_${new Date().toISOString()}`}>
              Last 30 days
            </option>
            <option value={`${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()}_${new Date().toISOString()}`}>
              Last 90 days
            </option>
          </select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          {/* Edit Mode Toggle */}
          <Button
            variant={editMode ? "primary" : "outline"}
            size="sm"
            onClick={() => onEditModeChange?.(!editMode)}
            className="flex items-center gap-2"
          >
            {editMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {editMode ? 'View' : 'Edit'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      {dashboardMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Projects"
            value={dashboardMetrics.totalProjects}
            comparison={{
              current: dashboardMetrics.totalProjects,
              previous: dashboardMetrics.totalProjects - (dashboardMetrics.monthOverMonth.projectsCreated || 0),
              change: dashboardMetrics.monthOverMonth.projectsCreated || 0,
              changePercent: dashboardMetrics.monthOverMonth.projectsCreated || 0,
              trend: (dashboardMetrics.monthOverMonth.projectsCreated || 0) > 0 ? 'up' : 'stable'
            }}
            color="blue"
            onClick={() => setSelectedMetric('projects')}
          />

          <MetricCard
            title="Team Utilization"
            value={`${Math.round(dashboardMetrics.teamUtilization)}%`}
            comparison={{
              current: dashboardMetrics.teamUtilization,
              previous: dashboardMetrics.teamUtilization - (dashboardMetrics.monthOverMonth.teamProductivity || 0),
              change: dashboardMetrics.monthOverMonth.teamProductivity || 0,
              changePercent: dashboardMetrics.monthOverMonth.teamProductivity || 0,
              trend: (dashboardMetrics.monthOverMonth.teamProductivity || 0) > 0 ? 'up' : 'stable'
            }}
            color="green"
            onClick={() => setSelectedMetric('utilization')}
          />

          <MetricCard
            title="Completion Rate"
            value={`${Math.round(dashboardMetrics.projectCompletionRate)}%`}
            comparison={{
              current: dashboardMetrics.projectCompletionRate,
              previous: dashboardMetrics.projectCompletionRate - (dashboardMetrics.monthOverMonth.completionRate || 0),
              change: dashboardMetrics.monthOverMonth.completionRate || 0,
              changePercent: dashboardMetrics.monthOverMonth.completionRate || 0,
              trend: (dashboardMetrics.monthOverMonth.completionRate || 0) > 0 ? 'up' : 'stable'
            }}
            color="purple"
            onClick={() => setSelectedMetric('completion')}
          />

          <MetricCard
            title="Total Hours"
            value={dashboardMetrics.totalHours.toLocaleString()}
            comparison={{
              current: dashboardMetrics.totalHours,
              previous: dashboardMetrics.totalHours - (dashboardMetrics.monthOverMonth.hoursLogged || 0),
              change: dashboardMetrics.monthOverMonth.hoursLogged || 0,
              changePercent: dashboardMetrics.monthOverMonth.hoursLogged || 0,
              trend: (dashboardMetrics.monthOverMonth.hoursLogged || 0) > 0 ? 'up' : 'stable'
            }}
            color="yellow"
            onClick={() => setSelectedMetric('hours')}
          />
        </div>
      )}

      {/* Dashboard Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-primary" />
                  Project Performance
                </div>
                <Badge variant="secondary" className="text-xs">
                  Live
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                type="line_chart"
                data={dashboardMetrics?.recentActivities?.map(activity => ({
                  x: new Date(activity.timestamp).getDate().toString(),
                  y: activity.value || 0,
                  label: activity.description
                })) || []}
                height={300}
                xAxisLabel="Days"
                yAxisLabel="Activity Count"
                color="#3b82f6"
              />
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {dashboardMetrics?.recentActivities?.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-dark-surface/30 dark:hover:bg-dark-surface/50/50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      activity.type === 'project_created' ? 'bg-brand-primary text-brand-primary dark:bg-brand-primary dark:text-brand-primary' :
                      activity.type === 'milestone_completed' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' :
                      activity.type === 'team_joined' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300' :
                      'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {activity.type === 'project_created' ? '🚀' :
                       activity.type === 'milestone_completed' ? '✅' :
                       activity.type === 'team_joined' ? '👥' : '⏱️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary dark:text-white truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-text-tertiary dark:text-text-tertiary mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Financial Overview */}
      {financialAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <DollarSign className="w-5 h-5" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text-primary dark:text-white">
                ${financialAnalytics.totalRevenue.toLocaleString()}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">
                  +{Math.round(financialAnalytics.profitMargin)}% margin
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-brand-primary">
                <Clock className="w-5 h-5" />
                Billable Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text-primary dark:text-white">
                {financialAnalytics.billableHours.toLocaleString()}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-text-secondary dark:text-text-tertiary">
                  ${Math.round(financialAnalytics.averageHourlyRate)}/hour average
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <Users className="w-5 h-5" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text-primary dark:text-white">
                {Math.round(financialAnalytics.utilizationRate)}%
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-text-secondary dark:text-text-tertiary">
                  Utilization rate
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Mode: Add Widget Options */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-dark-card/80 dark:bg-dark-surface/50 rounded-lg shadow-lg border border-dark-border/50 dark:border-gray-700 p-4"
          >
            <h3 className="font-medium text-text-primary dark:text-white mb-3">Add Widget</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddWidget('metric')}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Metric
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddWidget('chart')}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Chart
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddWidget('table')}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Table
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddWidget('activity_feed')}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Activity
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper functions
function getWidgetTitle(type: DashboardWidget['type']): string {
  switch (type) {
    case 'metric': return 'Key Metric';
    case 'chart': return 'Performance Chart';
    case 'table': return 'Data Table';
    case 'progress': return 'Progress Tracker';
    case 'activity_feed': return 'Activity Feed';
    default: return 'Widget';
  }
}

function getWidgetDataSource(type: DashboardWidget['type']): string {
  switch (type) {
    case 'metric': return 'dashboard_metrics';
    case 'chart': return 'project_analytics';
    case 'table': return 'team_analytics';
    case 'progress': return 'project_progress';
    case 'activity_feed': return 'activity_feed';
    default: return 'default';
  }
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="analytics-dashboard">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-4 w-3/4 bg-dark-surface/50 rounded animate-pulse" />
          <div className="h-4 w-1/2 mt-2 bg-dark-surface/50 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-full bg-dark-surface/50 rounded animate-pulse" />
          <div className="h-4 w-3/4 mt-2 bg-dark-surface/50 rounded animate-pulse" />
          <div className="h-4 w-1/2 mt-2 bg-dark-surface/50 rounded animate-pulse" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-dark-surface/50 rounded animate-pulse" />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-96 bg-dark-surface/50 rounded animate-pulse" />
          <div className="h-64 w-full bg-dark-surface/50 rounded animate-pulse" />
      </div>
    </div>
  );
}