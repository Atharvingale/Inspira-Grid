/**
 * Centralized API Services
 * 
 * This module exports all API services for the Inspira-Grid application.
 * All services extend the BaseService class and provide type-safe,
 * consistent API interactions.
 * 
 * Usage:
 * ```typescript
 * import { projectService, userService, authService } from '@/lib/services';
 * 
 * // Get projects
 * const projects = await projectService.getProjects();
 * 
 * // Update user profile
 * const user = await userService.updateProfile({ displayName: 'New Name' });
 * 
 * // Login
 * const authResult = await authService.login({ email, password });
 * ```
 */

// Export base service for extension
export { BaseService } from './baseService';

// Export individual services
export { projectService } from './projectService';
export { userService } from './userService';
export { applicationService } from './applicationService';
export { messageService } from './messageService';
export { notificationService } from './notificationService';
export { authService } from './authService';

// Import services for internal use in apiServices object
import { projectService } from './projectService';
import { userService } from './userService';
import { applicationService } from './applicationService';
import { messageService } from './messageService';
import { notificationService } from './notificationService';
import { authService } from './authService';

// Export all services as a single object for convenience
export const apiServices = {
  projects: projectService,
  users: userService,
  applications: applicationService,
  messages: messageService,
  notifications: notificationService,
  auth: authService,
} as const;

// Export type definitions for better IDE support
export type ApiServices = typeof apiServices;

/**
 * Service initialization function
 * Call this when the app initializes to set up any global service configuration
 */
export const initializeServices = (config?: {
  baseUrl?: string;
  timeout?: number;
  authTokenGetter?: () => string | null;
}) => {
  // This function can be used to set up global service configuration
  // For example, setting auth token headers, base URLs, etc.
  
  if (config?.authTokenGetter) {
    // Set up global auth token getter for all services
    // This would require modifying the BaseService class to support this
  }
  
  console.log('API Services initialized');
};

// Export utility functions for common operations
export const serviceUtils = {
  /**
   * Handle common API errors across all services
   */
  handleApiError: (error: unknown): string => {
    if (error && typeof error === 'object' && 'message' in error) {
      return (error as { message: string }).message;
    }
    return 'An unexpected error occurred';
  },

  /**
   * Check if response indicates success
   */
  isSuccessResponse: <T>(response: { success?: boolean; data?: T }): response is { success: true; data: T } => {
    return response.success === true && response.data !== undefined;
  },

  /**
   * Extract data from API response safely
   */
  extractData: <T>(response: { success?: boolean; data?: T }): T | null => {
    return serviceUtils.isSuccessResponse(response) ? response.data : null;
  },

  /**
   * Build pagination parameters for consistent pagination across services
   */
  buildPagination: (page: number = 1, limit: number = 10, sort?: string, order?: 'asc' | 'desc') => ({
    page,
    limit,
    ...(sort && { sort }),
    ...(order && { order }),
  }),
} as const;