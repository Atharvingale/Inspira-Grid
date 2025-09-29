import { BaseService } from './baseService';
import type { ApiResponse } from '@/lib/types';

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
  connectedAt: Date | null;
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
  size: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

/**
 * GitHub service for handling GitHub OAuth integration and repository management
 */
class GitHubService extends BaseService {
  constructor() {
    super('/api/github');
  }

  /**
   * Get GitHub OAuth URL for connecting account
   */
  async getOAuthUrl(): Promise<ApiResponse<{ oauthUrl: string; message: string }>> {
    return this.get('/oauth-url');
  }

  /**
   * Get user's GitHub profile
   */
  async getProfile(): Promise<ApiResponse<GitHubProfile>> {
    return this.get('/profile');
  }

  /**
   * Get user's GitHub repositories
   */
  async getRepositories(options?: {
    limit?: number;
    sort?: 'updated' | 'created' | 'pushed' | 'full_name';
    type?: 'owner' | 'member' | 'public' | 'private';
  }): Promise<ApiResponse<GitHubRepository[]>> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.sort) params.append('sort', options.sort);
    if (options?.type) params.append('type', options.type);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/repositories${query}`);
  }

  /**
   * Search user's repositories
   */
  async searchRepositories(query: string, options?: {
    limit?: number;
    sort?: 'updated' | 'created' | 'stars' | 'forks';
  }): Promise<ApiResponse<GitHubRepository[]>> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.sort) params.append('sort', options.sort);

    return this.get(`/repositories/search?${params.toString()}`);
  }

  /**
   * Get specific repository details
   */
  async getRepository(owner: string, repo: string): Promise<ApiResponse<GitHubRepository>> {
    return this.get(`/repositories/${owner}/${repo}`);
  }

  /**
   * Get repository commits
   */
  async getRepositoryCommits(owner: string, repo: string, options?: {
    perPage?: number;
    page?: number;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (options?.perPage) params.append('per_page', options.perPage.toString());
    if (options?.page) params.append('page', options.page.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/repositories/${owner}/${repo}/commits${query}`);
  }

  /**
   * Get repository issues
   */
  async getRepositoryIssues(owner: string, repo: string, options?: {
    state?: 'open' | 'closed' | 'all';
    perPage?: number;
    page?: number;
  }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (options?.state) params.append('state', options.state);
    if (options?.perPage) params.append('per_page', options.perPage.toString());
    if (options?.page) params.append('page', options.page.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/repositories/${owner}/${repo}/issues${query}`);
  }

  /**
   * Link repository to project
   */
  async linkRepositoryToProject(data: {
    projectId: string;
    repositoryUrl: string;
    repositoryName: string;
    description?: string;
  }): Promise<ApiResponse<{ message: string; project: any }>> {
    return this.post('/link-repository', data);
  }

  /**
   * Unlink repository from project
   */
  async unlinkRepositoryFromProject(projectId: string): Promise<ApiResponse<{ message: string; project: any }>> {
    return this.delete(`/unlink-repository/${projectId}`);
  }

  /**
   * Disconnect GitHub account
   */
  async disconnect(): Promise<ApiResponse<{ message: string }>> {
    return this.post('/disconnect');
  }

  /**
   * Redirect to GitHub OAuth
   */
  async redirectToGitHubOAuth(): Promise<void> {
    try {
      const response = await this.getOAuthUrl();
      if (response.success && response.data?.oauthUrl) {
        // Redirect to GitHub OAuth URL
        window.location.href = response.data.oauthUrl;
      } else {
        throw new Error('Failed to get GitHub OAuth URL');
      }
    } catch (error) {
      console.error('GitHub OAuth redirect error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const githubService = new GitHubService();