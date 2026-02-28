// Tests for Zod validation schemas
const {
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
  changePasswordSchema,
  updateMemberRoleSchema,
  updateTaskPositionSchema,
  reorderCategoriesSchema,
  _sanitize: sanitize,
  _sanitizedString: sanitizedString,
  _optionalSanitizedString: optionalSanitizedString,
} = require('../schemas');

// Helper: a valid UUID for workspace_id fields
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

// Helper: a strong password that satisfies all rules
const STRONG_PASSWORD = 'StrongPass1';

// Helper to assert parse success
const expectSuccess = (schema, data) => {
  const result = schema.body.safeParse(data);
  expect(result.success).toBe(true);
  return result.data;
};

// Helper to assert parse failure
const expectFailure = (schema, data) => {
  const result = schema.body.safeParse(data);
  expect(result.success).toBe(false);
  return result.error;
};

// ============================================================================
// registerSchema
// ============================================================================
describe('registerSchema', () => {
  const validInput = {
    email: 'user@example.com',
    password: STRONG_PASSWORD,
    name: 'John Doe',
    tos_accepted: true,
  };

  it('should pass with valid input', () => {
    const data = expectSuccess(registerSchema, validInput);
    expect(data.email).toBe('user@example.com');
    expect(data.name).toBe('John Doe');
  });

  it('should lowercase email', () => {
    const data = expectSuccess(registerSchema, { ...validInput, email: 'USER@Example.COM' });
    expect(data.email).toBe('user@example.com');
  });

  it('should fail when email is missing', () => {
    const { email, ...noEmail } = validInput;
    expectFailure(registerSchema, noEmail);
  });

  it('should fail with invalid email format', () => {
    expectFailure(registerSchema, { ...validInput, email: 'not-an-email' });
  });

  it('should fail when password is too short', () => {
    expectFailure(registerSchema, { ...validInput, password: 'Ab1' });
  });

  it('should fail when password has no uppercase letter', () => {
    expectFailure(registerSchema, { ...validInput, password: 'alllower1' });
  });

  it('should fail when password has no lowercase letter', () => {
    expectFailure(registerSchema, { ...validInput, password: 'ALLUPPER1' });
  });

  it('should fail when password has no digit', () => {
    expectFailure(registerSchema, { ...validInput, password: 'NoDigitsHere' });
  });

  it('should fail when name is missing', () => {
    const { name, ...noName } = validInput;
    expectFailure(registerSchema, noName);
  });

  it('should strip HTML from name (XSS prevention)', () => {
    const data = expectSuccess(registerSchema, { ...validInput, name: '<script>alert("xss")</script>John' });
    expect(data.name).not.toContain('<script>');
    expect(data.name).toContain('John');
  });

  it('should fail when tos_accepted is missing', () => {
    const { tos_accepted, ...noTos } = validInput;
    expectFailure(registerSchema, noTos);
  });

  it('should fail when tos_accepted is not a boolean', () => {
    expectFailure(registerSchema, { ...validInput, tos_accepted: 'yes' });
  });
});

// ============================================================================
// loginSchema
// ============================================================================
describe('loginSchema', () => {
  const validInput = { email: 'user@example.com', password: 'anyPassword1' };

  it('should pass with valid input', () => {
    expectSuccess(loginSchema, validInput);
  });

  it('should fail when email is missing', () => {
    expectFailure(loginSchema, { password: 'anyPassword1' });
  });

  it('should fail with invalid email format', () => {
    expectFailure(loginSchema, { email: 'bad', password: 'anyPassword1' });
  });

  it('should fail when password is empty', () => {
    expectFailure(loginSchema, { email: 'user@example.com', password: '' });
  });
});

