'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricComparison } from '@/lib/types/analytics';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
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

const colorClasses = {
  blue: {
    bg: 'bg-brand-primary dark:bg-brand-primary',
    text: 'text-brand-primary dark:text-brand-primary',
    accent: 'text-brand-primary dark:text-brand-primary',
    border: 'border-brand-primary dark:border-brand-primary',
    gradient: 'from-brand-primary to-blue-600'
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-900 dark:text-green-100',
    accent: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    gradient: 'from-green-500 to-green-600'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-900 dark:text-red-100',
    accent: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    gradient: 'from-red-500 to-red-600'
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    text: 'text-yellow-900 dark:text-yellow-100',
    accent: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
    gradient: 'from-yellow-500 to-yellow-600'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    text: 'text-purple-900 dark:text-purple-100',
    accent: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    gradient: 'from-purple-500 to-purple-600'
  }
};

export default function MetricCard({
  title,
  value,
  unit,
  comparison,
  trend,
  color = 'blue',
  loading = false,
  onClick,
  className
}: MetricCardProps) {
  const colors = colorClasses[color];
  
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    
    return val.toString();
  };

  const getTrendIcon = (trendType: 'up' | 'down' | 'stable') => {
    switch (trendType) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = (trendType: 'up' | 'down' | 'stable') => {
    switch (trendType) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-text-tertiary dark:text-text-tertiary';
    }
  };

  if (loading) {
    return (
      <Card className={cn('relative overflow-hidden', colors.bg, colors.border, className)}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-dark-surface/50 dark:bg-dark-surface/50 rounded w-3/4 mb-3"></div>
            <div className="h-8 bg-dark-surface/50 dark:bg-dark-surface/50 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-dark-surface/50 dark:bg-dark-surface/50 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: onClick ? 1.02 : 1, y: -2 }}
      whileTap={{ scale: onClick ? 0.98 : 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={cn(
          'relative overflow-hidden border-l-4 cursor-pointer transition-all duration-200 hover:shadow-lg',
          colors.bg,
          colors.border,
          onClick && 'hover:shadow-xl',
          className
        )}
        onClick={onClick}
      >
        {/* Gradient accent */}
        <div className={cn('absolute top-0 left-0 w-1 h-full bg-gradient-to-b', colors.gradient)} />
        
        <CardContent className="p-6">
          {/* Title */}
          <div className="flex items-center justify-between mb-3">
            <h3 className={cn('text-sm font-medium', colors.text)}>
              {title}
            </h3>
            
            {/* Trend indicator */}
            {(comparison || trend) && (
              <div className={cn(
                'flex items-center text-xs font-medium',
                getTrendColor(trend || comparison?.trend || 'stable')
              )}>
                {getTrendIcon(trend || comparison?.trend || 'stable')}
              </div>
            )}
          </div>

          {/* Value */}
          <div className="mb-2">
            <div className={cn('text-2xl font-bold', colors.text)}>
              {formatValue(value)}
              {unit && (
                <span className={cn('text-sm font-normal ml-1', colors.accent)}>
                  {unit}
                </span>
              )}
            </div>
          </div>

          {/* Comparison */}
          {comparison && (
            <div className="flex items-center justify-between text-xs">
              <div className={cn(
                'flex items-center gap-1 font-medium',
                getTrendColor(comparison.trend)
              )}>
                {getTrendIcon(comparison.trend)}
                <span>
                  {comparison.change >= 0 ? '+' : ''}
                  {Math.abs(comparison.changePercent).toFixed(1)}%
                </span>
              </div>
              
              <div className={cn('text-xs', colors.accent)}>
                vs last period
              </div>
            </div>
          )}

          {/* Progress bar for percentage values */}
          {typeof value === 'string' && value.includes('%') && (
            <div className="mt-3">
              <div className="w-full bg-dark-surface/50 dark:bg-dark-surface/50 rounded-full h-2">
                <motion.div
                  className={cn('h-2 rounded-full bg-gradient-to-r', colors.gradient)}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(parseInt(value), 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </CardContent>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/5 dark:to-black/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      </Card>
    </motion.div>
  );
}

// Specialized metric cards
export function RevenueMetricCard({ 
  revenue, 
  comparison, 
  currency = '$',
  ...props 
}: {
  revenue: number;
  comparison?: MetricComparison;
  currency?: string;
} & Omit<MetricCardProps, 'title' | 'value' | 'color'>) {
  return (
    <MetricCard
      title="Revenue"
      value={`${currency}${revenue.toLocaleString()}`}
      comparison={comparison}
      color="green"
      {...props}
    />
  );
}

export function ProjectsMetricCard({ 
  count, 
  comparison,
  ...props 
}: {
  count: number;
  comparison?: MetricComparison;
} & Omit<MetricCardProps, 'title' | 'value' | 'color'>) {
  return (
    <MetricCard
      title="Active Projects"
      value={count}
      comparison={comparison}
      color="blue"
      {...props}
    />
  );
}

export function TeamUtilizationCard({ 
  utilization, 
  comparison,
  ...props 
}: {
  utilization: number;
  comparison?: MetricComparison;
} & Omit<MetricCardProps, 'title' | 'value' | 'color'>) {
  return (
    <MetricCard
      title="Team Utilization"
      value={`${Math.round(utilization)}%`}
      comparison={comparison}
      color="purple"
      {...props}
    />
  );
}

export function CompletionRateCard({ 
  rate, 
  comparison,
  ...props 
}: {
  rate: number;
  comparison?: MetricComparison;
} & Omit<MetricCardProps, 'title' | 'value' | 'color'>) {
  return (
    <MetricCard
      title="Completion Rate"
      value={`${Math.round(rate)}%`}
      comparison={comparison}
      color="green"
      {...props}
    />
  );
}