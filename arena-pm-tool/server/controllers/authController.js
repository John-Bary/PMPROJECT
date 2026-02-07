// Authentication Controller
// Handles user registration, login, and authentication logic

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, getClient } = require('../config/database');
const { sendWelcomeEmail, sendPasswordResetEmail, sendVerificationEmail } = require('../utils/emailService');

// Helper: sanitize error for response (hide internals in production)
const safeError = (error) => process.env.NODE_ENV === 'production' ? undefined : error.message;

// Generate short-lived access token (15 minutes)
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Generate long-lived refresh token (7 days)
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper to set auth cookies
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// Register new user
const register = async (req, res) => {
  const client = await getClient();

  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      client.release();
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email, password, and name.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      client.release();
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.'
      });
    }

    // AUTH-02: Validate password complexity (min 8 chars, uppercase, lowercase, digit)
    if (password.length < 8) {
      client.release();
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long.'
      });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      client.release();
      return res.status(400).json({
        status: 'error',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit.'
      });
    }

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // BIZ-05: Use generic message to prevent account enumeration
    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(400).json({
        status: 'error',
        message: 'Registration failed. Please check your details and try again.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check total user count (limit to 20 users as per requirements)
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) >= 20) {
      client.release();
      return res.status(400).json({
        status: 'error',
        message: 'Maximum number of team members (20) reached. Cannot register new users.'
      });
    }

    // Start transaction for user + workspace creation
    await client.query('BEGIN');

    // Create user (first user becomes admin, rest are members)
    const isFirstUser = parseInt(userCount.rows[0].count) === 0;
    const role = isFirstUser ? 'admin' : 'member';

    // Generate email verification token
    const verificationToken = crypto.randomBytes(48).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await client.query(
      `INSERT INTO users (email, password, name, role, email_verified, email_verification_token, email_verification_expires_at)
       VALUES ($1, $2, $3, $4, false, $5, $6)
       RETURNING id, email, name, role, email_verified, created_at`,
      [email.toLowerCase(), hashedPassword, name, role, hashedVerificationToken, verificationExpiresAt]
    );

    const newUser = result.rows[0];

    // Create personal workspace for the new user
    const workspaceName = `${name}'s Workspace`;
    const workspaceResult = await client.query(
      'INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id, name',
      [workspaceName, newUser.id]
    );

    const workspace = workspaceResult.rows[0];

    // Add user as admin of their personal workspace
    await client.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
      [workspace.id, newUser.id, 'admin']
    );

    await client.query('COMMIT');

    // Generate tokens
    const token = generateToken(newUser.id, newUser.email, newUser.role);
    const refreshToken = generateRefreshToken(newUser.id);

    // Set httpOnly cookies
    setAuthCookies(res, token, refreshToken);

    // Send verification email (async, don't block response)
    const clientUrl = (process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS?.split(',')[0] || 'https://www.todoria.com').replace(/\/+$/, '');
    const verificationUrl = `${clientUrl}/verify-email?token=${verificationToken}`;

    sendVerificationEmail({
      to: newUser.email,
      userName: newUser.name,
      verificationUrl
    }).catch(err => {
      console.error(`Failed to send verification email to ${newUser.email}:`, err.message);
    });

    // Return user data (without password) - token still returned for backward compat
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          emailVerified: newUser.email_verified,
          createdAt: newUser.created_at
        },
        workspace: {
          id: workspace.id,
          name: workspace.name
        },
        token
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error registering user',
      error: safeError(error)
    });
  } finally {
    client.release();
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password.'
      });
    }

    // Find user by email
    const result = await query(
      'SELECT id, email, password, name, role, avatar_url, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    // Generate tokens
    const token = generateToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Set httpOnly cookies
    setAuthCookies(res, token, refreshToken);

    // Return user data (without password) - token still returned for backward compat
    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatar_url,
          emailVerified: user.email_verified
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error logging in',
      error: safeError(error)
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    // Clear both auth cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error logging out',
      error: safeError(error)
    });
  }
};

// Get current user (protected route)
const getCurrentUser = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    const result = await query(
      'SELECT id, email, name, role, avatar_url, email_verified, created_at FROM users WHERE id = $1',
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
          role: user.role,
          avatarUrl: user.avatar_url,
          emailVerified: user.email_verified,
          createdAt: user.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user data',
      error: safeError(error)
    });
  }
};

