// Authentication Controller
// Handles user registration, login, and authentication logic

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, getClient } = require('../config/database');
const { sendWelcomeEmail } = require('../utils/emailService');

// Helper: sanitize error for response (hide internals in production)
const safeError = (error) => process.env.NODE_ENV === 'production' ? undefined : error.message;

// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
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

    // Generate JWT token
    const token = generateToken(newUser.id, newUser.email, newUser.role);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Send welcome email (async, don't block response)
    sendWelcomeEmail({
      to: newUser.email,
      userName: newUser.name
    }).catch(err => {
      console.error(`Failed to send welcome email to ${newUser.email}:`, err.message);
    });

    // Return user data (without password)
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

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return user data (without password)
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
    // Clear the token cookie
    res.clearCookie('token');

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

// Start a demo session with sample data
const startDemo = async (req, res) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Create a unique demo user
    const timestamp = Date.now();
    const demoEmail = `demo-${timestamp}@todoria.demo`;
    const demoName = 'Demo User';
    const demoPassword = await bcrypt.hash(`demo-${timestamp}-pwd`, 10);

    const userResult = await client.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      [demoEmail, demoPassword, demoName, 'member']
    );
    const demoUser = userResult.rows[0];

    // Create demo workspace
    const workspaceResult = await client.query(
      'INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id, name',
      ['Demo Workspace', demoUser.id]
    );
    const workspace = workspaceResult.rows[0];

    // Add user as admin of demo workspace
    await client.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
      [workspace.id, demoUser.id, 'admin']
    );

    // Seed categories
    const categoryColors = [
      { name: 'To Do', color: '#6b7280' },
      { name: 'In Progress', color: '#ef4444' },
      { name: 'Review', color: '#f59e0b' },
      { name: 'Completed', color: '#22c55e' },
    ];

    const categoryIds = {};
    for (let i = 0; i < categoryColors.length; i++) {
      const cat = categoryColors[i];
      const catResult = await client.query(
        'INSERT INTO categories (name, color, position, created_by, workspace_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [cat.name, cat.color, i, demoUser.id, workspace.id]
      );
      categoryIds[cat.name] = catResult.rows[0].id;
    }

    // Helper to create a task
    const createDemoTask = async (title, description, categoryName, priority, status, dueOffset, position) => {
      const dueDate = dueOffset !== null
        ? new Date(Date.now() + dueOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null;
      const completedAt = status === 'completed' ? new Date() : null;
      const result = await client.query(
        `INSERT INTO tasks (title, description, category_id, priority, status, due_date, completed_at, position, created_by, workspace_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [title, description, categoryIds[categoryName], priority, status, dueDate, completedAt, position, demoUser.id, workspace.id]
      );
      // Assign demo user
      await client.query(
        'INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2)',
        [result.rows[0].id, demoUser.id]
      );
      return result.rows[0].id;
    };

    // Seed tasks — To Do
    await createDemoTask(
      'Design landing page mockups',
      'Create high-fidelity mockups for the new landing page redesign.',
      'To Do', 'high', 'todo', 5, 0
    );
    await createDemoTask(
      'Write API documentation',
      'Document all REST endpoints with request/response examples.',
      'To Do', 'medium', 'todo', 10, 1
    );
    await createDemoTask(
      'Set up error monitoring',
      'Integrate error tracking service for production monitoring.',
      'To Do', 'low', 'todo', 14, 2
    );

    // Seed tasks — In Progress (one with subtasks)
    const parentTaskId = await createDemoTask(
      'Implement user authentication',
      'Build login, registration, and session management flows.',
      'In Progress', 'high', 'todo', 3, 0
    );
    await createDemoTask(
      'Build notification system',
      'Create in-app and email notification infrastructure.',
      'In Progress', 'medium', 'todo', 7, 1
    );

    // Subtasks for "Implement user authentication"
    const subtaskData = [
      { title: 'Set up JWT token flow', status: 'completed' },
      { title: 'Build login form UI', status: 'completed' },
      { title: 'Add password reset endpoint', status: 'todo' },
    ];
    for (let i = 0; i < subtaskData.length; i++) {
      const s = subtaskData[i];
      await client.query(
        `INSERT INTO tasks (title, category_id, priority, status, position, parent_task_id, created_by, workspace_id, completed_at)
         VALUES ($1, $2, 'medium', $3, $4, $5, $6, $7, $8)`,
        [s.title, categoryIds['In Progress'], s.status, i, parentTaskId, demoUser.id, workspace.id,
         s.status === 'completed' ? new Date() : null]
      );
    }

    // Seed tasks — Review
    await createDemoTask(
      'Code review: payment integration',
      'Review PR #42 for the Stripe payment integration.',
      'Review', 'urgent', 'todo', 1, 0
    );
    await createDemoTask(
      'QA test mobile responsiveness',
      'Test all views on iOS and Android devices.',
      'Review', 'medium', 'todo', 4, 1
    );

    // Seed tasks — Completed
    await createDemoTask(
      'Set up CI/CD pipeline',
      'Configure automated build, test, and deploy workflows.',
      'Completed', 'high', 'completed', -2, 0
    );
    await createDemoTask(
      'Database schema design',
      'Design and implement the initial database schema.',
      'Completed', 'high', 'completed', -5, 1
    );

    await client.query('COMMIT');

    // Generate short-lived token (24h for demo)
    const token = jwt.sign(
      { userId: demoUser.id, email: demoUser.email, role: demoUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      status: 'success',
      message: 'Demo session started',
      data: {
        user: {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          createdAt: demoUser.created_at,
        },
        workspace: {
          id: workspace.id,
          name: workspace.name,
        },
        token,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Demo start error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error starting demo session',
      error: safeError(error),
    });
  } finally {
    client.release();
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  getAllUsers,
  startDemo
};
