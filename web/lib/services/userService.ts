import { BaseService } from './baseService';
import type {
  UserProfile,
  ProfileFormData,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
  Project,
  Application,
} from '@/types';

/**
 * User service for handling all user-related API operations
 */
class UserService extends BaseService {
  constructor() {
    super('/api');
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    return this.get<UserProfile>('/users/me');
  }

  /**
   * Get user profile by ID
   */
  async getUserById(userId: string): Promise<ApiResponse<UserProfile>> {
    return this.get<UserProfile>(`/users/${userId}`);
  }

  /**
   * Update current user profile
   */
  async updateProfile(updates: Partial<ProfileFormData>): Promise<ApiResponse<UserProfile>> {
    return this.put<UserProfile>('/users/me', updates);
  }

  /**
   * Upload user profile picture
   */
  async uploadProfilePicture(imageFile: File): Promise<ApiResponse<{ photoURL: string }>> {
    return this.uploadFile<{ photoURL: string }>('/users/me/photo', imageFile);
  }

  /**
   * Get all users with pagination and search
   */
  async getUsers(
    search?: string,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<UserProfile>>> {
    const endpoint = this.buildEndpoint('/users', { 
      search, 
      ...pagination 
    });
    return this.get<PaginatedResponse<UserProfile>>(endpoint);
  }

  /**
   * Search users by skills
   */
  async getUsersBySkills(
    skills: string[],
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<UserProfile>>> {
    const endpoint = this.buildEndpoint('/users/search/skills', { 
      skills: skills.join(','), 
      ...pagination 
    });
    return this.get<PaginatedResponse<UserProfile>>(endpoint);
  }

  /**
   * Get user's projects (owned projects)
   */
  async getUserProjects(
    userId: string,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const endpoint = this.buildEndpoint(`/users/${userId}/projects`, pagination);
    return this.get<PaginatedResponse<Project>>(endpoint);
  }

  /**
   * Get user's applications
   */
  async getUserApplications(
    userId: string,
    status?: 'pending' | 'accepted' | 'rejected',
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Application>>> {
    const endpoint = this.buildEndpoint(`/users/${userId}/applications`, { 
      status, 
      ...pagination 
    });
    return this.get<PaginatedResponse<Application>>(endpoint);
  }

  /**
   * Get current user's applications
   */
  async getMyApplications(
    status?: 'pending' | 'accepted' | 'rejected',
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Application>>> {
    const endpoint = this.buildEndpoint('/users/me/applications', { 
      status, 
      ...pagination 
    });
    return this.get<PaginatedResponse<Application>>(endpoint);
  }

  /**
   * Get user's team memberships (projects where user is a team member)
   */
  async getUserTeamMemberships(
    userId: string,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const endpoint = this.buildEndpoint(`/users/${userId}/teams`, pagination);
    return this.get<PaginatedResponse<Project>>(endpoint);
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<ApiResponse<{
    totalProjects: number;
    totalApplications: number;
    acceptedApplications: number;
    teamMemberships: number;
    projectsCompleted: number;
    skillsCount: number;
  }>> {
    return this.get(`/users/${userId}/stats`);
  }

  /**
   * Get current user's statistics
   */
  async getMyStats(): Promise<ApiResponse<{
    totalProjects: number;
    totalApplications: number;
    acceptedApplications: number;
    teamMemberships: number;
    projectsCompleted: number;
    skillsCount: number;
  }>> {
    return this.get('/users/me/stats');
  }

  /**
   * Follow/unfollow a user
   */
  async toggleFollowUser(userId: string): Promise<ApiResponse<{ isFollowing: boolean }>> {
    return this.post<{ isFollowing: boolean }>(`/users/${userId}/follow`);
  }

  /**
   * Get user's followers
   */
  async getUserFollowers(
    userId: string,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<UserProfile>>> {
    const endpoint = this.buildEndpoint(`/users/${userId}/followers`, pagination);
    return this.get<PaginatedResponse<UserProfile>>(endpoint);
  }

  /**
   * Get user's following
   */
  async getUserFollowing(
    userId: string,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<UserProfile>>> {
    const endpoint = this.buildEndpoint(`/users/${userId}/following`, pagination);
    return this.get<PaginatedResponse<UserProfile>>(endpoint);
  }

  /**
   * Get recommended users (based on skills, interests, etc.)
   */
  async getRecommendedUsers(limit: number = 10): Promise<ApiResponse<UserProfile[]>> {
    const endpoint = this.buildEndpoint('/users/recommendations', { limit });
    return this.get<UserProfile[]>(endpoint);
  }

  /**
   * Get users by university
   */
  async getUsersByUniversity(
    university: string,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<UserProfile>>> {
    const endpoint = this.buildEndpoint('/users/search/university', { 
      university, 
      ...pagination 
    });
    return this.get<PaginatedResponse<UserProfile>>(endpoint);
  }

  /**
   * Get users by graduation year
   */
  async getUsersByGraduationYear(
    year: number,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<UserProfile>>> {
    const endpoint = this.buildEndpoint('/users/search/graduation', { 
      year, 
      ...pagination 
    });
    return this.get<PaginatedResponse<UserProfile>>(endpoint);
  }

  /**
   * Update user skills
   */
  async updateSkills(skills: string[]): Promise<ApiResponse<UserProfile>> {
    return this.patch<UserProfile>('/users/me/skills', { skills });
  }

  /**
   * Update user preferences/settings
   */
  async updatePreferences(preferences: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    projectRecommendations?: boolean;
    marketingEmails?: boolean;
  }): Promise<ApiResponse<{ success: boolean }>> {
    return this.patch<{ success: boolean }>('/users/me/preferences', preferences);
  }

  /**
   * Get user preferences/settings
   */
  async getPreferences(): Promise<ApiResponse<{
    emailNotifications: boolean;
    pushNotifications: boolean;
    projectRecommendations: boolean;
    marketingEmails: boolean;
  }>> {
    return this.get('/users/me/preferences');
  }

  /**
   * Delete user account
   */
  async deleteAccount(confirmPassword: string): Promise<ApiResponse<void>> {
    return this.delete<void>('/users/me', {
      headers: {
        'X-Confirm-Password': confirmPassword
      }
    });
  }

  /**
   * Report a user
   */
  async reportUser(
    userId: string, 
    reason: string, 
    description?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>(`/users/${userId}/report`, {
      reason,
      description,
    });
  }

  /**
   * Block/unblock a user
   */
  async toggleBlockUser(userId: string): Promise<ApiResponse<{ isBlocked: boolean }>> {
    return this.post<{ isBlocked: boolean }>(`/users/${userId}/block`);
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(): Promise<ApiResponse<UserProfile[]>> {
    return this.get<UserProfile[]>('/users/me/blocked');
  }

  /**
   * Verify user profile (for admin use)
   */
  async verifyUser(userId: string): Promise<ApiResponse<UserProfile>> {
    return this.patch<UserProfile>(`/users/${userId}/verify`);
  }

  /**
   * Get user activity feed
   */
  async getUserActivity(
    userId: string,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<{
    id: string;
    type: 'project_created' | 'project_joined' | 'application_submitted' | 'profile_updated';
    description: string;
    timestamp: Date;
    data?: Record<string, unknown>;
  }>>> {
    const endpoint = this.buildEndpoint(`/users/${userId}/activity`, pagination);
    return this.get(endpoint);
  }
}

// Export singleton instance
export const userService = new UserService();