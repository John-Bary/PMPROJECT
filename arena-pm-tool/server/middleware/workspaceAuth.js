// Workspace Authorization Middleware
// Provides role-based access control for workspace operations

const { query } = require('../config/database');

// Helper: Get workspace ID from request (body, query, or params)
const getWorkspaceIdFromRequest = (req) => {
  return req.body?.workspace_id ||
         req.query?.workspace_id ||
         req.params?.workspaceId ||
         req.params?.id;
};

// Middleware: Require workspace membership
// Verifies user is a member of the specified workspace
const requireWorkspaceMember = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceIdFromRequest(req);

    if (!workspaceId) {
      return res.status(400).json({
        status: 'error',
        message: 'workspace_id is required'
      });
    }

    const result = await query(
      `SELECT role FROM workspace_members
       WHERE user_id = $1 AND workspace_id = $2`,
      [req.user.id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    }

    // Attach workspace info to request
    req.workspace = {
      id: workspaceId,
      role: result.rows[0].role
    };

    next();
  } catch (error) {
    console.error('Workspace auth error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error verifying workspace access',
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

// Middleware factory: Require specific workspace roles
// Usage: requireWorkspaceRole('admin', 'member') - allows admin OR member
const requireWorkspaceRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const workspaceId = getWorkspaceIdFromRequest(req);

      if (!workspaceId) {
        return res.status(400).json({
          status: 'error',
          message: 'workspace_id is required'
        });
      }

      const result = await query(
        `SELECT role FROM workspace_members
         WHERE user_id = $1 AND workspace_id = $2`,
        [req.user.id, workspaceId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have access to this workspace'
        });
      }

      const userRole = result.rows[0].role;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          status: 'error',
          message: `This action requires one of these roles: ${allowedRoles.join(', ')}. Your role: ${userRole}`
        });
      }

      // Attach workspace info to request
      req.workspace = {
        id: workspaceId,
        role: userRole
      };

      next();
    } catch (error) {
      console.error('Workspace role auth error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error verifying workspace role',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  };
};

// Middleware: Require admin role
const requireWorkspaceAdmin = requireWorkspaceRole('admin');

// Middleware: Require editor role (admin or member - not viewer)
const requireWorkspaceEditor = requireWorkspaceRole('admin', 'member');

// Middleware: Check if user can edit (for optional validation without blocking)
// Attaches canEdit flag to request without blocking the request
const checkWorkspaceEditPermission = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceIdFromRequest(req);

    if (!workspaceId) {
      req.workspace = { canEdit: false };
      return next();
    }

    const result = await query(
      `SELECT role FROM workspace_members
       WHERE user_id = $1 AND workspace_id = $2`,
      [req.user.id, workspaceId]
    );

    if (result.rows.length === 0) {
      req.workspace = { canEdit: false };
    } else {
      const role = result.rows[0].role;
      req.workspace = {
        id: workspaceId,
        role: role,
        canEdit: role === 'admin' || role === 'member',
        isAdmin: role === 'admin',
        isViewer: role === 'viewer'
      };
    }

    next();
  } catch (error) {
    console.error('Check edit permission error:', error);
    req.workspace = { canEdit: false };
    next();
  }
};

// Helper: Verify workspace access (can be used in controllers)
const verifyWorkspaceAccess = async (userId, workspaceId) => {
  const result = await query(
    `SELECT role FROM workspace_members
     WHERE user_id = $1 AND workspace_id = $2`,
    [userId, workspaceId]
  );
  return result.rows[0] || null;
};

// Helper: Check if user can edit in workspace
const canUserEdit = async (userId, workspaceId) => {
  const membership = await verifyWorkspaceAccess(userId, workspaceId);
  return membership && (membership.role === 'admin' || membership.role === 'member');
};

module.exports = {
  requireWorkspaceMember,
  requireWorkspaceRole,
  requireWorkspaceAdmin,
  requireWorkspaceEditor,
  checkWorkspaceEditPermission,
  verifyWorkspaceAccess,
  canUserEdit
};
