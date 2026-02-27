// User Profile Controller
// Handles user profile, preferences, notifications, and avatar management

const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const path = require('path');
const FileType = require('file-type');
const logger = require('../lib/logger');
const { supabaseAdmin } = require('../config/supabase');

// Helper: sanitize error for response (hide internals in production)
const safeError = (error) => process.env.NODE_ENV === 'production' ? undefined : error.message;

// Valid options for preferences
const VALID_LANGUAGES = ['en', 'es', 'fr', 'de', 'pt', 'it'];
const VALID_DIGEST_MODES = ['immediate', 'daily_digest'];

// Get current user profile with all fields
const getProfile = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, name, first_name, last_name, avatar_url, role,
              language, timezone, email_notifications_enabled, email_digest_mode,
              created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.first_name,
          lastName: user.last_name,
          avatarUrl: user.avatar_url,
          role: user.role,
          language: user.language,
          timezone: user.timezone,
          emailNotificationsEnabled: user.email_notifications_enabled,
          emailDigestMode: user.email_digest_mode,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get profile error');
    res.status(500).json({
      status: 'error',
      message: 'Error fetching profile',
      error: safeError(error)
    });
  }
};

// Update user profile (first_name, last_name)
const updateProfile = async (req, res) => {
  try {
    let { firstName, lastName } = req.body;

    // Trim values
    firstName = firstName?.trim();
    lastName = lastName?.trim();

    // Validate first_name
    if (!firstName || firstName.length < 2 || firstName.length > 60) {
      return res.status(400).json({
        status: 'error',
        message: 'First name must be between 2 and 60 characters.'
      });
    }

    // Validate last_name
    if (!lastName || lastName.length < 2 || lastName.length > 60) {
      return res.status(400).json({
        status: 'error',
        message: 'Last name must be between 2 and 60 characters.'
      });
    }

    // Update both first_name, last_name, and the legacy name field
    const fullName = `${firstName} ${lastName}`;

    const result = await query(
      `UPDATE users
       SET first_name = $1, last_name = $2, name = $3
       WHERE id = $4
       RETURNING id, email, name, first_name, last_name, avatar_url, role,
                 language, timezone, email_notifications_enabled, email_digest_mode,
                 created_at, updated_at`,
      [firstName, lastName, fullName, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.first_name,
          lastName: user.last_name,
          avatarUrl: user.avatar_url,
          role: user.role,
          language: user.language,
          timezone: user.timezone,
          emailNotificationsEnabled: user.email_notifications_enabled,
          emailDigestMode: user.email_digest_mode,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Update profile error');
    res.status(500).json({
      status: 'error',
      message: 'Error updating profile',
      error: safeError(error)
    });
  }
};

// Update user preferences (language, timezone)
const updatePreferences = async (req, res) => {
  try {
    const { language, timezone } = req.body;

    // Validate language
    if (language && !VALID_LANGUAGES.includes(language)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid language. Valid options: ${VALID_LANGUAGES.join(', ')}`
      });
    }

    // Validate timezone (basic check - not empty and reasonable length)
    if (timezone && (timezone.length < 2 || timezone.length > 50)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid timezone format.'
      });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (language) {
      updates.push(`language = $${paramIndex++}`);
      values.push(language);
    }

    if (timezone) {
      updates.push(`timezone = $${paramIndex++}`);
      values.push(timezone);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update.'
      });
    }

    values.push(req.user.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING language, timezone`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Preferences updated successfully',
      data: {
        preferences: {
          language: result.rows[0].language,
          timezone: result.rows[0].timezone
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Update preferences error');
    res.status(500).json({
      status: 'error',
      message: 'Error updating preferences',
      error: safeError(error)
    });
  }
};

// Update notification settings
const updateNotifications = async (req, res) => {
  try {
    const { emailNotificationsEnabled, emailDigestMode } = req.body;

    // Validate emailNotificationsEnabled
    if (emailNotificationsEnabled !== undefined && typeof emailNotificationsEnabled !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'emailNotificationsEnabled must be a boolean.'
      });
    }

    // Validate emailDigestMode
    if (emailDigestMode && !VALID_DIGEST_MODES.includes(emailDigestMode)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid digest mode. Valid options: ${VALID_DIGEST_MODES.join(', ')}`
      });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (emailNotificationsEnabled !== undefined) {
      updates.push(`email_notifications_enabled = $${paramIndex++}`);
      values.push(emailNotificationsEnabled);
    }

    if (emailDigestMode) {
      updates.push(`email_digest_mode = $${paramIndex++}`);
      values.push(emailDigestMode);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update.'
      });
    }

    values.push(req.user.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING email_notifications_enabled, email_digest_mode`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Notification settings updated successfully',
      data: {
        notifications: {
          emailNotificationsEnabled: result.rows[0].email_notifications_enabled,
          emailDigestMode: result.rows[0].email_digest_mode
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Update notifications error');
    res.status(500).json({
      status: 'error',
      message: 'Error updating notification settings',
      error: safeError(error)
    });
  }
};

// Upload avatar (Supabase Storage)
const AVATAR_BUCKET = 'avatars';

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded.'
      });
    }

    // Validate file magic numbers (actual file content check)
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const detectedType = await FileType.fromBuffer(req.file.buffer);

    if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid file content. Only JPEG, PNG, and WebP images are allowed.'
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({
        status: 'error',
        message: 'File storage is not configured.'
      });
    }

    // Delete old avatar from Supabase Storage if it exists
    const currentUser = await query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );

    if (currentUser.rows.length > 0 && currentUser.rows[0].avatar_url) {
      const oldUrl = currentUser.rows[0].avatar_url;
      // Extract file path from the Supabase public URL
      const bucketPath = oldUrl.split(`/storage/v1/object/public/${AVATAR_BUCKET}/`)[1];
      if (bucketPath) {
        await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([bucketPath]);
      }
    }

    // Upload to Supabase Storage
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileName = `${req.user.id}-${Date.now()}${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      logger.error({ err: uploadError }, 'Supabase Storage upload error');
      return res.status(500).json({
        status: 'error',
        message: 'Error uploading avatar.'
      });
    }

    // Get the public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(fileName);

    const avatarUrl = publicUrlData.publicUrl;

    const result = await query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url',
      [avatarUrl, req.user.id]
    );

    res.json({
      status: 'success',
      message: 'Avatar uploaded successfully',
      data: {
        avatarUrl: result.rows[0].avatar_url
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Upload avatar error');
    res.status(500).json({
      status: 'error',
      message: 'Error uploading avatar',
      error: safeError(error)
    });
  }
};

// Delete avatar (Supabase Storage)
const deleteAvatar = async (req, res) => {
  try {
    // Get the current avatar to delete from storage
    const currentUser = await query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );

    if (currentUser.rows.length > 0 && currentUser.rows[0].avatar_url && supabaseAdmin) {
      const oldUrl = currentUser.rows[0].avatar_url;
      const bucketPath = oldUrl.split(`/storage/v1/object/public/${AVATAR_BUCKET}/`)[1];
      if (bucketPath) {
        await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([bucketPath]);
      }
    }

    // Set avatar_url to null
    await query(
      'UPDATE users SET avatar_url = NULL WHERE id = $1',
      [req.user.id]
    );

    res.json({
      status: 'success',
      message: 'Avatar removed successfully',
      data: {
        avatarUrl: null
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete avatar error');
    res.status(500).json({
      status: 'error',
      message: 'Error removing avatar',
      error: safeError(error)
    });
  }
};

// Get tasks assigned to the current user
const getMyTasks = async (req, res) => {
  try {
    const { status, sort = 'due_date', order = 'asc', workspace_id } = req.query;

    // Build query - use task_assignments table and scope to workspace
    let queryText = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.completed_at,
        t.category_id,
        c.name as category_name,
        c.color as category_color,
        t.created_at,
        t.updated_at
      FROM tasks t
      LEFT JOIN categories c ON c.id = t.category_id
      JOIN task_assignments ta ON ta.task_id = t.id
      WHERE ta.user_id = $1
    `;

    const values = [req.user.id];
    let paramIndex = 2;

    // Scope to workspace if provided
    if (workspace_id) {
      queryText += ` AND t.workspace_id = $${paramIndex}`;
      values.push(workspace_id);
      paramIndex++;
    }

    // Filter by status
    if (status) {
      if (status === 'open') {
        queryText += ` AND t.status != 'completed'`;
      } else if (status === 'completed') {
        queryText += ` AND t.status = 'completed'`;
      }
    }

    // Sorting - use a lookup map to prevent ORDER BY injection
    const SORT_COLUMNS = {
      due_date: 't.due_date',
      created_at: 't.created_at',
      title: 't.title',
      priority: 't.priority'
    };
    const sortColumn = SORT_COLUMNS[sort] || SORT_COLUMNS.due_date;
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    // Handle null due_dates - put them at the end
    if (sort === 'due_date' || !SORT_COLUMNS[sort]) {
      queryText += ` ORDER BY t.due_date IS NULL, ${sortColumn} ${sortOrder}`;
    } else {
      queryText += ` ORDER BY ${sortColumn} ${sortOrder}`;
    }

    const result = await query(queryText, values);

    res.json({
      status: 'success',
      data: {
        tasks: result.rows.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.due_date,
          completedAt: task.completed_at,
          categoryId: task.category_id,
          categoryName: task.category_name,
          categoryColor: task.category_color,
          createdAt: task.created_at,
          updatedAt: task.updated_at
        })),
        total: result.rows.length
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get my tasks error');
    res.status(500).json({
      status: 'error',
      message: 'Error fetching tasks',
      error: safeError(error)
    });
  }
};

