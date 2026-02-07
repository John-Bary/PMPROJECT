// Authentication Controller
// Handles user registration, login, and authentication logic

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, getClient } = require('../config/database');
const { sendWelcomeEmail } = require('../utils/emailService');

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

    const result = await client.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      [email.toLowerCase(), hashedPassword, name, role]
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

    // Send welcome email (async, don't block response)
    sendWelcomeEmail({
      to: newUser.email,
      userName: newUser.name
    }).catch(err => {
      console.error(`Failed to send welcome email to ${newUser.email}:`, err.message);
    });

    // Return user data (without password) - token still returned for backward compat
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
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
      'SELECT id, email, password, name, role, avatar_url FROM users WHERE email = $1',
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
          avatarUrl: user.avatar_url
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
      'SELECT id, email, name, role, avatar_url, created_at FROM users WHERE id = $1',
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

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  getAllUsers,
  refreshAccessToken
};
