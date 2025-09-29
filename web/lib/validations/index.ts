/**
 * Zod Validation Schemas
 * 
 * This file contains all validation schemas used throughout the application
 * for form validation, API input validation, and data sanitization.
 */

import { z } from 'zod';

// =====================================
// Base Validation Schemas
// =====================================

// Email validation with proper regex
const emailSchema = z
  .string()
  .email({ message: 'Please enter a valid email address' })
  .min(1, { message: 'Email is required' })
  .max(100, { message: 'Email must be less than 100 characters' });

// Password validation with strength requirements
const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .max(100, { message: 'Password must be less than 100 characters' })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
  });

// Display name validation
const displayNameSchema = z
  .string()
  .min(2, { message: 'Display name must be at least 2 characters long' })
  .max(50, { message: 'Display name must be less than 50 characters' })
  .regex(/^[a-zA-Z0-9\s._-]+$/, {
    message: 'Display name can only contain letters, numbers, spaces, dots, underscores, and hyphens'
  });

// URL validation
const urlSchema = z
  .string()
  .url({ message: 'Please enter a valid URL' })
  .or(z.literal(''));

// Skills array validation
const skillsSchema = z
  .array(z.string().min(1).max(30))
  .max(20, { message: 'You can add up to 20 skills' })
  .optional();

// =====================================
// Authentication Schemas
// =====================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Password is required' }),
  rememberMe: z.boolean().optional()
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
  displayName: displayNameSchema,
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions'
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Reset token is required' }),
  password: passwordSchema,
  confirmPassword: z.string().min(1, { message: 'Please confirm your password' })
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required' }),
  newPassword: passwordSchema,
  confirmNewPassword: z.string().min(1, { message: 'Please confirm your new password' })
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'New passwords do not match',
  path: ['confirmNewPassword']
});

// =====================================
// User Profile Schemas
// =====================================

export const userProfileSchema = z.object({
  displayName: displayNameSchema,
  bio: z.string()
    .max(500, { message: 'Bio must be less than 500 characters' })
    .optional(),
  skills: skillsSchema,
  portfolioUrl: urlSchema.optional(),
  githubUsername: z.string()
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$/, {
      message: 'Please enter a valid GitHub username'
    })
    .min(1)
    .max(39)
    .optional()
    .or(z.literal('')),
  linkedinUrl: urlSchema.optional(),
  websiteUrl: urlSchema.optional()
});

export const updateProfileSchema = userProfileSchema.partial();

// =====================================
// Project Schemas
// =====================================

export const projectSchema = z.object({
  title: z.string()
    .min(3, { message: 'Project title must be at least 3 characters long' })
    .max(100, { message: 'Project title must be less than 100 characters' }),
  
  description: z.string()
    .min(10, { message: 'Project description must be at least 10 characters long' })
    .max(2000, { message: 'Project description must be less than 2000 characters' }),
  
  category: z.string()
    .min(1, { message: 'Please select a project category' }),
  
  requiredSkills: z.array(z.string().min(1).max(30))
    .min(1, { message: 'Please add at least one required skill' })
    .max(15, { message: 'You can add up to 15 required skills' }),
  
  teamSize: z.number()
    .int({ message: 'Team size must be a whole number' })
    .min(1, { message: 'Team size must be at least 1' })
    .max(50, { message: 'Team size cannot exceed 50 members' }),
  
  deadline: z.string()
    .datetime({ message: 'Please select a valid deadline' })
    .optional()
    .or(z.literal('')),
  
  budget: z.object({
    min: z.number()
      .min(0, { message: 'Minimum budget cannot be negative' })
      .optional(),
    max: z.number()
      .min(0, { message: 'Maximum budget cannot be negative' })
      .optional(),
    currency: z.string().min(3).max(3).default('USD')
  }).optional().refine((budget) => {
    if (budget && budget.min !== undefined && budget.max !== undefined) {
      return budget.min <= budget.max;
    }
    return true;
  }, {
    message: 'Maximum budget must be greater than or equal to minimum budget',
    path: ['max']
  }),
  
  tags: z.array(z.string().min(1).max(20))
    .max(10, { message: 'You can add up to 10 tags' })
    .optional(),
  
  visibility: z.enum(['public', 'private'], {
    message: 'Please select project visibility'
  }),
  
  applicationDeadline: z.string()
    .datetime({ message: 'Please select a valid application deadline' })
    .optional()
    .or(z.literal(''))
});

export const updateProjectSchema = projectSchema.partial().extend({
  id: z.string().min(1, { message: 'Project ID is required' })
});

// =====================================
// Application Schemas
// =====================================

export const applicationSchema = z.object({
  projectId: z.string().min(1, { message: 'Project ID is required' }),
  
  message: z.string()
    .min(10, { message: 'Application message must be at least 10 characters long' })
    .max(1000, { message: 'Application message must be less than 1000 characters' }),
  
  skills: z.array(z.string().min(1).max(30))
    .min(1, { message: 'Please list at least one relevant skill' })
    .max(15, { message: 'You can list up to 15 skills' })
    .optional(),
  
  portfolioUrl: urlSchema.optional(),
  
  githubUsername: z.string()
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$/, {
      message: 'Please enter a valid GitHub username'
    })
    .min(1)
    .max(39)
    .optional()
    .or(z.literal(''))
});

