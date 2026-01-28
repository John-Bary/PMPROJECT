// Workspace Controller
// Handles all workspace-related operations including CRUD, members, and invitations

const { query, getClient } = require('../config/database');
const crypto = require('crypto');

// Helper: Generate secure random token
const generateToken = () => crypto.randomBytes(32).toString('hex');

// Helper: Verify user has access to workspace
const verifyWorkspaceAccess = async (userId, workspaceId) => {
  const result = await query(
    `SELECT role FROM workspace_members
     WHERE user_id = $1 AND workspace_id = $2`,
    [userId, workspaceId]
  );
  return result.rows[0] || null;
};

// Get all workspaces for current user
const getMyWorkspaces = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        w.id, w.name, w.owner_id, w.created_at,
        wm.role as user_role,
        owner.name as owner_name,
        owner.email as owner_email,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count
      FROM workspaces w
      INNER JOIN workspace_members wm ON w.id = wm.workspace_id
      LEFT JOIN users owner ON w.owner_id = owner.id
      WHERE wm.user_id = $1
      ORDER BY w.created_at ASC
    `, [req.user.id]);

    res.json({
      status: 'success',
      data: {
        workspaces: result.rows.map(ws => ({
          id: ws.id,
          name: ws.name,
          ownerId: ws.owner_id,
          ownerName: ws.owner_name,
          ownerEmail: ws.owner_email,
          userRole: ws.user_role,
          memberCount: parseInt(ws.member_count),
          createdAt: ws.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching workspaces',
      error: error.message
    });
  }
};

// Get single workspace by ID
const getWorkspaceById = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user has access
    const membership = await verifyWorkspaceAccess(req.user.id, id);
    if (!membership) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    }

    const result = await query(`
      SELECT
        w.id, w.name, w.owner_id, w.created_at,
        owner.name as owner_name,
        owner.email as owner_email
      FROM workspaces w
      LEFT JOIN users owner ON w.owner_id = owner.id
      WHERE w.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Workspace not found'
      });
    }

    const ws = result.rows[0];

    res.json({
      status: 'success',
      data: {
        workspace: {
          id: ws.id,
          name: ws.name,
          ownerId: ws.owner_id,
          ownerName: ws.owner_name,
          ownerEmail: ws.owner_email,
          userRole: membership.role,
          createdAt: ws.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching workspace',
      error: error.message
    });
  }
};

// Create new workspace
const createWorkspace = async (req, res) => {
  const client = await getClient();

  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Workspace name is required'
      });
    }

    await client.query('BEGIN');

    // Create workspace
    const workspaceResult = await client.query(`
      INSERT INTO workspaces (name, owner_id)
      VALUES ($1, $2)
      RETURNING id, name, owner_id, created_at
    `, [name.trim(), req.user.id]);

    const workspace = workspaceResult.rows[0];

    // Add creator as admin member
    await client.query(`
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, 'admin')
    `, [workspace.id, req.user.id]);

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Workspace created successfully',
      data: {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          ownerId: workspace.owner_id,
          userRole: 'admin',
          createdAt: workspace.created_at
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create workspace error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating workspace',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Update workspace
const updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Verify user is admin
    const membership = await verifyWorkspaceAccess(req.user.id, id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only workspace admins can update workspace settings'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Workspace name is required'
      });
    }

    const result = await query(`
      UPDATE workspaces
      SET name = $1
      WHERE id = $2
      RETURNING id, name, owner_id, created_at
    `, [name.trim(), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Workspace not found'
      });
    }

    const workspace = result.rows[0];

    res.json({
      status: 'success',
      message: 'Workspace updated successfully',
      data: {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          ownerId: workspace.owner_id,
          createdAt: workspace.created_at
        }
      }
    });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating workspace',
      error: error.message
    });
  }
};

// Delete workspace
const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if workspace exists and user is owner
    const workspaceResult = await query(
      'SELECT owner_id FROM workspaces WHERE id = $1',
      [id]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Workspace not found'
      });
    }

    if (workspaceResult.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the workspace owner can delete the workspace'
      });
    }

    // Delete workspace (cascades to members, tasks, categories via FK)
    await query('DELETE FROM workspaces WHERE id = $1', [id]);

    res.json({
      status: 'success',
      message: 'Workspace deleted successfully'
    });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting workspace',
      error: error.message
    });
  }
};

