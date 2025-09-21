'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartDataPoint, VisualizationType } from '@/lib/types/analytics';

interface AnalyticsChartProps {
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

export default function AnalyticsChart({
  type,
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  color = '#3b82f6',
  height = 300,
  loading = false,
  onDataPointClick,
  options = {},
  className
}: AnalyticsChartProps) {
  if (loading) {
    return (
      <div className={cn('p-4 border border-dark-border rounded-lg bg-dark-card/80 animate-pulse', className)}>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-dark-surface/50 rounded mx-auto mb-2"></div>
          <div className="h-4 bg-dark-surface/50 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-4 border border-dark-border rounded-lg bg-dark-card/80', className)} style={{ height }}>
      <div className="text-center text-text-secondary py-8">
        <div className="mb-2">
          <BarChart3 className="w-12 h-12 mx-auto opacity-50" />
        </div>
        <p>Chart ({type})</p>
        {title && <p className="text-sm mt-1 text-text-primary">{title}</p>}
        <p className="text-xs mt-1">{data.length} data points</p>
        <p className="text-xs mt-2 text-text-tertiary">
          Recharts not installed - Chart placeholder
        </p>
      </div>
    </div>
  );
}

// Specialized chart components
export function RevenueChart({ 
  data, 
  timeframe = 'daily',
  ...props 
}: {
  data: ChartDataPoint[];
  timeframe?: 'daily' | 'weekly' | 'monthly';
} & Omit<AnalyticsChartProps, 'type' | 'title'>) {
  return (
    <AnalyticsChart
      type="area_chart"
      title={`Revenue Trend (${timeframe})`}
      xAxisLabel="Time Period"
      yAxisLabel="Revenue"
      color="#10b981"
      data={data}
      {...props}
    />
  );
}

export function ProjectProgressChart({ 
  data, 
  ...props 
}: {
  data: ChartDataPoint[];
} & Omit<AnalyticsChartProps, 'type' | 'title'>) {
  return (
    <AnalyticsChart
      type="bar_chart"
      title="Project Progress"
      xAxisLabel="Projects"
      yAxisLabel="Completion %"
      color="#3b82f6"
      data={data}
      {...props}
    />
  );
}

export function TeamPerformanceChart({ 
  data, 
  ...props 
}: {
  data: ChartDataPoint[];
} & Omit<AnalyticsChartProps, 'type' | 'title'>) {
  return (
    <AnalyticsChart
      type="scatter_plot"
      title="Team Performance"
      xAxisLabel="Hours Logged"
      yAxisLabel="Tasks Completed"
      color="#8b5cf6"
      data={data}
      {...props}
    />
  );
}