// Change password (requires current password)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 8 characters.'
      });
    }

    // Fetch current hashed password
    const userResult = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ status: 'success', message: 'Password changed successfully.' });
  } catch (error) {
    logger.error({ err: error }, 'Change password error');
    res.status(500).json({
      status: 'error',
      message: 'Error changing password',
      error: safeError(error)
    });
  }
};

// Delete account (requires password confirmation)
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required to delete your account.'
      });
    }

    // Verify password
    const userResult = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const isValid = await bcrypt.compare(password, userResult.rows[0].password);
    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Password is incorrect.'
      });
    }

    // Anonymize user instead of hard-deleting (GDPR-compliant soft delete)
    await query(
      `UPDATE users SET
        name = 'Deleted User',
        first_name = 'Deleted',
        last_name = 'User',
        email = $1,
        password = 'DELETED',
        avatar_url = NULL,
        deleted_at = NOW()
      WHERE id = $2`,
      [`deleted_${req.user.id}@removed.todoria.app`, req.user.id]
    );

    // Clear auth cookies (must match names used in setAuthCookies)
    res.clearCookie('token');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    res.json({ status: 'success', message: 'Account deleted successfully.' });
  } catch (error) {
    logger.error({ err: error }, 'Delete account error');
    res.status(500).json({
      status: 'error',
      message: 'Error deleting account',
      error: safeError(error)
    });
  }
};

