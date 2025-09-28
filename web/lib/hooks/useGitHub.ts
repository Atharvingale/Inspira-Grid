import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from '@/lib/toast';

export interface GitHubProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  profileUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  bio: string;
  location: string;
  website: string;
  company: string;
  connectedAt: string | null;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  topics: string[];
}

export const useGitHub = () => {
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if GitHub is connected and fetch profile
  const checkConnection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const profile = await apiClient.get<GitHubProfile>('/api/github/profile');
      
      if (profile) {
        setProfile(profile);
        setIsConnected(true);
      } else {
        setIsConnected(false);
        setProfile(null);
      }
    } catch (error: any) {
      // Always reset state on any error
      setIsConnected(false);
      setProfile(null);
      setRepositories([]);
      
      // Handle different error cases gracefully
      if (error.message?.includes('404')) {
        // Normal case - GitHub not connected, don't show as an error
        setError(null);
      } else if (error.message?.includes('401')) {
        // Expired connection
        setError('GitHub connection expired');
      } else if (error.message?.includes('503')) {
        // Service not configured
        setError('GitHub integration is not configured');
      } else {
        // Unexpected error - log it but don't crash the page
        setError(null); // Don't show error to user for GitHub issues
        console.warn('GitHub connection check failed (non-critical):', error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Get GitHub OAuth URL for connection
  const getOAuthUrl = useCallback(async (redirect?: string): Promise<string | null> => {
    try {
      const params = redirect ? `?redirect=${redirect}` : '';
      const response = await apiClient.get<{ oauthUrl: string, message: string }>(`/api/github/oauth-url${params}`);
      
      if (!response || !response.oauthUrl) {
        throw new Error('Invalid response from server');
      }
      
      return response.oauthUrl;
    } catch (error: any) {
      console.error('Failed to get GitHub OAuth URL:', error);
      
      let errorMessage = 'Failed to initiate GitHub connection';
      
      if (error.message?.includes('503')) {
        errorMessage = 'GitHub integration is not configured on the server';
      } else if (error.message?.includes('401')) {
        errorMessage = 'Please log in to connect your GitHub account';
      }
      
      toast.error(errorMessage);
      return null;
    }
  }, []);

  // Connect GitHub account
  const connect = useCallback(async (redirect?: string) => {
    const oauthUrl = await getOAuthUrl(redirect);
    if (oauthUrl) {
      // Use direct redirect instead of popup to avoid CORS issues
      window.location.href = oauthUrl;
    }
    return null;
  }, [getOAuthUrl]);

  // Disconnect GitHub account
  const disconnect = useCallback(async () => {
    try {
      setLoading(true);
      await apiClient.post('/api/github/disconnect');
      setProfile(null);
      setRepositories([]);
      setIsConnected(false);
      toast.success('GitHub account disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error);
      toast.error('Failed to disconnect GitHub account');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user repositories
  const fetchRepositories = useCallback(async (params?: {
    limit?: number;
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
  }) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.sort) queryParams.append('sort', params.sort);
      if (params?.type) queryParams.append('type', params.type);

      const url = `/api/github/repositories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('Fetching repositories from:', url);
      
      const repos = await apiClient.get<GitHubRepository[]>(url);
      console.log('Received repositories:', repos);
      
      if (repos && Array.isArray(repos)) {
        setRepositories(repos);
        return repos;
      } else {
        console.log('No repositories or invalid response');
        setRepositories([]);
        return [];
      }
    } catch (error: any) {
      let message = 'Failed to fetch repositories';
      console.error('Repository fetch error:', error);
      
      if (error.message?.includes('401')) {
        message = 'GitHub connection expired. Please reconnect your account.';
        setIsConnected(false);
        setProfile(null);
        setRepositories([]);
        toast.error(message);
      } else if (error.message?.includes('404')) {
        message = 'GitHub account not connected';
        setIsConnected(false);
        setProfile(null);
        setRepositories([]);
      } else {
        setError(message);
        toast.error(message);
      }
      
      setRepositories([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - will always use current state values

  // Search repositories
  const searchRepositories = useCallback(async (query: string, limit: number = 10): Promise<GitHubRepository[]> => {
    if (!isConnected || !query.trim()) return [];

    try {
      setLoading(true);
      // Construct query string manually as the get method doesn't take params
      const queryString = `?q=${encodeURIComponent(query.trim())}&limit=${limit}`;
      const repos = await apiClient.get<GitHubRepository[]>(`/api/github/repositories/search${queryString}`);
      
      return repos || [];
    } catch (error: any) {
      const message = 'Failed to search repositories';
      console.error('Failed to search GitHub repositories:', error);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency since we check isConnected internally

  // Get specific repository details
  const getRepository = useCallback(async (owner: string, repo: string): Promise<GitHubRepository | null> => {
    if (!isConnected) return null;

    try {
      const repository = await apiClient.get<GitHubRepository>(`/api/github/repositories/${owner}/${repo}`);
      return repository;
    } catch (error: any) {
      const message = 'Failed to fetch repository';
      console.error('Failed to fetch repository:', error);
      toast.error(message);
      return null;
    }
  }, []); // Empty dependency since we check isConnected internally

  // Don't automatically check connection on mount to avoid unnecessary 404 errors
  // Connection check will only happen when user explicitly tries to use GitHub features

  return {
    profile,
    repositories,
    isConnected,
    loading,
    error,
    connect,
    disconnect,
    fetchRepositories,
    searchRepositories,
    getRepository,
    checkConnection,
    getOAuthUrl
  };
};