export const applicationReviewSchema = z.object({
  applicationId: z.string().min(1, { message: 'Application ID is required' }),
  
  decision: z.enum(['accept', 'reject'], {
    message: 'Please select a decision'
  }),
  
  reviewNote: z.string()
    .max(500, { message: 'Review note must be less than 500 characters' })
    .optional(),
    
  role: z.string()
    .min(1, { message: 'Please specify the role' })
    .max(50, { message: 'Role must be less than 50 characters' })
    .optional()
});

// =====================================
// Message Schemas
// =====================================

export const messageSchema = z.object({
  recipientId: z.string().min(1, { message: 'Recipient is required' }),
  
  content: z.string()
    .min(1, { message: 'Message content is required' })
    .max(2000, { message: 'Message content must be less than 2000 characters' }),
  
  projectId: z.string().optional(),
  teamId: z.string().optional()
});

// =====================================
// Team Schemas
// =====================================

export const teamSchema = z.object({
  name: z.string()
    .min(2, { message: 'Team name must be at least 2 characters long' })
    .max(50, { message: 'Team name must be less than 50 characters' }),
  
  description: z.string()
    .max(500, { message: 'Team description must be less than 500 characters' })
    .optional(),
  
  projectId: z.string().min(1, { message: 'Project ID is required' })
});

export const teamInvitationSchema = z.object({
  teamId: z.string().min(1, { message: 'Team ID is required' }),
  invitedEmail: emailSchema,
  role: z.enum(['admin', 'member'], {
    message: 'Please select a valid role'
  })
});

// =====================================
// Search and Filter Schemas
// =====================================

export const searchParamsSchema = z.object({
  query: z.string().max(200, { message: 'Search query must be less than 200 characters' }).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['created', 'updated', 'title', 'deadline']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const projectFiltersSchema = z.object({
  category: z.string().max(50).optional(),
  skills: z.array(z.string().max(30)).max(10).optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
  search: z.string().max(200).optional(),
  ownerId: z.string().optional(),
  minTeamSize: z.number().int().min(1).optional(),
  maxTeamSize: z.number().int().min(1).optional()
});

// =====================================
// File Upload Schemas
// =====================================

export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size must be less than 5MB'
    })
    .refine((file) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      return allowedTypes.includes(file.type);
    }, {
      message: 'Only JPEG, PNG, GIF, and WebP images are allowed'
    }),
  
  description: z.string()
    .max(200, { message: 'File description must be less than 200 characters' })
    .optional()
});

export const documentUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: 'File size must be less than 10MB'
    })
    .refine((file) => {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      return allowedTypes.includes(file.type);
    }, {
      message: 'Only PDF, DOC, DOCX, and TXT files are allowed'
    })
});

// =====================================
// Notification Schemas
// =====================================

export const notificationPreferencesSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  sms: z.boolean().default(false),
  categories: z.object({
    applications: z.boolean().default(true),
    messages: z.boolean().default(true),
    teamUpdates: z.boolean().default(true),
    projectUpdates: z.boolean().default(true),
    marketing: z.boolean().default(false)
  }).optional()
});

// =====================================
// API Response Validation
// =====================================

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional()
});

// =====================================
// Type Exports
// =====================================

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type UserProfileFormData = z.infer<typeof userProfileSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type ProjectFormData = z.infer<typeof projectSchema>;
export type UpdateProjectFormData = z.infer<typeof updateProjectSchema>;
export type ApplicationFormData = z.infer<typeof applicationSchema>;
export type ApplicationReviewFormData = z.infer<typeof applicationReviewSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type TeamFormData = z.infer<typeof teamSchema>;
export type TeamInvitationFormData = z.infer<typeof teamInvitationSchema>;
export type SearchParamsData = z.infer<typeof searchParamsSchema>;
export type ProjectFiltersData = z.infer<typeof projectFiltersSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>;
export type DocumentUploadData = z.infer<typeof documentUploadSchema>;
export type NotificationPreferencesData = z.infer<typeof notificationPreferencesSchema>;

// =====================================
// Validation Helpers
// =====================================

/**
 * Validate data against a Zod schema and return formatted errors
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Validation failed' } };
  }
}

/**
 * Safely parse data with a schema, returning null on failure
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
}

/**
 * Validate partial data (useful for form updates)
 */
export function validatePartial<T>(schema: z.ZodTypeAny, data: unknown): {
  success: boolean;
  data?: Partial<T>;
  errors?: Record<string, string>;
} {
  let partialSchema: z.ZodTypeAny = schema;
  if (schema instanceof z.ZodObject) {
    partialSchema = (schema as z.ZodObject<any>).partial();
  }
  return validateData(partialSchema as z.ZodTypeAny, data) as any;
}
