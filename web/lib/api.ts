import { auth } from './firebase';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Generic API function for making requests to the Express server
 * Automatically includes Firebase ID token for authenticated requests
 */
export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  
  // Get the current user and their ID token
  const user = auth.currentUser;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };

  // Add Firebase ID token to headers if user is authenticated
  if (user) {
    try {
      const idToken = await user.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    } catch (error) {
      console.warn('Failed to get Firebase ID token:', error);
    }
  }

  const requestInit: RequestInit = {
    ...init,
    headers,
  };

  try {
    const response = await fetch(url, requestInit);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

/**
 * Helper function to get auth headers for the current user
 * Used by components that need to make authenticated requests
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (user) {
    try {
      const idToken = await user.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    } catch (error) {
      console.warn('Failed to get Firebase ID token:', error);
    }
  }

  return headers;
}

/**
 * Convenience API object with common HTTP methods
 */
export const apiClient = {
  async get<T = unknown>(path: string): Promise<T> {
    const response = await api(path, { method: 'GET' });
    return response.json();
  },

  async post<T = unknown>(path: string, data?: unknown): Promise<T> {
    const response = await api(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  },

  async put<T = unknown>(path: string, data?: unknown): Promise<T> {
    const response = await api(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  },

  async delete<T = unknown>(path: string): Promise<T> {
    const response = await api(path, { method: 'DELETE' });
    return response.json();
  },
};