// Get workspace members
const getWorkspaceMembers = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user has access
    const membership = await verifyWorkspaceAccess(req.user.id, id);
    if (!membership) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    }

    const result = await query(`
      SELECT
        wm.id as member_id,
        wm.user_id,
        wm.role,
        wm.joined_at,
        u.name,
        u.email,
        u.avatar_url
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = $1
      ORDER BY wm.role, u.name
    `, [id]);

    res.json({
      status: 'success',
      data: {
        members: result.rows.map(m => ({
          memberId: m.member_id,
          userId: m.user_id,
          role: m.role,
          joinedAt: m.joined_at,
          name: m.name,
          email: m.email,
          avatarUrl: m.avatar_url
        }))
      }
    });
  } catch (error) {
    console.error('Get workspace members error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching workspace members',
      error: error.message
    });
  }
};

// Get workspace users (for assignee dropdown - returns members of workspace)
const getWorkspaceUsers = async (req, res) => {
  try {
    const { workspace_id } = req.query;

    if (!workspace_id) {
      return res.status(400).json({
        status: 'error',
        message: 'workspace_id is required'
      });
    }

    // Verify user has access
    const membership = await verifyWorkspaceAccess(req.user.id, workspace_id);
    if (!membership) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    }

    const result = await query(`
      SELECT
        u.id, u.email, u.name, u.avatar_url, u.created_at,
        wm.role as workspace_role
      FROM users u
      JOIN workspace_members wm ON u.id = wm.user_id
      WHERE wm.workspace_id = $1
      ORDER BY wm.role, u.name
    `, [workspace_id]);

    res.json({
      status: 'success',
      data: {
        users: result.rows.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatar_url,
          role: user.workspace_role,
          createdAt: user.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get workspace users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching workspace users',
      error: error.message
    });
  }
};

// Invite user to workspace
const inviteToWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role = 'member' } = req.body;

    // Validate role
    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be: admin, member, or viewer'
      });
    }

    // Verify user is admin
    const membership = await verifyWorkspaceAccess(req.user.id, id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only workspace admins can invite members'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format'
      });
    }

    // Check if user already exists and is already a member
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      const existingMember = await query(
        'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [id, existingUser.rows[0].id]
      );

      if (existingMember.rows.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'User is already a member of this workspace'
        });
      }
    }

    // Check for existing pending invitation
    const existingInvite = await query(
      `SELECT id FROM workspace_invitations
       WHERE workspace_id = $1 AND email = $2 AND accepted_at IS NULL AND expires_at > NOW()`,
      [id, email.toLowerCase()]
    );

    if (existingInvite.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'An invitation is already pending for this email'
      });
    }

    // Create invitation
    const token = generateToken();
    const result = await query(`
      INSERT INTO workspace_invitations (workspace_id, email, role, invited_by, token)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, role, token, expires_at, created_at
    `, [id, email.toLowerCase(), role, req.user.id, token]);

    const invitation = result.rows[0];

    // Get workspace name for response
    const workspaceResult = await query(
      'SELECT name FROM workspaces WHERE id = $1',
      [id]
    );

    res.status(201).json({
      status: 'success',
      message: `Invitation sent to ${email}`,
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          token: invitation.token,
          expiresAt: invitation.expires_at,
          createdAt: invitation.created_at,
          workspaceName: workspaceResult.rows[0]?.name
        }
      }
    });
  } catch (error) {
    console.error('Invite to workspace error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating invitation',
      error: error.message
    });
  }
};

