/**
 * Mobile-Optimized UI Components
 * 
 * Collection of mobile-first responsive components with touch gestures,
 * swipe actions, bottom sheets, and mobile navigation patterns.
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// =====================================
// Mobile Navigation Components
// =====================================

interface MobileTabBarProps {
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    active?: boolean;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className
}) => {
  return (
    <motion.nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white/5 backdrop-blur-md border-t border-dark-border/50",
        "flex items-center justify-around px-2 py-1 z-50",
        "md:hidden", // Hide on desktop
        className
      )}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex flex-col items-center justify-center px-2 py-2 rounded-lg",
            "min-w-0 flex-1 relative transition-colors duration-200",
            tab.active || activeTab === tab.id
              ? "text-brand-primary"
              : "text-text-secondary active:text-brand-primary"
          )}
          whileTap={{ scale: 0.95 }}
        >
          <div className="relative mb-1">
            {tab.icon}
            {tab.badge && tab.badge > 0 && (
              <motion.span
                className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                {tab.badge > 99 ? '99+' : tab.badge}
              </motion.span>
            )}
          </div>
          <span className="text-xs font-medium truncate max-w-full">
            {tab.label}
          </span>
          {(tab.active || activeTab === tab.id) && (
            <motion.div
              className="absolute top-0 left-1/2 w-1 h-1 bg-brand-primary rounded-full"
              layoutId="activeTab"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </motion.nav>
  );
};

// =====================================
// Bottom Sheet Component
// =====================================

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[]; // Percentage values (e.g., [25, 50, 90])
  initialSnap?: number;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [90],
  initialSnap = 90,
  className
}) => {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const constraintsRef = useRef(null);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    // Calculate which snap point to go to based on drag
    const threshold = 100;
    const velocityThreshold = 500;
    
    if (offset.y > threshold || velocity.y > velocityThreshold) {
      // If dragged down significantly, close or go to lower snap point
      const currentIndex = snapPoints.indexOf(currentSnap);
      if (currentIndex === 0 || snapPoints.length === 1) {
        onClose();
      } else {
        setCurrentSnap(snapPoints[currentIndex - 1]);
      }
    } else if (offset.y < -threshold || velocity.y < -velocityThreshold) {
      // If dragged up significantly, go to higher snap point
      const currentIndex = snapPoints.indexOf(currentSnap);
      if (currentIndex < snapPoints.length - 1) {
        setCurrentSnap(snapPoints[currentIndex + 1]);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Bottom Sheet */}
          <motion.div
            ref={constraintsRef}
            className={cn(
              "fixed bottom-0 left-0 right-0 bg-dark-card/80 rounded-t-2xl z-50",
              "shadow-2xl border-t border-dark-border/50",
              className
            )}
            initial={{ y: '100%' }}
            animate={{ y: `${100 - currentSnap}%` }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={constraintsRef}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            style={{ height: '100vh' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-dark-surface/50 rounded-full" />
            </div>
            
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 pb-4 border-b border-dark-border/50">
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-dark-surface/50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// =====================================
// Swipeable Card Component
// =====================================

interface SwipeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: 'red' | 'green' | 'blue' | 'orange';
  action: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipe?: (direction: 'left' | 'right', action: SwipeAction) => void;
  className?: string;
  disabled?: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipe,
  className,
  disabled = false
}) => {
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const [currentAction, setCurrentAction] = useState<SwipeAction | null>(null);

  const getActionColor = (color: SwipeAction['color']) => {
    const colors = {
      red: 'bg-red-500',
      green: 'bg-green-500',
      blue: 'bg-brand-primary',
      orange: 'bg-orange-500'
    };
    return colors[color];
  };

  const handleDrag = (event: any, info: PanInfo) => {
    const { offset } = info;
    const threshold = 60;
    
    if (Math.abs(offset.x) < threshold) {
      setDragDirection(null);
      setCurrentAction(null);
      return;
    }

    if (offset.x > 0 && leftActions.length > 0) {
      setDragDirection('left');
      const actionIndex = Math.min(
        Math.floor(offset.x / 80),
        leftActions.length - 1
      );
      setCurrentAction(leftActions[actionIndex]);
    } else if (offset.x < 0 && rightActions.length > 0) {
      setDragDirection('right');
      const actionIndex = Math.min(
        Math.floor(Math.abs(offset.x) / 80),
        rightActions.length - 1
      );
      setCurrentAction(rightActions[actionIndex]);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const { offset } = info;
    const threshold = 100;
    
    if (Math.abs(offset.x) > threshold && currentAction) {
      currentAction.action();
      onSwipe?.(dragDirection!, currentAction);
    }
    
    setDragDirection(null);
    setCurrentAction(null);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Left Actions */}
      {dragDirection === 'left' && leftActions.length > 0 && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex"
          initial={{ width: 0 }}
          animate={{ width: 'auto' }}
          exit={{ width: 0 }}
        >
          {leftActions.map((action, index) => (
            <motion.div
              key={action.id}
              className={cn(
                "flex items-center justify-center px-4",
                getActionColor(action.color),
                currentAction?.id === action.id && "opacity-100",
                currentAction?.id !== action.id && "opacity-60"
              )}
              style={{ minWidth: '80px' }}
            >
              <div className="text-white text-center">
                <div className="text-xl mb-1">{action.icon}</div>
                <div className="text-xs font-medium">{action.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Right Actions */}
      {dragDirection === 'right' && rightActions.length > 0 && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex"
          initial={{ width: 0 }}
          animate={{ width: 'auto' }}
          exit={{ width: 0 }}
        >
          {rightActions.map((action, index) => (
            <motion.div
              key={action.id}
              className={cn(
                "flex items-center justify-center px-4",
                getActionColor(action.color),
                currentAction?.id === action.id && "opacity-100",
                currentAction?.id !== action.id && "opacity-60"
              )}
              style={{ minWidth: '80px' }}
            >
              <div className="text-white text-center">
                <div className="text-xl mb-1">{action.icon}</div>
                <div className="text-xs font-medium">{action.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Card Content */}
      <motion.div
        className={cn(
          "bg-dark-card/80 relative z-10",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        drag={!disabled ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.02 }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// =====================================
// Pull to Refresh Component
// =====================================

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshThreshold?: number;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  refreshThreshold = 100,
  className
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [canRefresh, setCanRefresh] = useState(false);

  const handleDrag = (event: any, info: PanInfo) => {
    const { offset } = info;
    
    if (offset.y < 0) {
      setPullDistance(0);
      setCanRefresh(false);
      return;
    }

    const distance = Math.min(offset.y, refreshThreshold * 1.5);
    setPullDistance(distance);
    setCanRefresh(distance >= refreshThreshold);
  };

  const handleDragEnd = async (event: any, info: PanInfo) => {
    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setCanRefresh(false);
  };

  const refreshProgress = Math.min(pullDistance / refreshThreshold, 1);

  return (
    <motion.div
      className={cn("relative", className)}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      {/* Pull to Refresh Indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 bg-dark-surface/30"
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: 1, 
              height: 'auto',
              y: Math.min(pullDistance, refreshThreshold)
            }}
            exit={{ opacity: 0, height: 0 }}
            style={{ zIndex: -1 }}
          >
            <div className="flex items-center space-x-2 text-text-secondary">
              <motion.div
                animate={{ 
                  rotate: isRefreshing ? 360 : refreshProgress * 180 
                }}
                transition={{ 
                  duration: isRefreshing ? 1 : 0,
                  repeat: isRefreshing ? Infinity : 0,
                  ease: "linear"
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </motion.div>
              <span className="text-sm font-medium">
                {isRefreshing 
                  ? 'Refreshing...' 
                  : canRefresh 
                  ? 'Release to refresh'
                  : 'Pull to refresh'
                }
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        animate={{ 
          y: isRefreshing ? refreshThreshold : Math.max(0, pullDistance * 0.5)
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// =====================================
// Mobile Search Bar
// =====================================

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  showCancelButton?: boolean;
  onCancel?: () => void;
  className?: string;
}

export const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder = "Search...",
  showCancelButton = true,
  onCancel,
  className
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleCancel = () => {
    onChange('');
    inputRef.current?.blur();
    onCancel?.();
  };

  return (
    <motion.div 
      className={cn(
        "flex items-center space-x-2 p-2",
        className
      )}
      layout
    >
      <motion.div 
        className="relative flex-1"
        layout
      >
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg className="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "w-full pl-10 pr-10 py-2 bg-dark-surface/50 rounded-lg",
            "border-0 focus:ring-2 focus:ring-brand-primary focus:bg-dark-card/80",
            "text-text-primary placeholder-gray-500",
            "transition-all duration-200"
          )}
        />
        
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {isFocused && showCancelButton && (
          <motion.button
            onClick={handleCancel}
            className="text-brand-primary font-medium px-2 py-1"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
          >
            Cancel
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// =====================================
// Long Press Component
// =====================================

interface LongPressProps {
  onLongPress: () => void;
  onPress?: () => void;
  longPressDuration?: number;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const LongPress: React.FC<LongPressProps> = ({
  onLongPress,
  onPress,
  longPressDuration = 500,
  children,
  className,
  disabled = false
}) => {
  const [isLongPress, setIsLongPress] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleStart = () => {
    if (disabled) return;
    
    startTimeRef.current = Date.now();
    setIsLongPress(false);
    
    timeoutRef.current = setTimeout(() => {
      setIsLongPress(true);
      onLongPress();
      
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, longPressDuration);
  };

  const handleEnd = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const endTime = Date.now();
    const pressDuration = endTime - startTimeRef.current;

    if (pressDuration < longPressDuration && !isLongPress && onPress) {
      onPress();
    }

    setIsLongPress(false);
  };

  const handleCancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLongPress(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <motion.div
      className={cn(
        "relative",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerCancel={handleCancel}
      onPointerLeave={handleCancel}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      animate={{
        scale: isLongPress ? 1.05 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {children}
      
      {/* Long press indicator */}
      {isLongPress && (
        <motion.div
          className="absolute inset-0 bg-brand-primary/20 rounded-lg pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.div>
  );
};