// Export tasks as CSV
const exportTasksCsv = async (req, res) => {
  try {
    const { workspace_id } = req.query;

    let queryText = `
      SELECT
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.completed_at,
        c.name as category_name,
        t.created_at
      FROM tasks t
      LEFT JOIN categories c ON c.id = t.category_id
      JOIN task_assignments ta ON ta.task_id = t.id
      WHERE ta.user_id = $1
    `;
    const values = [req.user.id];

    if (workspace_id) {
      queryText += ` AND t.workspace_id = $2`;
      values.push(workspace_id);
    }

    queryText += ` ORDER BY t.created_at DESC`;

    const result = await query(queryText, values);

    // Build CSV
    const header = 'Title,Description,Status,Priority,Due Date,Completed At,Category,Created At';
    const escCsv = (val) => {
      if (val == null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = result.rows.map(t =>
      [
        escCsv(t.title),
        escCsv(t.description),
        escCsv(t.status),
        escCsv(t.priority),
        escCsv(t.due_date ? new Date(t.due_date).toISOString().split('T')[0] : ''),
        escCsv(t.completed_at ? new Date(t.completed_at).toISOString() : ''),
        escCsv(t.category_name),
        escCsv(t.created_at ? new Date(t.created_at).toISOString() : ''),
      ].join(',')
    );

    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="todoria-tasks-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error({ err: error }, 'Export tasks CSV error');
    res.status(500).json({
      status: 'error',
      message: 'Error exporting tasks',
      error: safeError(error)
    });
  }
};

// GDPR data export - returns all user data as JSON
const getDataExport = async (req, res) => {
  try {
    const userId = req.user.id;

    const [userResult, tasksResult, categoriesResult, commentsResult, workspacesResult] = await Promise.all([
      query('SELECT id, email, name, first_name, last_name, created_at FROM users WHERE id = $1', [userId]),
      query(`SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at
             FROM tasks t JOIN task_assignments ta ON ta.task_id = t.id WHERE ta.user_id = $1
             ORDER BY t.created_at DESC`, [userId]),
      query('SELECT id, name, color, workspace_id, created_at FROM categories WHERE created_by = $1 ORDER BY created_at DESC', [userId]),
      query('SELECT id, task_id, content, created_at FROM comments WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
      query(`SELECT w.id, w.name, wm.role, wm.joined_at FROM workspaces w
             JOIN workspace_members wm ON wm.workspace_id = w.id WHERE wm.user_id = $1
             ORDER BY wm.joined_at DESC`, [userId]),
    ]);

    res.json({
      status: 'success',
      data: {
        exportedAt: new Date().toISOString(),
        user: userResult.rows[0],
        tasks: tasksResult.rows,
        categories: categoriesResult.rows,
        comments: commentsResult.rows,
        workspaces: workspacesResult.rows,
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Data export error');
    res.status(500).json({ status: 'error', message: 'Error exporting user data', error: safeError(error) });
  }
};

module.exports = {
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
};
