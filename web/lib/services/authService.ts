import { BaseService } from './baseService';
import type {
  LoginFormData,
  RegisterFormData,
  UserProfile,
  ApiResponse,
} from '@/lib/types';

/**
 * Authentication service for handling all auth-related API operations
 */
class AuthService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginFormData): Promise<ApiResponse<{
    user: UserProfile;
    token: string;
    refreshToken: string;
  }>> {
    return this.post('/login', credentials);
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterFormData): Promise<ApiResponse<{
    user: UserProfile;
    token: string;
    refreshToken: string;
  }>> {
    return this.post('/register', userData);
  }

  /**
   * Logout current user
   */
  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/logout');
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<{
    token: string;
    refreshToken: string;
  }>> {
    return this.post('/refresh', { refreshToken });
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(email: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/forgot-password', { email });
  }

  /**
   * Reset password with reset token
   */
  async resetPassword(data: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/reset-password', data);
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/change-password', data);
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/verify-email', { token });
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/resend-verification');
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    return this.get<UserProfile>('/me');
  }

  /**
   * Update current user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    return this.put<UserProfile>('/me', updates);
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(): Promise<ApiResponse<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  }>> {
    return this.post('/2fa/enable');
  }

  /**
   * Verify and activate two-factor authentication
   */
  async verifyTwoFactor(code: string): Promise<ApiResponse<{
    success: boolean;
    backupCodes: string[];
  }>> {
    return this.post('/2fa/verify', { code });
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(password: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/2fa/disable', { password });
  }

  /**
   * Login with two-factor authentication
   */
  async loginWithTwoFactor(data: {
    email: string;
    password: string;
    code: string;
  }): Promise<ApiResponse<{
    user: UserProfile;
    token: string;
    refreshToken: string;
  }>> {
    return this.post('/login-2fa', data);
  }

  /**
   * Generate new backup codes for 2FA
   */
  async generateBackupCodes(): Promise<ApiResponse<{ backupCodes: string[] }>> {
    return this.post<{ backupCodes: string[] }>('/2fa/backup-codes');
  }

  /**
   * Login with backup code
   */
  async loginWithBackupCode(data: {
    email: string;
    password: string;
    backupCode: string;
  }): Promise<ApiResponse<{
    user: UserProfile;
    token: string;
    refreshToken: string;
  }>> {
    return this.post('/login-backup', data);
  }

  /**
   * Get login sessions
   */
  async getSessions(): Promise<ApiResponse<Array<{
    id: string;
    deviceName: string;
    ipAddress: string;
    userAgent: string;
    lastActivity: Date;
    isCurrent: boolean;
  }>>> {
    return this.get('/sessions');
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(`/sessions/${sessionId}`);
  }

  /**
   * Revoke all other sessions (keep current)
   */
  async revokeAllOtherSessions(): Promise<ApiResponse<{ revokedCount: number }>> {
    return this.delete<{ revokedCount: number }>('/sessions/others');
  }

  /**
   * OAuth login (Google, GitHub, etc.)
   */
  async oauthLogin(provider: 'google' | 'github' | 'linkedin', code: string): Promise<ApiResponse<{
    user: UserProfile;
    token: string;
    refreshToken: string;
    isNewUser: boolean;
  }>> {
    return this.post(`/oauth/${provider}`, { code });
  }

  /**
   * Link OAuth account to existing account
   */
  async linkOAuthAccount(provider: 'google' | 'github' | 'linkedin', code: string): Promise<ApiResponse<{
    success: boolean;
    linkedProvider: string;
  }>> {
    return this.post(`/oauth/link/${provider}`, { code });
  }

  /**
   * Unlink OAuth account
   */
  async unlinkOAuthAccount(provider: 'google' | 'github' | 'linkedin'): Promise<ApiResponse<{
    success: boolean;
  }>> {
    return this.delete<{ success: boolean }>(`/oauth/unlink/${provider}`);
  }

  /**
   * Get linked OAuth accounts
   */
  async getLinkedAccounts(): Promise<ApiResponse<Array<{
    provider: string;
    providerId: string;
    email: string;
    linkedAt: Date;
  }>>> {
    return this.get('/oauth/linked');
  }

  /**
   * Check if user exists by email
   */
  async checkUserExists(email: string): Promise<ApiResponse<{ exists: boolean }>> {
    return this.post<{ exists: boolean }>('/check-user', { email });
  }

  /**
   * Validate password strength
   */
  async validatePassword(password: string): Promise<ApiResponse<{
    isValid: boolean;
    score: number;
    feedback: string[];
  }>> {
    return this.post('/validate-password', { password });
  }

  /**
   * Request account deletion
   */
  async requestAccountDeletion(password: string): Promise<ApiResponse<{
    success: boolean;
    scheduledDeletion: Date;
  }>> {
    return this.post('/request-deletion', { password });
  }

  /**
   * Cancel account deletion request
   */
  async cancelAccountDeletion(): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>('/cancel-deletion');
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(): Promise<ApiResponse<{ downloadUrl: string }>> {
    return this.get('/export-data');
  }

  /**
   * Get account security events
   */
  async getSecurityEvents(): Promise<ApiResponse<Array<{
    id: string;
    type: 'login' | 'password_change' | '2fa_enabled' | '2fa_disabled' | 'oauth_linked' | 'oauth_unlinked';
    description: string;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    success: boolean;
  }>>> {
    return this.get('/security-events');
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  }): Promise<ApiResponse<{ success: boolean }>> {
    return this.patch<{ success: boolean }>('/notification-preferences', preferences);
  }

  /**
   * Get password policy
   */
  async getPasswordPolicy(): Promise<ApiResponse<{
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    forbiddenPasswords: string[];
  }>> {
    return this.get('/password-policy');
  }
}

// Export singleton instance
export const authService = new AuthService();