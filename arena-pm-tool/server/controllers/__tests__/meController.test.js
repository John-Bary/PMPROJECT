const bcrypt = require('bcryptjs');
const {
  getProfile,
  updateProfile,
  updatePreferences,
  updateNotifications,
  uploadAvatar,
  deleteAvatar,
  getMyTasks,
  changePassword,
  deleteAccount,
  exportTasksCsv,
  getDataExport
} = require('../meController');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('../../config/database');
jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('file-type', () => ({
  fromBuffer: jest.fn(),
}));
jest.mock('../../config/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn(),
      }),
    },
  },
}));

const { query } = require('../../config/database');
const FileType = require('file-type');
const { supabaseAdmin } = require('../../config/supabase');

describe('Me Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockReq({
      user: { id: 1, name: 'Test User', email: 'test@todoria.app' },
    });
    res = createMockRes();
    // Add setHeader and send to mock res for CSV export
    res.setHeader = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    jest.clearAllMocks();
    // Re-setup supabase mock chain after clearAllMocks
    const storageBucket = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      remove: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://supabase.co/storage/avatars/1-123.jpg' } }),
    };
    supabaseAdmin.storage.from.mockReturnValue(storageBucket);
  });

  // ─── getProfile ──────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should return the current user profile', async () => {
      const mockUser = {
        id: 1,
        email: 'test@todoria.app',
        name: 'Test User',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'member',
        language: 'en',
        timezone: 'Europe/Vilnius',
        email_notifications_enabled: true,
        email_digest_mode: 'immediate',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-06-01'),
      };
      query.mockResolvedValue({ rows: [mockUser] });

      await getProfile(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, name'),
        [1]
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: {
            id: 1,
            email: 'test@todoria.app',
            name: 'Test User',
            firstName: 'Test',
            lastName: 'User',
            avatarUrl: 'https://example.com/avatar.jpg',
            role: 'member',
            language: 'en',
            timezone: 'Europe/Vilnius',
            emailNotificationsEnabled: true,
            emailDigestMode: 'immediate',
            createdAt: mockUser.created_at,
            updatedAt: mockUser.updated_at,
          },
        },
      });
    });

    it('should return 404 if user not found', async () => {
      query.mockResolvedValue({ rows: [] });

      await getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User not found',
      });
    });
  });

  // ─── updateProfile ───────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('should update first_name and last_name successfully', async () => {
      req.body = { firstName: 'Jane', lastName: 'Doe' };
      const updatedUser = {
        id: 1,
        email: 'test@todoria.app',
        name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        avatar_url: null,
        role: 'member',
        language: 'en',
        timezone: 'UTC',
        email_notifications_enabled: true,
        email_digest_mode: 'immediate',
        created_at: new Date(),
        updated_at: new Date(),
      };
      query.mockResolvedValue({ rows: [updatedUser] });

      await updateProfile(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['Jane', 'Doe', 'Jane Doe', 1]
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
          user: expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Doe',
            name: 'Jane Doe',
          }),
        },
      });
    });

    it('should return 400 if firstName is too short', async () => {
      req.body = { firstName: 'A', lastName: 'Doe' };

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'First name must be between 2 and 60 characters.',
      });
    });

    it('should return 400 if lastName is too short', async () => {
      req.body = { firstName: 'Jane', lastName: 'D' };

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Last name must be between 2 and 60 characters.',
      });
    });

    it('should return 400 if firstName is missing', async () => {
      req.body = { lastName: 'Doe' };

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'First name must be between 2 and 60 characters.',
      });
    });
  });

  // ─── updatePreferences ───────────────────────────────────────────────────────

  describe('updatePreferences', () => {
    it('should update language preference', async () => {
      req.body = { language: 'fr' };
      query.mockResolvedValue({ rows: [{ language: 'fr', timezone: 'UTC' }] });

      await updatePreferences(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Preferences updated successfully',
        data: {
          preferences: {
            language: 'fr',
            timezone: 'UTC',
          },
        },
      });
    });

    it('should update timezone preference', async () => {
      req.body = { timezone: 'Europe/Vilnius' };
      query.mockResolvedValue({
        rows: [{ language: 'en', timezone: 'Europe/Vilnius' }],
      });

      await updatePreferences(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Preferences updated successfully',
        data: {
          preferences: {
            language: 'en',
            timezone: 'Europe/Vilnius',
          },
        },
      });
    });

    it('should return 400 for invalid language', async () => {
      req.body = { language: 'xx' };

      await updatePreferences(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: expect.stringContaining('Invalid language'),
      });
    });

    it('should return 400 when no valid fields are provided', async () => {
      req.body = {};

      await updatePreferences(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No valid fields to update.',
      });
    });
  });

  // ─── updateNotifications ─────────────────────────────────────────────────────

  describe('updateNotifications', () => {
    it('should update notification settings', async () => {
      req.body = { emailNotificationsEnabled: false, emailDigestMode: 'daily_digest' };
      query.mockResolvedValue({
        rows: [{ email_notifications_enabled: false, email_digest_mode: 'daily_digest' }],
      });

      await updateNotifications(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Notification settings updated successfully',
        data: {
          notifications: {
            emailNotificationsEnabled: false,
            emailDigestMode: 'daily_digest',
          },
        },
      });
    });

    it('should return 400 for invalid digest mode', async () => {
      req.body = { emailDigestMode: 'weekly' };

      await updateNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: expect.stringContaining('Invalid digest mode'),
      });
    });

    it('should return 400 when no valid fields are provided', async () => {
      req.body = {};

      await updateNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No valid fields to update.',
      });
    });
  });

  // ─── uploadAvatar ────────────────────────────────────────────────────────────

  describe('uploadAvatar', () => {
    const createMockFile = () => ({
      buffer: Buffer.from('fake-image-data'),
      originalname: 'avatar.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
    });

    it('should upload avatar successfully', async () => {
      req.file = createMockFile();
      FileType.fromBuffer.mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' });

      // Current user has no existing avatar
      query.mockResolvedValueOnce({ rows: [{ avatar_url: null }] });
      // Update returns new avatar URL
      query.mockResolvedValueOnce({
        rows: [{ avatar_url: 'https://supabase.co/storage/avatars/1-123.jpg' }],
      });

      await uploadAvatar(req, res);

      expect(FileType.fromBuffer).toHaveBeenCalledWith(req.file.buffer);
      expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('avatars');
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Avatar uploaded successfully',
        data: {
          avatarUrl: 'https://supabase.co/storage/avatars/1-123.jpg',
        },
      });
    });

    it('should return 400 when no file is uploaded', async () => {
      req.file = undefined;

      await uploadAvatar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No file uploaded.',
      });
    });

    it('should return 400 for invalid file type (magic number mismatch)', async () => {
      req.file = createMockFile();
      FileType.fromBuffer.mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' });

      await uploadAvatar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid file content. Only JPEG, PNG, and WebP images are allowed.',
      });
    });

    it('should return 400 when file type cannot be detected', async () => {
      req.file = createMockFile();
      FileType.fromBuffer.mockResolvedValue(null);

      await uploadAvatar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid file content. Only JPEG, PNG, and WebP images are allowed.',
      });
    });

    it('should delete old avatar before uploading new one', async () => {
      req.file = createMockFile();
      FileType.fromBuffer.mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' });

      const oldUrl = 'https://supabase.co/storage/v1/object/public/avatars/1-old.jpg';
      query.mockResolvedValueOnce({ rows: [{ avatar_url: oldUrl }] });
      query.mockResolvedValueOnce({
        rows: [{ avatar_url: 'https://supabase.co/storage/avatars/1-new.jpg' }],
      });

      await uploadAvatar(req, res);

      const bucket = supabaseAdmin.storage.from('avatars');
      expect(bucket.remove).toHaveBeenCalledWith(['1-old.jpg']);
    });
  });

  // ─── deleteAvatar ────────────────────────────────────────────────────────────

  describe('deleteAvatar', () => {
    it('should delete avatar and set to null', async () => {
      const oldUrl = 'https://supabase.co/storage/v1/object/public/avatars/1-avatar.jpg';
      query.mockResolvedValueOnce({ rows: [{ avatar_url: oldUrl }] });
      query.mockResolvedValueOnce({ rows: [] }); // UPDATE SET avatar_url = NULL

      await deleteAvatar(req, res);

      const bucket = supabaseAdmin.storage.from('avatars');
      expect(bucket.remove).toHaveBeenCalledWith(['1-avatar.jpg']);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Avatar removed successfully',
        data: {
          avatarUrl: null,
        },
      });
    });

    it('should succeed even when no avatar exists', async () => {
      query.mockResolvedValueOnce({ rows: [{ avatar_url: null }] });
      query.mockResolvedValueOnce({ rows: [] });

      await deleteAvatar(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Avatar removed successfully',
        data: {
          avatarUrl: null,
        },
      });
    });
  });

  // ─── getMyTasks ──────────────────────────────────────────────────────────────

  describe('getMyTasks', () => {
    it('should return tasks assigned to the current user', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Task 1',
          description: 'Description 1',
          status: 'todo',
          priority: 'high',
          due_date: '2024-12-01',
          completed_at: null,
          category_id: 10,
          category_name: 'Dev',
          category_color: '#3B82F6',
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-06-01'),
        },
      ];
      query.mockResolvedValue({ rows: mockTasks });

      await getMyTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN task_assignments ta'),
        [1]
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          tasks: [
            expect.objectContaining({
              id: 1,
              title: 'Task 1',
              status: 'todo',
              priority: 'high',
              categoryName: 'Dev',
            }),
          ],
          total: 1,
        },
      });
    });

    it('should filter tasks by status', async () => {
      req.query = { status: 'open' };
      query.mockResolvedValue({ rows: [] });

      await getMyTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("t.status != 'completed'"),
        [1]
      );
    });

    it('should filter by workspace_id', async () => {
      req.query = { workspace_id: 'ws-123' };
      query.mockResolvedValue({ rows: [] });

      await getMyTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('t.workspace_id = $2'),
        [1, 'ws-123']
      );
    });

    it('should return empty list when no tasks are assigned', async () => {
      query.mockResolvedValue({ rows: [] });

      await getMyTasks(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          tasks: [],
          total: 0,
        },
      });
    });
  });

  // ─── changePassword ──────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      req.body = { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' };
      query.mockResolvedValueOnce({ rows: [{ password: 'hashed_old' }] });
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashed_new');
      query.mockResolvedValueOnce({ rows: [] }); // UPDATE password

      await changePassword(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith('OldPass1!', 'hashed_old');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass1!', 'salt');
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Password changed successfully.',
      });
    });

    it('should return 401 for wrong current password', async () => {
      req.body = { currentPassword: 'WrongPass1', newPassword: 'NewPass1!' };
      query.mockResolvedValue({ rows: [{ password: 'hashed_old' }] });
      bcrypt.compare.mockResolvedValue(false);

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Current password is incorrect.',
      });
    });

    it('should return 400 if currentPassword is missing', async () => {
      req.body = { newPassword: 'NewPass1!' };

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Current password and new password are required.',
      });
    });

    it('should return 400 if new password is too short', async () => {
      req.body = { currentPassword: 'OldPass1!', newPassword: 'short' };

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'New password must be at least 8 characters.',
      });
    });
  });

  // ─── deleteAccount ───────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      req.body = { password: 'CorrectPass1!' };
      query.mockResolvedValueOnce({ rows: [{ password: 'hashed_pass' }] });
      bcrypt.compare.mockResolvedValue(true);
      query.mockResolvedValueOnce({ rows: [] }); // UPDATE (anonymize)

      await deleteAccount(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("name = 'Deleted User'"),
        ['deleted_1@removed.todoria.app', 1]
      );
      expect(res.clearCookie).toHaveBeenCalledWith('token');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/auth/refresh' });
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Account deleted successfully.',
      });
    });

    it('should return 401 for wrong password', async () => {
      req.body = { password: 'WrongPass1!' };
      query.mockResolvedValue({ rows: [{ password: 'hashed_pass' }] });
      bcrypt.compare.mockResolvedValue(false);

      await deleteAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Password is incorrect.',
      });
    });

    it('should return 400 if password is missing', async () => {
      req.body = {};

      await deleteAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Password is required to delete your account.',
      });
    });
  });

  // ─── exportTasksCsv ──────────────────────────────────────────────────────────

  describe('exportTasksCsv', () => {
    it('should export tasks as CSV', async () => {
      const mockTasks = [
        {
          title: 'Task 1',
          description: 'A description',
          status: 'todo',
          priority: 'high',
          due_date: new Date('2024-12-01'),
          completed_at: null,
          category_name: 'Dev',
          created_at: new Date('2024-01-15'),
        },
      ];
      query.mockResolvedValue({ rows: mockTasks });

      await exportTasksCsv(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename="todoria-tasks-')
      );
      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining('Title,Description,Status,Priority,Due Date,Completed At,Category,Created At')
      );
      // Verify task data appears in CSV
      const csvContent = res.send.mock.calls[0][0];
      expect(csvContent).toContain('Task 1');
      expect(csvContent).toContain('A description');
      expect(csvContent).toContain('Dev');
    });

    it('should return CSV with only header when no tasks exist', async () => {
      query.mockResolvedValue({ rows: [] });

      await exportTasksCsv(req, res);

      const csvContent = res.send.mock.calls[0][0];
      expect(csvContent).toBe(
        'Title,Description,Status,Priority,Due Date,Completed At,Category,Created At'
      );
    });
  });

  // ─── getDataExport ───────────────────────────────────────────────────────────

  describe('getDataExport', () => {
    it('should return full GDPR data export', async () => {
      const mockUserData = { id: 1, email: 'test@todoria.app', name: 'Test User', first_name: 'Test', last_name: 'User', created_at: new Date() };
      const mockTasks = [{ id: 1, title: 'Task 1', description: 'Desc', status: 'todo', priority: 'high', due_date: null, created_at: new Date() }];
      const mockCategories = [{ id: 10, name: 'Dev', color: '#3B82F6', workspace_id: 'ws-1', created_at: new Date() }];
      const mockComments = [{ id: 100, task_id: 1, content: 'A comment', created_at: new Date() }];
      const mockWorkspaces = [{ id: 'ws-1', name: 'My Workspace', role: 'admin', joined_at: new Date() }];

      query
        .mockResolvedValueOnce({ rows: [mockUserData] })
        .mockResolvedValueOnce({ rows: mockTasks })
        .mockResolvedValueOnce({ rows: mockCategories })
        .mockResolvedValueOnce({ rows: mockComments })
        .mockResolvedValueOnce({ rows: mockWorkspaces });

      await getDataExport(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          exportedAt: expect.any(String),
          user: mockUserData,
          tasks: mockTasks,
          categories: mockCategories,
          comments: mockComments,
          workspaces: mockWorkspaces,
        },
      });
    });
  });
});
