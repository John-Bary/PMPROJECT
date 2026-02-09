// Zod validation schemas for all API endpoints
const { z } = require('zod');

// ============================================================================
// Shared helpers
// ============================================================================

// Strip HTML tags to prevent stored XSS
const sanitize = (val) =>
  typeof val === 'string'
    ? val.replace(/<[^>]*>/g, '').trim()
    : val;

const sanitizedString = (maxLen = 500) =>
  z.string().transform(sanitize).pipe(z.string().max(maxLen));

const optionalSanitizedString = (maxLen = 500) =>
  z.string().transform(sanitize).pipe(z.string().max(maxLen)).optional().or(z.literal(''));

const uuidString = z.string().uuid('Invalid UUID format');

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color (e.g., #3B82F6)');

const emailString = z.string().email('Please provide a valid email address').max(255).transform((v) => v.toLowerCase().trim());

const passwordString = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be 128 characters or less')
  .refine((val) => /[A-Z]/.test(val), 'Password must contain at least one uppercase letter')
  .refine((val) => /[a-z]/.test(val), 'Password must contain at least one lowercase letter')
  .refine((val) => /[0-9]/.test(val), 'Password must contain at least one digit');

// ============================================================================
// Auth schemas
// ============================================================================

const registerSchema = {
  body: z.object({
    email: emailString,
    password: passwordString,
    name: sanitizedString(100).refine((v) => v.length >= 1, 'Name is required'),
    tos_accepted: z.boolean(),
  }),
};

const loginSchema = {
  body: z.object({
    email: emailString,
    password: z.string().min(1, 'Password is required').max(128),
  }),
};

const forgotPasswordSchema = {
  body: z.object({
    email: emailString,
  }),
};

const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Reset token is required').max(256),
    password: passwordString,
  }),
};

const verifyEmailSchema = {
  body: z.object({
    token: z.string().min(1, 'Verification token is required').max(256),
  }),
};

// ============================================================================
// Task schemas
// ============================================================================

const createTaskSchema = {
  body: z.object({
    title: sanitizedString(500).refine((v) => v.length >= 1, 'Task title is required'),
    description: optionalSanitizedString(10000).nullable().optional(),
    category_id: z.number().int().positive().optional().nullable(),
    assignee_ids: z.array(z.number().int().positive()).optional().default([]),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
    status: z.enum(['todo', 'in_progress', 'completed']).optional().default('todo'),
    due_date: z.string().optional().nullable(),
    parent_task_id: z.number().int().positive().optional().nullable(),
    workspace_id: uuidString,
  }),
};

const updateTaskSchema = {
  body: z.object({
    title: sanitizedString(500).optional(),
    description: optionalSanitizedString(10000).nullable().optional(),
    category_id: z.number().int().positive().optional().nullable(),
    assignee_ids: z.array(z.number().int().positive()).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z.enum(['todo', 'in_progress', 'completed']).optional(),
    due_date: z.string().optional().nullable(),
    parent_task_id: z.number().int().positive().optional().nullable(),
    workspace_id: uuidString.optional(),
  }),
};

// ============================================================================
// Category schemas
// ============================================================================

const createCategorySchema = {
  body: z.object({
    name: sanitizedString(100).refine((v) => v.length >= 1, 'Category name is required'),
    color: hexColor.optional().default('#3B82F6'),
    workspace_id: uuidString,
  }),
};

const updateCategorySchema = {
  body: z.object({
    name: sanitizedString(100).optional(),
    color: hexColor.optional(),
    workspace_id: uuidString.optional(),
  }),
};

// ============================================================================
// Workspace schemas
// ============================================================================

const createWorkspaceSchema = {
  body: z.object({
    name: sanitizedString(100).refine((v) => v.length >= 1, 'Workspace name is required'),
  }),
};

const updateWorkspaceSchema = {
  body: z.object({
    name: sanitizedString(100).optional(),
  }),
};

const inviteToWorkspaceSchema = {
  body: z.object({
    email: emailString,
    role: z.enum(['admin', 'member', 'viewer']).optional().default('member'),
  }),
};

// ============================================================================
// Comment schemas
// ============================================================================

const createCommentSchema = {
  body: z.object({
    content: sanitizedString(5000).refine((v) => v.length >= 1, 'Comment content is required'),
  }),
};

const updateCommentSchema = {
  body: z.object({
    content: sanitizedString(5000).refine((v) => v.length >= 1, 'Comment content is required'),
  }),
};

// ============================================================================
// Profile schemas
// ============================================================================

const updateProfileSchema = {
  body: z.object({
    first_name: sanitizedString(60).optional(),
    last_name: sanitizedString(60).optional(),
  }),
};

const updatePreferencesSchema = {
  body: z.object({
    language: z.string().max(10).optional(),
    timezone: z.string().max(50).optional(),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  createTaskSchema,
  updateTaskSchema,
  createCategorySchema,
  updateCategorySchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteToWorkspaceSchema,
  createCommentSchema,
  updateCommentSchema,
  updateProfileSchema,
  updatePreferencesSchema,
};