// ============================================================================
// createTaskSchema
// ============================================================================
describe('createTaskSchema', () => {
  const validInput = {
    title: 'My Task',
    workspace_id: VALID_UUID,
  };

  it('should pass with minimal valid input', () => {
    const data = expectSuccess(createTaskSchema, validInput);
    expect(data.title).toBe('My Task');
    expect(data.priority).toBe('medium'); // default
    expect(data.status).toBe('todo'); // default
  });

  it('should pass with all optional fields', () => {
    const data = expectSuccess(createTaskSchema, {
      ...validInput,
      description: 'A description',
      category_id: 5,
      assignee_ids: [1, 2, 3],
      priority: 'urgent',
      status: 'in_progress',
      due_date: '2025-12-31',
      parent_task_id: 10,
    });
    expect(data.priority).toBe('urgent');
    expect(data.assignee_ids).toEqual([1, 2, 3]);
  });

  it('should fail when title is missing', () => {
    expectFailure(createTaskSchema, { workspace_id: VALID_UUID });
  });

  it('should fail when workspace_id is missing', () => {
    expectFailure(createTaskSchema, { title: 'Task' });
  });

  it('should fail with invalid workspace_id (not UUID)', () => {
    expectFailure(createTaskSchema, { title: 'Task', workspace_id: 'not-a-uuid' });
  });

  it('should fail with invalid priority enum value', () => {
    expectFailure(createTaskSchema, { ...validInput, priority: 'critical' });
  });

  it('should fail with invalid status enum value', () => {
    expectFailure(createTaskSchema, { ...validInput, status: 'archived' });
  });

  it('should strip HTML from title (XSS prevention)', () => {
    const data = expectSuccess(createTaskSchema, {
      ...validInput,
      title: '<img onerror="alert(1)">Task',
    });
    expect(data.title).not.toContain('<img');
  });

  it('should accept null for optional nullable fields', () => {
    const data = expectSuccess(createTaskSchema, {
      ...validInput,
      description: null,
      category_id: null,
      parent_task_id: null,
      due_date: null,
    });
    expect(data.description).toBeNull();
  });
});

// ============================================================================
// updateTaskSchema
// ============================================================================
describe('updateTaskSchema', () => {
  it('should pass with empty body (all fields optional)', () => {
    expectSuccess(updateTaskSchema, {});
  });

  it('should pass with partial update', () => {
    const data = expectSuccess(updateTaskSchema, { title: 'Updated', priority: 'high' });
    expect(data.title).toBe('Updated');
    expect(data.priority).toBe('high');
  });

  it('should fail with invalid priority', () => {
    expectFailure(updateTaskSchema, { priority: 'extreme' });
  });

  it('should strip HTML from description', () => {
    const data = expectSuccess(updateTaskSchema, { description: '<b>Bold</b> text' });
    expect(data.description).not.toContain('<b>');
    expect(data.description).toContain('Bold');
  });
});

// ============================================================================
// createCategorySchema
// ============================================================================
describe('createCategorySchema', () => {
  const validInput = { name: 'Design', workspace_id: VALID_UUID };

  it('should pass with valid input', () => {
    const data = expectSuccess(createCategorySchema, validInput);
    expect(data.name).toBe('Design');
    expect(data.color).toBe('#3B82F6'); // default
  });

  it('should pass with custom hex color', () => {
    const data = expectSuccess(createCategorySchema, { ...validInput, color: '#FF0000' });
    expect(data.color).toBe('#FF0000');
  });

  it('should fail when name is missing', () => {
    expectFailure(createCategorySchema, { workspace_id: VALID_UUID });
  });

  it('should fail with invalid hex color', () => {
    expectFailure(createCategorySchema, { ...validInput, color: 'red' });
  });

  it('should fail with invalid hex color (3-char shorthand)', () => {
    expectFailure(createCategorySchema, { ...validInput, color: '#F00' });
  });

  it('should fail when workspace_id is not a UUID', () => {
    expectFailure(createCategorySchema, { name: 'Design', workspace_id: '123' });
  });
});

// ============================================================================
// updateCategorySchema
// ============================================================================
describe('updateCategorySchema', () => {
  it('should pass with empty body (all optional)', () => {
    expectSuccess(updateCategorySchema, {});
  });

  it('should pass with name update', () => {
    const data = expectSuccess(updateCategorySchema, { name: 'Engineering' });
    expect(data.name).toBe('Engineering');
  });

  it('should fail with invalid color', () => {
    expectFailure(updateCategorySchema, { color: 'not-hex' });
  });
});

// ============================================================================
// createWorkspaceSchema
// ============================================================================
describe('createWorkspaceSchema', () => {
  it('should pass with valid name', () => {
    const data = expectSuccess(createWorkspaceSchema, { name: 'My Workspace' });
    expect(data.name).toBe('My Workspace');
  });

  it('should fail when name is missing', () => {
    expectFailure(createWorkspaceSchema, {});
  });

  it('should fail with empty name after trim', () => {
    expectFailure(createWorkspaceSchema, { name: '   ' });
  });

  it('should strip HTML from name', () => {
    const data = expectSuccess(createWorkspaceSchema, { name: '<div>Workspace</div>' });
    expect(data.name).not.toContain('<div>');
    expect(data.name).toBe('Workspace');
  });

  it('should fail when name exceeds 100 characters', () => {
    expectFailure(createWorkspaceSchema, { name: 'A'.repeat(101) });
  });
});

