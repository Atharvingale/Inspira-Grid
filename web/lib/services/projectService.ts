import { BaseService } from './baseService';
import type {
  Project,
  ProjectFormData,
  ProjectFilters,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
  Application,
  TeamMember,
} from '@/lib/types';

/**
 * Project service for handling all project-related API operations
 */
class ProjectService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Get all projects with filtering and pagination
   */
  async getProjects(
    filters: ProjectFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const endpoint = this.buildEndpoint('/projects', { ...filters, ...pagination });
    return this.get<PaginatedResponse<Project>>(endpoint);
  }

  /**
   * Get a single project by ID
   */
  async getProjectById(projectId: string): Promise<ApiResponse<Project>> {
    return this.get<Project>(`/projects/${projectId}`);
  }

  /**
   * Create a new project
   */
  async createProject(projectData: ProjectFormData): Promise<ApiResponse<Project>> {
    return this.post<Project>('/projects', projectData);
  }

  /**
   * Update an existing project
   */
  async updateProject(projectId: string, updates: Partial<ProjectFormData>): Promise<ApiResponse<Project>> {
    return this.put<Project>(`/projects/${projectId}`, updates);
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/projects/${projectId}`);
  }

  /**
   * Get projects by owner
   */
  async getProjectsByOwner(
    ownerId: string,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const endpoint = this.buildEndpoint(`/projects/owner/${ownerId}`, pagination);
    return this.get<PaginatedResponse<Project>>(endpoint);
  }

  /**
   * Get projects where user is a team member
   */
  async getProjectsByMember(
    memberId: string,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const endpoint = this.buildEndpoint(`/projects/member/${memberId}`, pagination);
    return this.get<PaginatedResponse<Project>>(endpoint);
  }

  /**
   * Search projects by title or description
   */
  async searchProjects(
    query: string,
    filters: Omit<ProjectFilters, 'search'> = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const endpoint = this.buildEndpoint('/projects/search', { 
      search: query, 
      ...filters, 
      ...pagination 
    });
    return this.get<PaginatedResponse<Project>>(endpoint);
  }

  /**
   * Get featured projects
   */
  async getFeaturedProjects(limit: number = 6): Promise<ApiResponse<Project[]>> {
    const endpoint = this.buildEndpoint('/projects/featured', { limit });
    return this.get<Project[]>(endpoint);
  }

  /**
   * Get project statistics
   */
  async getProjectStats(projectId: string): Promise<ApiResponse<{
    totalApplications: number;
    acceptedApplications: number;
    pendingApplications: number;
    teamMembers: number;
    completionPercentage: number;
  }>> {
    return this.get(`/projects/${projectId}/stats`);
  }

  /**
   * Upload project image
   */
  async uploadProjectImage(projectId: string, imageFile: File): Promise<ApiResponse<{ imageUrl: string }>> {
    return this.uploadFile<{ imageUrl: string }>(`/projects/${projectId}/image`, imageFile);
  }

  /**
   * Add team member to project
   */
  async addTeamMember(projectId: string, memberData: {
    userId: string;
    role: string;
  }): Promise<ApiResponse<TeamMember>> {
    return this.post<TeamMember>(`/projects/${projectId}/team`, memberData);
  }

  /**
   * Remove team member from project
   */
  async removeTeamMember(projectId: string, memberId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/projects/${projectId}/team/${memberId}`);
  }

  /**
   * Update team member role
   */
  async updateTeamMemberRole(
    projectId: string, 
    memberId: string, 
    newRole: string
  ): Promise<ApiResponse<TeamMember>> {
    return this.patch<TeamMember>(`/projects/${projectId}/team/${memberId}`, { role: newRole });
  }

  /**
   * Get project team members
   */
  async getProjectTeam(projectId: string): Promise<ApiResponse<TeamMember[]>> {
    return this.get<TeamMember[]>(`/projects/${projectId}/team`);
  }

  /**
   * Submit project application
   */
  async applyToProject(projectId: string, applicationData: {
    message: string;
    skills: string[];
    portfolioUrl?: string;
    githubUsername?: string;
  }): Promise<ApiResponse<Application>> {
    return this.post<Application>(`/projects/${projectId}/apply`, applicationData);
  }

  /**
   * Get project applications (for project owners)
   */
  async getProjectApplications(
    projectId: string,
    status?: 'pending' | 'accepted' | 'rejected'
  ): Promise<ApiResponse<Application[]>> {
    const endpoint = this.buildEndpoint(`/projects/${projectId}/applications`, 
      status ? { status } : {}
    );
    return this.get<Application[]>(endpoint);
  }

  /**
   * Respond to project application
   */
  async respondToApplication(
    applicationId: string, 
    response: 'accept' | 'reject',
    message?: string
  ): Promise<ApiResponse<Application>> {
    return this.patch<Application>(`/applications/${applicationId}`, { 
      status: response === 'accept' ? 'accepted' : 'rejected',
      responseMessage: message
    });
  }

  /**
   * Get projects by category
   */
  async getProjectsByCategory(
    category: string,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const endpoint = this.buildEndpoint(`/projects/category/${category}`, pagination);
    return this.get<PaginatedResponse<Project>>(endpoint);
  }

  /**
   * Get trending projects
   */
  async getTrendingProjects(
    timeframe: 'day' | 'week' | 'month' = 'week',
    limit: number = 10
  ): Promise<ApiResponse<Project[]>> {
    const endpoint = this.buildEndpoint('/projects/trending', { timeframe, limit });
    return this.get<Project[]>(endpoint);
  }

  /**
   * Toggle project bookmark/favorite
   */
  async toggleProjectFavorite(projectId: string): Promise<ApiResponse<{ isFavorite: boolean }>> {
    return this.post<{ isFavorite: boolean }>(`/projects/${projectId}/favorite`);
  }

  /**
   * Get user's favorite projects
   */
  async getFavoriteProjects(
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const endpoint = this.buildEndpoint('/projects/favorites', pagination);
    return this.get<PaginatedResponse<Project>>(endpoint);
  }

  /**
   * Clone/fork a project
   */
  async cloneProject(
    projectId: string,
    newProjectData: { title: string; description: string }
  ): Promise<ApiResponse<Project>> {
    return this.post<Project>(`/projects/${projectId}/clone`, newProjectData);
  }

  /**
   * Archive/unarchive a project
   */
  async toggleProjectArchive(projectId: string): Promise<ApiResponse<Project>> {
    return this.patch<Project>(`/projects/${projectId}/archive`);
  }

  /**
   * Update project status
   */
  async updateProjectStatus(
    projectId: string, 
    status: Project['status']
  ): Promise<ApiResponse<Project>> {
    return this.patch<Project>(`/projects/${projectId}/status`, { status });
  }
}

// Export singleton instance
export const projectService = new ProjectService();