// User Profile Controller
// Handles user profile, preferences, notifications, and avatar management

const { query } = require('../config/database');
const path = require('path');
const fs = require('fs');

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
    console.error('Get profile error:', error);
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
    console.error('Update profile error:', error);
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
    console.error('Update preferences error:', error);
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
    console.error('Update notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating notification settings',
      error: safeError(error)
    });
  }
};

// Upload avatar
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded.'
      });
    }

    // Get the current avatar to delete it
    const currentUser = await query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );

    if (currentUser.rows.length > 0 && currentUser.rows[0].avatar_url) {
      // Delete old avatar file
      const oldPath = path.join(__dirname, '..', currentUser.rows[0].avatar_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Store the relative path
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

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
    console.error('Upload avatar error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading avatar',
      error: safeError(error)
    });
  }
};

// Delete avatar
const deleteAvatar = async (req, res) => {
  try {
    // Get the current avatar to delete it
    const currentUser = await query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );

    if (currentUser.rows.length > 0 && currentUser.rows[0].avatar_url) {
      // Delete avatar file
      const avatarPath = path.join(__dirname, '..', currentUser.rows[0].avatar_url);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
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
    console.error('Delete avatar error:', error);
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
    console.error('Get my tasks error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching tasks',
      error: safeError(error)
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePreferences,
  updateNotifications,
  uploadAvatar,
  deleteAvatar,
  getMyTasks
};
