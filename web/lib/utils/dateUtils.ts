import { Timestamp } from 'firebase/firestore';

/**
 * Safely formats Firebase timestamps or other date objects
 */
export function formatFirebaseTimestamp(
  timestamp: any,
  fallback: string = 'Unknown date'
): string {
  try {
    // Handle Firebase Timestamp objects
    if (timestamp && typeof timestamp === 'object') {
      // Firebase Timestamp with seconds and nanoseconds
      if (timestamp._seconds !== undefined || timestamp.seconds !== undefined) {
        const seconds = timestamp._seconds || timestamp.seconds;
        const date = new Date(seconds * 1000);
        return formatRelativeTime(date);
      }
      
      // Firebase Timestamp instance
      if (timestamp instanceof Timestamp) {
        return formatRelativeTime(timestamp.toDate());
      }
      
      // Regular Date object
      if (timestamp instanceof Date) {
        return formatRelativeTime(timestamp);
      }
      
      // ISO string date
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return formatRelativeTime(date);
        }
      }
    }
    
    // Handle string timestamps
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return formatRelativeTime(date);
      }
    }
    
    // Handle numeric timestamps
    if (typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return formatRelativeTime(date);
    }
    
    return fallback;
  } catch (error) {
    console.warn('Error formatting timestamp:', error, timestamp);
    return fallback;
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "yesterday")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  } else {
    return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
  }
}

/**
 * Format a date as a readable string
 */
export function formatDate(
  timestamp: any,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }
): string {
  try {
    // Handle Firebase Timestamp objects
    if (timestamp && typeof timestamp === 'object') {
      if (timestamp._seconds !== undefined || timestamp.seconds !== undefined) {
        const seconds = timestamp._seconds || timestamp.seconds;
        const date = new Date(seconds * 1000);
        return date.toLocaleDateString('en-US', options);
      }
      
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toLocaleDateString('en-US', options);
      }
      
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('en-US', options);
      }
    }
    
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', options);
      }
    }
    
    return 'Unknown date';
  } catch (error) {
    console.warn('Error formatting date:', error, timestamp);
    return 'Unknown date';
  }
}

/**
 * Check if a timestamp is valid
 */
export function isValidTimestamp(timestamp: any): boolean {
  try {
    if (timestamp && typeof timestamp === 'object') {
      if (timestamp._seconds !== undefined || timestamp.seconds !== undefined) {
        const seconds = timestamp._seconds || timestamp.seconds;
        return !isNaN(seconds) && seconds > 0;
      }
      
      if (timestamp instanceof Timestamp || timestamp instanceof Date) {
        return true;
      }
    }
    
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return !isNaN(date.getTime());
    }
    
    return false;
  } catch {
    return false;
  }
}