// ============================================================================
// inviteToWorkspaceSchema
// ============================================================================
describe('inviteToWorkspaceSchema', () => {
  it('should pass with valid email', () => {
    const data = expectSuccess(inviteToWorkspaceSchema, { email: 'friend@example.com' });
    expect(data.role).toBe('member'); // default
  });

  it('should pass with explicit role', () => {
    const data = expectSuccess(inviteToWorkspaceSchema, { email: 'a@b.com', role: 'admin' });
    expect(data.role).toBe('admin');
  });

  it('should fail with invalid email', () => {
    expectFailure(inviteToWorkspaceSchema, { email: 'nope' });
  });

  it('should fail with invalid role', () => {
    expectFailure(inviteToWorkspaceSchema, { email: 'a@b.com', role: 'superadmin' });
  });
});

// ============================================================================
// createCommentSchema
// ============================================================================
describe('createCommentSchema', () => {
  it('should pass with valid content', () => {
    const data = expectSuccess(createCommentSchema, { content: 'This is a comment.' });
    expect(data.content).toBe('This is a comment.');
  });

  it('should fail when content is empty string', () => {
    expectFailure(createCommentSchema, { content: '' });
  });

  it('should fail when content is only whitespace (empty after trim)', () => {
    expectFailure(createCommentSchema, { content: '   ' });
  });

  it('should fail when content is only HTML tags (empty after sanitization)', () => {
    expectFailure(createCommentSchema, { content: '<script></script>' });
  });

  it('should fail when content is missing', () => {
    expectFailure(createCommentSchema, {});
  });

  it('should strip HTML from content', () => {
    const data = expectSuccess(createCommentSchema, { content: '<b>Bold</b> text' });
    expect(data.content).not.toContain('<b>');
    expect(data.content).toContain('Bold');
  });
});

// ============================================================================
// updateCommentSchema
// ============================================================================
describe('updateCommentSchema', () => {
  it('should pass with valid content', () => {
    const data = expectSuccess(updateCommentSchema, { content: 'Updated comment.' });
    expect(data.content).toBe('Updated comment.');
  });

  it('should fail when content is empty string', () => {
    expectFailure(updateCommentSchema, { content: '' });
  });

  it('should fail when content is only whitespace (empty after trim)', () => {
    expectFailure(updateCommentSchema, { content: '   ' });
  });

  it('should fail when content is only HTML tags (empty after sanitization)', () => {
    expectFailure(updateCommentSchema, { content: '<div></div>' });
  });

  it('should fail when content is missing', () => {
    expectFailure(updateCommentSchema, {});
  });

  it('should strip HTML from content', () => {
    const data = expectSuccess(updateCommentSchema, { content: '<i>Italic</i> words' });
    expect(data.content).not.toContain('<i>');
    expect(data.content).toContain('Italic');
  });
});

// ============================================================================
// updateProfileSchema
// ============================================================================
describe('updateProfileSchema', () => {
  it('should pass with valid names', () => {
    const data = expectSuccess(updateProfileSchema, { first_name: 'Jane', last_name: 'Doe' });
    expect(data.first_name).toBe('Jane');
  });

  it('should pass with empty body (all optional)', () => {
    expectSuccess(updateProfileSchema, {});
  });

  it('should strip HTML from first_name', () => {
    const data = expectSuccess(updateProfileSchema, { first_name: '<script>x</script>Jane' });
    expect(data.first_name).not.toContain('<script>');
    expect(data.first_name).toContain('Jane');
  });

  it('should fail when first_name exceeds 60 characters', () => {
    expectFailure(updateProfileSchema, { first_name: 'A'.repeat(61) });
  });
});

// ============================================================================
// updatePreferencesSchema
// ============================================================================
describe('updatePreferencesSchema', () => {
  it('should pass with valid preferences', () => {
    const data = expectSuccess(updatePreferencesSchema, { language: 'en', timezone: 'Europe/Vilnius' });
    expect(data.language).toBe('en');
  });

  it('should pass with empty body', () => {
    expectSuccess(updatePreferencesSchema, {});
  });

  it('should fail when language exceeds 10 characters', () => {
    expectFailure(updatePreferencesSchema, { language: 'A'.repeat(11) });
  });

  it('should fail when timezone exceeds 50 characters', () => {
    expectFailure(updatePreferencesSchema, { timezone: 'A'.repeat(51) });
  });
});