// Accept invitation
const acceptInvitation = async (req, res) => {
  const client = await getClient();

  try {
    const { token } = req.params;

    await client.query('BEGIN');

    // Find valid invitation
    const inviteResult = await client.query(`
      SELECT
        wi.id, wi.workspace_id, wi.email, wi.role,
        w.name as workspace_name
      FROM workspace_invitations wi
      JOIN workspaces w ON wi.workspace_id = w.id
      WHERE wi.token = $1
        AND wi.accepted_at IS NULL
        AND wi.expires_at > NOW()
    `, [token]);

    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired invitation'
      });
    }

    const invitation = inviteResult.rows[0];

    // Verify the current user's email matches the invitation
    const userResult = await client.query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows[0].email.toLowerCase() !== invitation.email.toLowerCase()) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        status: 'error',
        message: 'This invitation was sent to a different email address'
      });
    }

    // Check if already a member
    const existingMember = await client.query(
      'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [invitation.workspace_id, req.user.id]
    );

    if (existingMember.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'You are already a member of this workspace'
      });
    }

    // Add user to workspace
    await client.query(`
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, $3)
    `, [invitation.workspace_id, req.user.id, invitation.role]);

    // Mark invitation as accepted
    await client.query(`
      UPDATE workspace_invitations
      SET accepted_at = NOW()
      WHERE id = $1
    `, [invitation.id]);

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: `Successfully joined "${invitation.workspace_name}"`,
      data: {
        workspaceId: invitation.workspace_id,
        workspaceName: invitation.workspace_name,
        role: invitation.role
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Accept invitation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error accepting invitation',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get pending invitations for workspace
const getWorkspaceInvitations = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    const membership = await verifyWorkspaceAccess(req.user.id, id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only workspace admins can view invitations'
      });
    }

    const result = await query(`
      SELECT
        wi.id, wi.email, wi.role, wi.expires_at, wi.created_at,
        u.name as invited_by_name
      FROM workspace_invitations wi
      LEFT JOIN users u ON wi.invited_by = u.id
      WHERE wi.workspace_id = $1
        AND wi.accepted_at IS NULL
        AND wi.expires_at > NOW()
      ORDER BY wi.created_at DESC
    `, [id]);

    res.json({
      status: 'success',
      data: {
        invitations: result.rows.map(inv => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          expiresAt: inv.expires_at,
          createdAt: inv.created_at,
          invitedByName: inv.invited_by_name
        }))
      }
    });
  } catch (error) {
    console.error('Get workspace invitations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching invitations',
      error: error.message
    });
  }
};

// Cancel/delete invitation
const cancelInvitation = async (req, res) => {
  try {
    const { id, invitationId } = req.params;

    // Verify user is admin
    const membership = await verifyWorkspaceAccess(req.user.id, id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only workspace admins can cancel invitations'
      });
    }

    const result = await query(
      'DELETE FROM workspace_invitations WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [invitationId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Invitation not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Invitation cancelled'
    });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error cancelling invitation',
      error: error.message
    });
  }
};

// Update member role
const updateMemberRole = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Must be: admin, member, or viewer'
      });
    }

    // Verify user is admin
    const membership = await verifyWorkspaceAccess(req.user.id, id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only workspace admins can change member roles'
      });
    }

    // Get the member being updated
    const memberResult = await query(
      'SELECT user_id FROM workspace_members WHERE id = $1 AND workspace_id = $2',
      [memberId, id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found'
      });
    }

    // Check if trying to change workspace owner's role
    const workspaceResult = await query(
      'SELECT owner_id FROM workspaces WHERE id = $1',
      [id]
    );

    if (memberResult.rows[0].user_id === workspaceResult.rows[0].owner_id && role !== 'admin') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot change workspace owner\'s role'
      });
    }

    // Update role
    const result = await query(`
      UPDATE workspace_members
      SET role = $1
      WHERE id = $2 AND workspace_id = $3
      RETURNING id, user_id, role
    `, [role, memberId, id]);

    res.json({
      status: 'success',
      message: 'Member role updated',
      data: {
        member: {
          memberId: result.rows[0].id,
          userId: result.rows[0].user_id,
          role: result.rows[0].role
        }
      }
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating member role',
      error: error.message
    });
  }
};

// Remove member from workspace
const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    // Get the member being removed
    const memberResult = await query(
      'SELECT user_id FROM workspace_members WHERE id = $1 AND workspace_id = $2',
      [memberId, id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found'
      });
    }

    const targetUserId = memberResult.rows[0].user_id;

    // Check if user is removing themselves or is admin
    const isRemovingSelf = targetUserId === req.user.id;
    const membership = await verifyWorkspaceAccess(req.user.id, id);

    if (!isRemovingSelf && (!membership || membership.role !== 'admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'Only workspace admins can remove other members'
      });
    }

    // Check if trying to remove workspace owner
    const workspaceResult = await query(
      'SELECT owner_id FROM workspaces WHERE id = $1',
      [id]
    );

    if (targetUserId === workspaceResult.rows[0].owner_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot remove workspace owner. Transfer ownership first or delete the workspace.'
      });
    }

    // Remove member
    await query(
      'DELETE FROM workspace_members WHERE id = $1 AND workspace_id = $2',
      [memberId, id]
    );

    res.json({
      status: 'success',
      message: isRemovingSelf ? 'You have left the workspace' : 'Member removed from workspace'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error removing member',
      error: error.message
    });
  }
};

// Export helper for use in other controllers
module.exports = {
  getMyWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  getWorkspaceUsers,
  inviteToWorkspace,
  acceptInvitation,
  getWorkspaceInvitations,
  cancelInvitation,
  updateMemberRole,
  removeMember,
  verifyWorkspaceAccess
};