// Get all users (protected route)
// AUTHZ-10: Scope to workspace when workspace_id query param is provided
const getAllUsers = async (req, res) => {
  try {
    const { workspace_id } = req.query;

    let result;
    if (workspace_id) {
      // Scoped to workspace members only
      result = await query(
        `SELECT u.id, u.email, u.name, u.role, u.avatar_url, u.created_at
         FROM users u
         JOIN workspace_members wm ON u.id = wm.user_id
         WHERE wm.workspace_id = $1
         ORDER BY u.created_at ASC`,
        [workspace_id]
      );
    } else {
      result = await query(
        'SELECT id, email, name, role, avatar_url, created_at FROM users ORDER BY created_at ASC'
      );
    }

    res.json({
      status: 'success',
      data: {
        users: result.rows.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users',
      error: safeError(error)
    });
  }
};

// Refresh access token using refresh token cookie
const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'No refresh token provided'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token type'
      });
    }

    // Fetch current user data
    const result = await query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Issue new access token
    const newAccessToken = generateToken(user.id, user.email, user.role);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    res.json({
      status: 'success',
      data: { token: newAccessToken }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token. Please login again.'
      });
    }
    console.error('Refresh token error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error refreshing token'
    });
  }
};

// Forgot password - send reset email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide your email address.'
      });
    }

    // Always return success to prevent email enumeration
    const successResponse = {
      status: 'success',
      message: 'If an account with that email exists, we sent a password reset link.'
    };

    const result = await query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.json(successResponse);
    }

    const user = result.rows[0];

    // Generate a secure random token
    const resetToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store hashed token in DB (don't store plaintext)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2 WHERE id = $3',
      [hashedToken, expiresAt, user.id]
    );

    // Build reset URL
    const clientUrl = (process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS?.split(',')[0] || 'https://www.todoria.com').replace(/\/+$/, '');
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    // Send email (async, don't block response)
    sendPasswordResetEmail({
      to: user.email,
      userName: user.name || user.email,
      resetUrl
    }).catch(err => {
      console.error(`Failed to send password reset email to ${user.email}:`, err.message);
    });

    res.json(successResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing password reset request',
      error: safeError(error)
    });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Token and new password are required.'
      });
    }

    // Validate password complexity
    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long.'
      });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit.'
      });
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const result = await query(
      'SELECT id, email, name FROM users WHERE password_reset_token = $1 AND password_reset_expires_at > NOW()',
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset link. Please request a new one.'
      });
    }

    const user = result.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    await query(
      'UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires_at = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({
      status: 'success',
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error resetting password',
      error: safeError(error)
    });
  }
};

// Verify email with token
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification token is required.'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const result = await query(
      'SELECT id, email, name FROM users WHERE email_verification_token = $1 AND email_verification_expires_at > NOW()',
      [hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification link. Please request a new one.'
      });
    }

    const user = result.rows[0];

    await query(
      'UPDATE users SET email_verified = true, email_verification_token = NULL, email_verification_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    // Send welcome email now that they're verified
    sendWelcomeEmail({
      to: user.email,
      userName: user.name
    }).catch(err => {
      console.error(`Failed to send welcome email to ${user.email}:`, err.message);
    });

    res.json({
      status: 'success',
      message: 'Email verified successfully!'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error verifying email',
      error: safeError(error)
    });
  }
};

// Resend verification email (requires auth)
const resendVerificationEmail = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT id, email, name, email_verified FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.json({ status: 'success', message: 'Email is already verified.' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(48).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      'UPDATE users SET email_verification_token = $1, email_verification_expires_at = $2 WHERE id = $3',
      [hashedToken, expiresAt, user.id]
    );

    const clientUrl = (process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS?.split(',')[0] || 'https://www.todoria.com').replace(/\/+$/, '');
    const verificationUrl = `${clientUrl}/verify-email?token=${verificationToken}`;

    await sendVerificationEmail({
      to: user.email,
      userName: user.name,
      verificationUrl
    });

    res.json({
      status: 'success',
      message: 'Verification email sent. Please check your inbox.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error sending verification email',
      error: safeError(error)
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  getAllUsers,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail
};