// ============================================================================
// changePasswordSchema
// ============================================================================
describe('changePasswordSchema', () => {
  const validInput = { currentPassword: 'OldPassword1', newPassword: STRONG_PASSWORD };

  it('should pass with valid input', () => {
    expectSuccess(changePasswordSchema, validInput);
  });

  it('should fail when currentPassword is empty', () => {
    expectFailure(changePasswordSchema, { currentPassword: '', newPassword: STRONG_PASSWORD });
  });

  it('should fail when newPassword is too short', () => {
    expectFailure(changePasswordSchema, { currentPassword: 'OldPassword1', newPassword: 'Ab1' });
  });

  it('should fail when newPassword lacks uppercase', () => {
    expectFailure(changePasswordSchema, { currentPassword: 'OldPassword1', newPassword: 'alllower1' });
  });

  it('should fail when newPassword lacks digit', () => {
    expectFailure(changePasswordSchema, { currentPassword: 'OldPassword1', newPassword: 'NoDigitsHere' });
  });
});

// ============================================================================
// updateMemberRoleSchema
// ============================================================================
describe('updateMemberRoleSchema', () => {
  it('should pass with valid role "admin"', () => {
    const data = expectSuccess(updateMemberRoleSchema, { role: 'admin' });
    expect(data.role).toBe('admin');
  });

  it('should pass with valid role "member"', () => {
    expectSuccess(updateMemberRoleSchema, { role: 'member' });
  });

  it('should pass with valid role "viewer"', () => {
    expectSuccess(updateMemberRoleSchema, { role: 'viewer' });
  });

  it('should fail with invalid role', () => {
    expectFailure(updateMemberRoleSchema, { role: 'owner' });
  });

  it('should fail when role is missing', () => {
    expectFailure(updateMemberRoleSchema, {});
  });
});

// ============================================================================
// updateTaskPositionSchema
// ============================================================================
describe('updateTaskPositionSchema', () => {
  it('should pass with valid position', () => {
    const data = expectSuccess(updateTaskPositionSchema, { position: 0 });
    expect(data.position).toBe(0);
  });

  it('should pass with category_id and workspace_id', () => {
    const data = expectSuccess(updateTaskPositionSchema, {
      position: 3,
      category_id: 7,
      workspace_id: VALID_UUID,
    });
    expect(data.category_id).toBe(7);
  });

  it('should fail when position is negative', () => {
    expectFailure(updateTaskPositionSchema, { position: -1 });
  });

  it('should fail when position is missing', () => {
    expectFailure(updateTaskPositionSchema, {});
  });

  it('should fail when position is a float', () => {
    expectFailure(updateTaskPositionSchema, { position: 1.5 });
  });
});

// ============================================================================
// reorderCategoriesSchema
// ============================================================================
describe('reorderCategoriesSchema', () => {
  const validInput = { categoryIds: [1, 2, 3], workspace_id: VALID_UUID };

  it('should pass with valid input', () => {
    const data = expectSuccess(reorderCategoriesSchema, validInput);
    expect(data.categoryIds).toEqual([1, 2, 3]);
  });

  it('should fail with empty categoryIds array', () => {
    expectFailure(reorderCategoriesSchema, { categoryIds: [], workspace_id: VALID_UUID });
  });

  it('should fail when categoryIds is missing', () => {
    expectFailure(reorderCategoriesSchema, { workspace_id: VALID_UUID });
  });

  it('should fail when workspace_id is missing', () => {
    expectFailure(reorderCategoriesSchema, { categoryIds: [1] });
  });

  it('should fail with non-positive category ids', () => {
    expectFailure(reorderCategoriesSchema, { categoryIds: [0], workspace_id: VALID_UUID });
  });

  it('should fail with non-integer category ids', () => {
    expectFailure(reorderCategoriesSchema, { categoryIds: [1.5], workspace_id: VALID_UUID });
  });
});

