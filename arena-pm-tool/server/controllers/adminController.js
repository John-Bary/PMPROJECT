// Admin Controller
// Provides dashboard statistics for admin users

const { query } = require('../config/database');

const safeError = (error) => process.env.NODE_ENV === 'production' ? undefined : error.message;

// GET /api/admin/stats - Dashboard statistics
const getStats = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Admin access required' });
    }

    const [users, workspaces, tasks, subscriptions] = await Promise.all([
      query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_30d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_7d,
          COUNT(*) FILTER (WHERE email_verified = true) as verified
        FROM users
      `),
      query(`
        SELECT COUNT(*) as total
        FROM workspaces
      `),
      query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_7d
        FROM tasks
      `),
      query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE plan_id = 'pro') as pro
        FROM subscriptions
      `),
    ]);

    res.json({
      status: 'success',
      data: {
        users: {
          total: parseInt(users.rows[0].total),
          new30d: parseInt(users.rows[0].new_30d),
          new7d: parseInt(users.rows[0].new_7d),
          verified: parseInt(users.rows[0].verified),
        },
        workspaces: {
          total: parseInt(workspaces.rows[0].total),
        },
        tasks: {
          total: parseInt(tasks.rows[0].total),
          completed: parseInt(tasks.rows[0].completed),
          new7d: parseInt(tasks.rows[0].new_7d),
        },
        subscriptions: {
          total: parseInt(subscriptions.rows[0].total),
          active: parseInt(subscriptions.rows[0].active),
          pro: parseInt(subscriptions.rows[0].pro),
        },
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching admin stats',
      error: safeError(error),
    });
  }
};

module.exports = { getStats };
