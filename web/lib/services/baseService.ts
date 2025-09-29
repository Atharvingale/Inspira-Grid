import { api, apiClient } from '@/lib/api';
import { User } from 'firebase/auth';

/**
 * HTTP Methods supported by the API
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * API Response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * API Request configuration
 */
export interface APIRequestConfig {
  method?: HTTPMethod;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, any>;
  responseType?: 'json' | 'blob' | 'text';
}

/**
 * Base service class with common API functionality
 * All service classes should extend this to maintain consistency
 */
class BaseService {
  protected baseUrl: string;

  constructor(basePath?: string) {
    this.baseUrl = basePath || process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  }

  /**
   * Make an authenticated API request
   */
  protected async request<T>(
    endpoint: string,
    config: APIRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const method = config.method || 'GET';
    const fullEndpoint = this.buildEndpoint(endpoint, config.params);
    
    try {
      const requestConfig: RequestInit = {
        method,
        headers: config.headers,
      };

      // Add body for non-GET requests
      if (method !== 'GET' && config.body) {
        requestConfig.body = JSON.stringify(config.body);
      }

      const response = await api(fullEndpoint, requestConfig);

      // Handle different response types
      let data: T;
      if (config.responseType === 'blob') {
        data = await response.blob() as T;
      } else if (config.responseType === 'text') {
        data = await response.text() as T;
      } else {
        data = await response.json();
      }

      return {
        success: true,
        data,
      } as ApiResponse<T>;
    } catch (error) {
      console.error(`API Error - ${method} ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * GET request helper
   */
  protected async get<T>(endpoint: string, config?: Omit<APIRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request helper
   */
  protected async post<T>(
    endpoint: string,
    body?: unknown,
    config?: Omit<APIRequestConfig, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  /**
   * PUT request helper
   */
  protected async put<T>(
    endpoint: string,
    body?: unknown,
    config?: Omit<APIRequestConfig, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  /**
   * PATCH request helper
   */
  protected async patch<T>(
    endpoint: string,
    body?: unknown,
    config?: Omit<APIRequestConfig, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  /**
   * DELETE request helper
   */
  protected async delete<T>(endpoint: string, config?: Omit<APIRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  /**
   * Handle file uploads
   */
  protected async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    try {
      const response = await api(endpoint, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header for FormData - browser will set it with boundary
        headers: {} // Override default Content-Type
      });

      const data = await response.json();
      return {
        success: true,
        data
      } as ApiResponse<T>;
    } catch (error) {
      console.error(`File upload error - POST ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Handle multiple file uploads
   */
  protected async uploadFiles<T>(
    endpoint: string,
    files: File[],
    additionalData?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    try {
      const response = await api(endpoint, {
        method: 'POST',
        body: formData,
        headers: {} // Override default Content-Type
      });

      const data = await response.json();
      return {
        success: true,
        data
      } as ApiResponse<T>;
    } catch (error) {
      console.error(`Multiple file upload error - POST ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Build query string from parameters
   */
  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, String(item)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    return searchParams.toString();
  }

  /**
   * Build endpoint with query parameters
   */
  protected buildEndpoint(path: string, params?: Record<string, any>): string {
    const fullPath = `${this.baseUrl}${path}`;
    
    if (!params) return fullPath;
    
    const queryString = this.buildQueryString(params);
    return queryString ? `${fullPath}?${queryString}` : fullPath;
  }

  /**
   * Get configuration from environment variables
   */
  protected getConfig() {
    return {
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
      wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000',
      maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'),
      allowedFileTypes: process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES?.split(',') || ['image/*'],
      enableRealTime: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === 'true',
      collaborationTimeout: parseInt(process.env.NEXT_PUBLIC_COLLABORATION_TIMEOUT || '30000'),
      cursorFadeTimeout: parseInt(process.env.NEXT_PUBLIC_CURSOR_FADE_TIMEOUT || '3000'),
      enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
    };
  }
}

// Export the class for extension
export { BaseService };

// Export singleton instance
export const baseService = new BaseService();