// ============================================================================
// sanitize helper — branch coverage for non-string input (lines 10-12)
// ============================================================================
describe('sanitize helper — branch coverage (lines 9-12)', () => {
  it('should strip HTML tags and trim when given a string (true branch)', () => {
    expect(sanitize('<b>Hello</b>')).toBe('Hello');
    expect(sanitize('  spaced  ')).toBe('spaced');
    expect(sanitize('<script>alert(1)</script>text')).toBe('alert(1)text');
  });

  it('should return value as-is when given a non-string (false branch)', () => {
    expect(sanitize(42)).toBe(42);
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeUndefined();
    expect(sanitize(true)).toBe(true);
    expect(sanitize({ key: 'val' })).toEqual({ key: 'val' });
    expect(sanitize([1, 2])).toEqual([1, 2]);
  });

  it('should handle null passed to an optionalSanitizedString field', () => {
    const data = createTaskSchema.body.safeParse({
      title: 'Test',
      workspace_id: VALID_UUID,
      description: null,
    });
    expect(data.success).toBe(true);
    expect(data.data.description).toBeNull();
  });
});

// ============================================================================
// sanitizedString/optionalSanitizedString — default parameter branches (lines 14, 17)
// ============================================================================
describe('sanitizedString and optionalSanitizedString — default maxLen branch coverage', () => {
  it('should use default maxLen=500 when called with no arguments (line 14)', () => {
    // Calling sanitizedString() with no arg exercises the maxLen=500 default branch
    const schema = sanitizedString();
    const result = schema.safeParse('A'.repeat(500));
    expect(result.success).toBe(true);
  });

  it('should reject strings exceeding default maxLen=500', () => {
    const schema = sanitizedString();
    const result = schema.safeParse('A'.repeat(501));
    expect(result.success).toBe(false);
  });

  it('should use explicit maxLen when provided', () => {
    const schema = sanitizedString(100);
    const result = schema.safeParse('A'.repeat(100));
    expect(result.success).toBe(true);
    const failResult = schema.safeParse('A'.repeat(101));
    expect(failResult.success).toBe(false);
  });

  it('should use default maxLen=500 for optionalSanitizedString when called with no arguments (line 17)', () => {
    // Calling optionalSanitizedString() with no arg exercises the maxLen=500 default
    const schema = optionalSanitizedString();
    const result = schema.safeParse('A'.repeat(500));
    expect(result.success).toBe(true);
  });

  it('should reject strings exceeding default maxLen=500 for optionalSanitizedString', () => {
    const schema = optionalSanitizedString();
    const result = schema.safeParse('A'.repeat(501));
    expect(result.success).toBe(false);
  });

  it('should accept empty string via .or(z.literal("")) in optionalSanitizedString (line 18)', () => {
    const schema = optionalSanitizedString();
    const result = schema.safeParse('');
    expect(result.success).toBe(true);
    expect(result.data).toBe('');
  });

  it('should accept undefined for optionalSanitizedString', () => {
    const schema = optionalSanitizedString();
    const result = schema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it('should use explicit maxLen for optionalSanitizedString', () => {
    const schema = optionalSanitizedString(10000);
    const result = schema.safeParse('A'.repeat(10000));
    expect(result.success).toBe(true);
    const failResult = schema.safeParse('A'.repeat(10001));
    expect(failResult.success).toBe(false);
  });
});

// ============================================================================
// forgotPasswordSchema
// ============================================================================
describe('forgotPasswordSchema', () => {
  it('should pass with valid email', () => {
    expectSuccess(forgotPasswordSchema, { email: 'user@example.com' });
  });

  it('should fail when email is missing', () => {
    expectFailure(forgotPasswordSchema, {});
  });
});

// ============================================================================
// resetPasswordSchema
// ============================================================================
describe('resetPasswordSchema', () => {
  it('should pass with valid token and password', () => {
    expectSuccess(resetPasswordSchema, { token: 'abc123', password: STRONG_PASSWORD });
  });

  it('should fail when token is empty', () => {
    expectFailure(resetPasswordSchema, { token: '', password: STRONG_PASSWORD });
  });
});

// ============================================================================
// verifyEmailSchema
// ============================================================================
describe('verifyEmailSchema', () => {
  it('should pass with valid token', () => {
    expectSuccess(verifyEmailSchema, { token: 'verify-token-123' });
  });

  it('should fail when token is empty', () => {
    expectFailure(verifyEmailSchema, { token: '' });
  });
});

// ============================================================================
// updateWorkspaceSchema
// ============================================================================
describe('updateWorkspaceSchema', () => {
  it('should pass with empty body (all optional)', () => {
    expectSuccess(updateWorkspaceSchema, {});
  });

  it('should pass with name update', () => {
    const data = expectSuccess(updateWorkspaceSchema, { name: 'New Name' });
    expect(data.name).toBe('New Name');
  });
});
