'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer, User } from 'lucide-react';
import { LiveCursor, User as UserType } from '@/lib/types/collaboration';
import { cn } from '@/lib/utils';

interface LiveCursorsProps {
  cursors: LiveCursor[];
  currentUserId: string;
  containerRef: React.RefObject<HTMLElement>;
  showLabels?: boolean;
  fadeTimeout?: number;
  className?: string;
}

// Individual cursor component
function CursorPointer({ 
  cursor, 
  showLabel, 
  isVisible 
}: { 
  cursor: LiveCursor; 
  showLabel: boolean;
  isVisible: boolean;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={cursor.userId}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: cursor.isActive ? 1 : 0.7,
            scale: 1,
            x: cursor.position.x,
            y: cursor.position.y
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 500, 
            damping: 30,
            opacity: { duration: 0.2 }
          }}
          className="absolute pointer-events-none z-50"
          style={{
            left: 0,
            top: 0,
          }}
        >
          {/* Cursor SVG */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="relative"
            style={{
              transform: 'translate(-2px, -2px)',
              filter: `drop-shadow(0 2px 4px ${cursor.color}40)`
            }}
          >
            {/* Cursor shape */}
            <path
              d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>

          {/* User label */}
          {showLabel && cursor.label && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-6 top-2"
            >
              <div 
                className="px-2 py-1 rounded text-xs font-medium text-white shadow-lg whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-dark-card/80 rounded-full opacity-90" />
                  {cursor.label || cursor.user.name}
                </div>
                
                {/* Triangle pointer */}
                <div
                  className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-0 h-0"
                  style={{
                    borderTop: '3px solid transparent',
                    borderBottom: '3px solid transparent',
                    borderRight: `4px solid ${cursor.color}`
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* Activity pulse for typing/editing */}
          {cursor.elementId && (
            <motion.div
              className="absolute -inset-2 rounded-full opacity-30"
              style={{ backgroundColor: cursor.color }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// User avatar component for presence indicators
function UserAvatar({ 
  user, 
  size = 'sm', 
  online = true,
  color,
  onClick
}: {
  user: UserType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  online?: boolean;
  color?: string;
  onClick?: () => void;
}) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 border-2 border-white dark:border-gray-800 shadow-lg',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:shadow-xl'
      )}
      style={{ 
        backgroundColor: color || '#3b82f6',
        color: 'white'
      }}
      onClick={onClick}
      title={`${user.name} (${user.status})`}
    >
      {user.avatar ? (
        <img 
          src={user.avatar} 
          alt={user.name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        user.name.charAt(0).toUpperCase()
      )}
      
      {/* Online status indicator */}
      <div className={cn(
        'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white dark:border-gray-800',
        size === 'xs' ? 'w-2 h-2' : size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
        online ? 'bg-green-500' : 'bg-dark-surface/50'
      )} />
    </motion.button>
  );
}

export default function LiveCursors({
  cursors,
  currentUserId,
  containerRef,
  showLabels = true,
  fadeTimeout = 3000,
  className
}: LiveCursorsProps) {
  const [visibleCursors, setVisibleCursors] = useState<Set<string>>(new Set());
  const fadeTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);

  // Update container bounds
  const updateBounds = useCallback(() => {
    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect();
      setContainerBounds(bounds);
    }
  }, [containerRef]);

  // Handle cursor visibility with fade timeout
  useEffect(() => {
    const newVisibleCursors = new Set<string>();

    cursors.forEach(cursor => {
      // Skip current user's cursor
      if (cursor.userId === currentUserId) return;
      
      // Skip inactive cursors older than timestamp threshold
      const timeSinceUpdate = Date.now() - new Date(cursor.timestamp).getTime();
      if (timeSinceUpdate > 30000) return; // 30 seconds
      
      newVisibleCursors.add(cursor.userId);

      // Clear existing timeout
      const existingTimeout = fadeTimeoutRefs.current.get(cursor.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new fade timeout
      if (fadeTimeout > 0) {
        const timeoutId = setTimeout(() => {
          setVisibleCursors(prev => {
            const next = new Set(prev);
            next.delete(cursor.userId);
            return next;
          });
          fadeTimeoutRefs.current.delete(cursor.userId);
        }, fadeTimeout);
        
        fadeTimeoutRefs.current.set(cursor.userId, timeoutId);
      }
    });

    setVisibleCursors(newVisibleCursors);
  }, [cursors, currentUserId, fadeTimeout]);

  // Update bounds on mount and window resize
  useEffect(() => {
    updateBounds();
    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds);
    
    return () => {
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds);
    };
  }, [updateBounds]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      fadeTimeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      fadeTimeoutRefs.current.clear();
    };
  }, []);

  // Filter cursors that should be visible
  const activeCursors = cursors.filter(cursor => 
    cursor.userId !== currentUserId && 
    visibleCursors.has(cursor.userId) &&
    containerBounds &&
    cursor.position.x >= 0 && 
    cursor.position.y >= 0 &&
    cursor.position.x <= containerBounds.width &&
    cursor.position.y <= containerBounds.height
  );

  if (!containerBounds) {
    return null;
  }

  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      {/* Live Cursors */}
      {activeCursors.map(cursor => (
        <CursorPointer
          key={cursor.userId}
          cursor={cursor}
          showLabel={showLabels}
          isVisible={visibleCursors.has(cursor.userId)}
        />
      ))}
    </div>
  );
}

