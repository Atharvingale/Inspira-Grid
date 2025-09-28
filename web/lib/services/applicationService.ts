import { BaseService } from './baseService';
import type {
  Application,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
} from '@/lib/types';

/**
 * Application service for handling all application-related API operations
 */
class ApplicationService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Get application by ID
   */
  async getApplicationById(applicationId: string): Promise<ApiResponse<Application>> {
    return this.get<Application>(`/applications/${applicationId}`);
  }

  /**
   * Submit a project application
   */
  async submitApplication(projectId: string, applicationData: {
    message: string;
    skills: string[];
    portfolioUrl?: string;
    githubUsername?: string;
  }): Promise<ApiResponse<Application>> {
    return this.post<Application>('/applications', {
      projectId,
      ...applicationData,
    });
  }

  /**
   * Update application (before it's reviewed)
   */
  async updateApplication(
    applicationId: string,
    updates: {
      message?: string;
      skills?: string[];
      portfolioUrl?: string;
      githubUsername?: string;
    }
  ): Promise<ApiResponse<Application>> {
    return this.put<Application>(`/applications/${applicationId}`, updates);
  }

  /**
   * Withdraw application
   */
  async withdrawApplication(applicationId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/applications/${applicationId}`);
  }

  /**
   * Get applications for a specific project (for project owners)
   */
  async getProjectApplications(
    projectId: string,
    status?: 'pending' | 'accepted' | 'rejected',
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Application>>> {
    const endpoint = this.buildEndpoint(`/projects/${projectId}/applications`, {
      status,
      ...pagination,
    });
    return this.get<PaginatedResponse<Application>>(endpoint);
  }

  /**
   * Get user's applications (applications submitted by the user)
   */
  async getUserApplications(
    status?: 'pending' | 'accepted' | 'rejected',
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Application>>> {
    const endpoint = this.buildEndpoint('/applications/me', {
      status,
      ...pagination,
    });
    return this.get<PaginatedResponse<Application>>(endpoint);
  }

  /**
   * Review application (accept or reject)
   */
  async reviewApplication(
    applicationId: string,
    decision: 'accept' | 'reject',
    reviewMessage?: string
  ): Promise<ApiResponse<Application>> {
    return this.patch<Application>(`/applications/${applicationId}/review`, {
      status: decision === 'accept' ? 'accepted' : 'rejected',
      reviewMessage,
    });
  }

  /**
   * Accept application
   */
  async acceptApplication(
    applicationId: string,
    role?: string,
    welcomeMessage?: string
  ): Promise<ApiResponse<Application>> {
    return this.patch<Application>(`/applications/${applicationId}/accept`, {
      role,
      welcomeMessage,
    });
  }

  /**
   * Reject application
   */
  async rejectApplication(
    applicationId: string,
    rejectionMessage?: string
  ): Promise<ApiResponse<Application>> {
    return this.patch<Application>(`/applications/${applicationId}/reject`, {
      rejectionMessage,
    });
  }

  /**
   * Get application statistics for a project
   */
  async getProjectApplicationStats(projectId: string): Promise<ApiResponse<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    applicationRate: number; // applications per day
    acceptanceRate: number; // percentage of accepted applications
  }>> {
    return this.get(`/projects/${projectId}/applications/stats`);
  }

  /**
   * Get user's application statistics
   */
  async getUserApplicationStats(): Promise<ApiResponse<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    successRate: number; // percentage of accepted applications
    averageResponseTime: number; // in hours
  }>> {
    return this.get('/applications/me/stats');
  }

  /**
   * Get applications requiring review (for project owners)
   */
  async getApplicationsForReview(
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<ApiResponse<PaginatedResponse<Application>>> {
    const endpoint = this.buildEndpoint('/applications/review-queue', pagination as Record<string, unknown>);
    return this.get<PaginatedResponse<Application>>(endpoint);
  }

  /**
   * Bulk review applications
   */
  async bulkReviewApplications(reviews: Array<{
    applicationId: string;
    decision: 'accept' | 'reject';
    message?: string;
  }>): Promise<ApiResponse<{
    processed: number;
    successful: number;
    failed: { applicationId: string; error: string }[];
  }>> {
    return this.post('/applications/bulk-review', { reviews });
  }

  /**
   * Get application timeline/history
   */
  async getApplicationHistory(applicationId: string): Promise<ApiResponse<Array<{
    id: string;
    action: 'submitted' | 'updated' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn';
    description: string;
    timestamp: Date;
    actor?: {
      id: string;
      name: string;
      role: 'applicant' | 'project_owner' | 'system';
    };
  }>>> {
    return this.get(`/applications/${applicationId}/history`);
  }

  /**
   * Check if user has already applied to a project
   */
  async checkApplicationExists(projectId: string): Promise<ApiResponse<{
    exists: boolean;
    application?: Application;
  }>> {
    return this.get(`/projects/${projectId}/my-application`);
  }

  /**
   * Get application template/requirements for a project
   */
  async getApplicationRequirements(projectId: string): Promise<ApiResponse<{
    requiredFields: string[];
    optionalFields: string[];
    instructions?: string;
    skillsRequired: string[];
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  }>> {
    return this.get(`/projects/${projectId}/application-requirements`);
  }

  /**
   * Save application as draft
   */
  async saveApplicationDraft(projectId: string, draftData: {
    message?: string;
    skills?: string[];
    portfolioUrl?: string;
    githubUsername?: string;
  }): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(`/applications/drafts`, {
      projectId,
      ...draftData,
    });
  }

  /**
   * Get saved application drafts
   */
  async getApplicationDrafts(): Promise<ApiResponse<Array<{
    id: string;
    projectId: string;
    projectTitle: string;
    draftData: {
      message?: string;
      skills?: string[];
      portfolioUrl?: string;
      githubUsername?: string;
    };
    lastModified: Date;
  }>>> {
    return this.get('/applications/drafts');
  }

  /**
   * Delete application draft
   */
  async deleteApplicationDraft(draftId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/applications/drafts/${draftId}`);
  }

  /**
   * Get recommended projects to apply to (based on user skills)
   */
  async getRecommendedProjects(limit: number = 10): Promise<ApiResponse<Array<{
    project: {
      id: string;
      title: string;
      description: string;
      skillsRequired: string[];
      difficulty: string;
    };
    matchScore: number; // 0-100 compatibility score
    matchedSkills: string[];
    missingSkills: string[];
  }>>> {
    const endpoint = this.buildEndpoint('/applications/recommendations', { limit });
    return this.get(endpoint);
  }

  /**
   * Mark application as read (for notifications)
   */
  async markApplicationAsRead(applicationId: string): Promise<ApiResponse<void>> {
    return this.patch<void>(`/applications/${applicationId}/read`);
  }

  /**
   * Get applications that need urgent attention (deadline approaching, etc.)
   */
  async getUrgentApplications(): Promise<ApiResponse<Application[]>> {
    return this.get<Application[]>('/applications/urgent');
  }
}

// Export singleton instance
export const applicationService = new ApplicationService();