// Presence indicator component showing all active users
export function PresenceIndicator({
  cursors,
  currentUserId,
  maxVisible = 5,
  size = 'sm',
  showTooltip = true,
  className,
  onUserClick
}: {
  cursors: LiveCursor[];
  currentUserId: string;
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
  onUserClick?: (user: UserType) => void;
}) {
  const activeUsers = cursors.filter(cursor => cursor.userId !== currentUserId);
  const visibleUsers = activeUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, activeUsers.length - maxVisible);

  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Visible user avatars */}
      {visibleUsers.map((cursor, index) => (
        <motion.div
          key={cursor.userId}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          style={{ zIndex: visibleUsers.length - index }}
          className={index > 0 ? '-ml-2' : ''}
        >
          <UserAvatar
            user={cursor.user}
            size={size}
            online={cursor.isActive}
            color={cursor.color}
            onClick={() => onUserClick?.(cursor.user)}
          />
        </motion.div>
      ))}

      {/* Hidden users count */}
      {hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'flex items-center justify-center rounded-full bg-dark-surface/300 text-white font-medium border-2 border-white dark:border-gray-800 shadow-lg -ml-2',
            size === 'xs' ? 'w-6 h-6 text-xs' : 
            size === 'sm' ? 'w-8 h-8 text-xs' :
            size === 'md' ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base'
          )}
          title={`${hiddenCount} more user${hiddenCount > 1 ? 's' : ''} active`}
        >
          +{hiddenCount}
        </motion.div>
      )}

      {/* Activity indicator */}
      {activeUsers.some(cursor => cursor.elementId) && (
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="ml-2 w-2 h-2 bg-green-500 rounded-full"
          title="Someone is actively editing"
        />
      )}
    </div>
  );
}

// Hook for managing cursor position
export function useCursorTracking(
  containerRef: React.RefObject<HTMLElement>,
  onCursorMove?: (position: { x: number; y: number }, elementId?: string) => void,
  throttle = 50
) {
  const throttleRef = useRef<NodeJS.Timeout>();
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setCurrentPosition({ x, y });

      // Throttle cursor updates
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }

      throttleRef.current = setTimeout(() => {
        const elementId = (e.target as HTMLElement)?.id;
        onCursorMove?.({ x, y }, elementId);
      }, throttle);
    };

    container.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [containerRef, onCursorMove, throttle]);

  return currentPosition;
}