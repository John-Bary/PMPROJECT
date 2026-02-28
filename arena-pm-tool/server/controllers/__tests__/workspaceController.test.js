const {
  getMyWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  getWorkspaceUsers,
  inviteToWorkspace,
  acceptInvitation,
  getInviteInfo,
  getWorkspaceInvitations,
  cancelInvitation,
  updateMemberRole,
  removeMember,
  getWorkspaceActivity,
  getAuditLog,
} = require('../workspaceController');

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('../../utils/emailQueue', () => ({
  queueWorkspaceInvite: jest.fn().mockResolvedValue(true),
}));
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock-token-abc123'),
  })),
}));

const { query, getClient } = require('../../config/database');
const { queueWorkspaceInvite } = require('../../utils/emailQueue');

describe('Workspace Controller', () => {
  let req, res;
  let mockClient;
  const WORKSPACE_ID = 'ws-uuid-123';

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    req.user = { id: 1, name: 'Test User' };
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    getClient.mockResolvedValue(mockClient);
  });

  // ---------------------------------------------------------------
  // getMyWorkspaces
  // ---------------------------------------------------------------
  describe('getMyWorkspaces', () => {
    it('should return all workspaces for the current user', async () => {
      const mockWorkspaces = [
        {
          id: WORKSPACE_ID,
          name: 'My Workspace',
          owner_id: 1,
          owner_name: 'Test User',
          owner_email: 'test@example.com',
          user_role: 'admin',
          member_count: '3',
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'ws-uuid-456',
          name: 'Other Workspace',
          owner_id: 2,
          owner_name: 'Other User',
          owner_email: 'other@example.com',
          user_role: 'member',
          member_count: '5',
          created_at: new Date('2024-02-01'),
        },
      ];
      query.mockResolvedValue({ rows: mockWorkspaces });

      await getMyWorkspaces(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FROM workspaces w'),
        [1]
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          workspaces: [
            expect.objectContaining({
              id: WORKSPACE_ID,
              name: 'My Workspace',
              ownerId: 1,
              ownerName: 'Test User',
              userRole: 'admin',
              memberCount: 3,
            }),
            expect.objectContaining({
              id: 'ws-uuid-456',
              name: 'Other Workspace',
              userRole: 'member',
              memberCount: 5,
            }),
          ],
        },
      });
    });

    it('should return empty array when user has no workspaces', async () => {
      query.mockResolvedValue({ rows: [] });

      await getMyWorkspaces(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { workspaces: [] },
      });
    });

    it('should return 500 on database error', async () => {
      query.mockRejectedValue(new Error('DB error'));

      await getMyWorkspaces(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error fetching workspaces',
      }));
    });
  });

  // ---------------------------------------------------------------
  // getWorkspaceById
  // ---------------------------------------------------------------
  describe('getWorkspaceById', () => {
    it('should return workspace when user has access', async () => {
      req.params = { id: WORKSPACE_ID };

      // First query: verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Second query: workspace data
      query.mockResolvedValueOnce({
        rows: [{
          id: WORKSPACE_ID,
          name: 'My Workspace',
          owner_id: 1,
          owner_name: 'Test User',
          owner_email: 'test@example.com',
          created_at: new Date('2024-01-01'),
        }],
      });

      await getWorkspaceById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          workspace: expect.objectContaining({
            id: WORKSPACE_ID,
            name: 'My Workspace',
            ownerId: 1,
            userRole: 'admin',
          }),
        },
      });
    });

    it('should return 403 when user does not have access', async () => {
      req.params = { id: WORKSPACE_ID };
      // verifyWorkspaceAccess returns null
      query.mockResolvedValueOnce({ rows: [] });

      await getWorkspaceById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace',
      });
    });

    it('should return 404 when workspace does not exist', async () => {
      req.params = { id: 'nonexistent-id' };
      // verifyWorkspaceAccess returns membership
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // workspace query returns empty
      query.mockResolvedValueOnce({ rows: [] });

      await getWorkspaceById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Workspace not found',
      });
    });
  });

  // ---------------------------------------------------------------
  // createWorkspace
  // ---------------------------------------------------------------
  describe('createWorkspace', () => {
    it('should create workspace with default categories and tasks', async () => {
      req.body = { name: 'New Workspace' };

      // Workspace count check
      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // Insert workspace
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'ws-new', name: 'New Workspace', owner_id: 1, created_at: new Date() }],
      });
      // Insert member
      mockClient.query.mockResolvedValueOnce({});
      // Insert categories
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { id: 10, name: 'To Do' },
          { id: 11, name: 'In Progress' },
          { id: 12, name: 'Completed' },
        ],
      });
      // Insert tasks
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { id: 100, title: 'Invite your team members' },
          { id: 101, title: 'Customize your categories' },
          { id: 102, title: 'Explore the board' },
          { id: 103, title: 'Create your first workspace' },
        ],
      });
      // Insert subtasks
      mockClient.query.mockResolvedValueOnce({});
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      await createWorkspace(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Workspace created successfully',
        data: {
          workspace: expect.objectContaining({
            id: 'ws-new',
            name: 'New Workspace',
            ownerId: 1,
            userRole: 'admin',
          }),
        },
      });
    });

    it('should return 400 when name is missing', async () => {
      req.body = {};

      await createWorkspace(req, res);

      expect(mockClient.release).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Workspace name is required',
      });
    });

    it('should return 400 when name is empty string', async () => {
      req.body = { name: '   ' };

      await createWorkspace(req, res);

      expect(mockClient.release).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Workspace name is required',
      });
    });

    it('should return 400 when name exceeds 100 characters', async () => {
      req.body = { name: 'A'.repeat(101) };

      await createWorkspace(req, res);

      expect(mockClient.release).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Workspace name must be 100 characters or less',
      });
    });

    it('should return 400 when user has reached 10 workspace limit', async () => {
      req.body = { name: 'New Workspace' };
      // Workspace count = 10
      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '10' }] });

      await createWorkspace(req, res);

      expect(mockClient.release).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Maximum number of workspaces (10) reached. Delete an existing workspace first.',
      });
    });

    it('should rollback and return 500 on database error during creation', async () => {
      req.body = { name: 'New Workspace' };
      // Workspace count check
      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // Insert workspace throws
      mockClient.query.mockRejectedValueOnce(new Error('Insert failed'));
      // ROLLBACK
      mockClient.query.mockResolvedValueOnce({});

      await createWorkspace(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error creating workspace',
      }));
    });
  });

  // ---------------------------------------------------------------
  // updateWorkspace
  // ---------------------------------------------------------------
  describe('updateWorkspace', () => {
    it('should update workspace name when user is admin', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { name: 'Updated Name' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Update query
      query.mockResolvedValueOnce({
        rows: [{ id: WORKSPACE_ID, name: 'Updated Name', owner_id: 1, created_at: new Date() }],
      });

      await updateWorkspace(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Workspace updated successfully',
        data: {
          workspace: expect.objectContaining({
            id: WORKSPACE_ID,
            name: 'Updated Name',
          }),
        },
      });
    });

    it('should return 403 when user is not admin', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { name: 'Updated Name' };
      // verifyWorkspaceAccess returns member role
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await updateWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Only workspace admins can update workspace settings',
      });
    });

    it('should return 403 when user has no access', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { name: 'Updated Name' };
      // verifyWorkspaceAccess returns null
      query.mockResolvedValueOnce({ rows: [] });

      await updateWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 when name is empty', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { name: '' };
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      await updateWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Workspace name is required',
      });
    });

    it('should return 400 when name exceeds 100 characters', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { name: 'A'.repeat(101) };
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      await updateWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Workspace name must be 100 characters or less',
      });
    });

    it('should return 404 when workspace does not exist', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { name: 'Updated' };
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Update returns no rows
      query.mockResolvedValueOnce({ rows: [] });

      await updateWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Workspace not found',
      });
    });
  });

  // ---------------------------------------------------------------
  // deleteWorkspace
  // ---------------------------------------------------------------
  describe('deleteWorkspace', () => {
    it('should delete workspace when user is owner', async () => {
      req.params = { id: WORKSPACE_ID };

      // Check workspace exists and owner
      query.mockResolvedValueOnce({ rows: [{ owner_id: 1 }] });

      // Transaction
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ member_count: '3', task_count: '10', category_count: '4' }],
      }); // Counts
      mockClient.query.mockResolvedValueOnce({}); // DELETE
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      await deleteWorkspace(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Workspace deleted successfully',
      });
    });

    it('should return 404 when workspace does not exist', async () => {
      req.params = { id: 'nonexistent' };
      query.mockResolvedValueOnce({ rows: [] });

      await deleteWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Workspace not found',
      });
    });

    it('should return 403 when user is not the owner', async () => {
      req.params = { id: WORKSPACE_ID };
      query.mockResolvedValueOnce({ rows: [{ owner_id: 999 }] });

      await deleteWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Only the workspace owner can delete the workspace',
      });
    });

    it('should rollback on transaction error', async () => {
      req.params = { id: WORKSPACE_ID };
      query.mockResolvedValueOnce({ rows: [{ owner_id: 1 }] });

      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('TX error')); // Counts fail
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await deleteWorkspace(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------------------------------------------------------------
  // getWorkspaceMembers
  // ---------------------------------------------------------------
  describe('getWorkspaceMembers', () => {
    it('should return paginated members list', async () => {
      req.params = { id: WORKSPACE_ID };
      req.query = {};

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });
      // Members query
      query.mockResolvedValueOnce({
        rows: [{
          member_id: 1,
          user_id: 1,
          role: 'admin',
          joined_at: new Date(),
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: null,
        }],
      });

      await getWorkspaceMembers(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          members: [expect.objectContaining({
            memberId: 1,
            userId: 1,
            role: 'admin',
            name: 'Test User',
            email: 'test@example.com',
          })],
          nextCursor: null,
          hasMore: false,
        },
      });
    });

    it('should handle cursor-based pagination with hasMore', async () => {
      req.params = { id: WORKSPACE_ID };
      req.query = { limit: '2', cursor: '5' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });
      // Return 3 rows (limit+1) to indicate hasMore
      query.mockResolvedValueOnce({
        rows: [
          { member_id: 6, user_id: 2, role: 'member', joined_at: new Date(), name: 'User A', email: 'a@test.com', avatar_url: null },
          { member_id: 7, user_id: 3, role: 'member', joined_at: new Date(), name: 'User B', email: 'b@test.com', avatar_url: null },
          { member_id: 8, user_id: 4, role: 'viewer', joined_at: new Date(), name: 'User C', email: 'c@test.com', avatar_url: null },
        ],
      });

      await getWorkspaceMembers(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          members: expect.arrayContaining([
            expect.objectContaining({ memberId: 6 }),
            expect.objectContaining({ memberId: 7 }),
          ]),
          nextCursor: 7,
          hasMore: true,
        }),
      }));
      // Should only return 2 members, not 3
      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.data.members).toHaveLength(2);
    });

    it('should return 403 when user lacks access', async () => {
      req.params = { id: WORKSPACE_ID };
      req.query = {};
      // verifyWorkspaceAccess returns null
      query.mockResolvedValueOnce({ rows: [] });

      await getWorkspaceMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ---------------------------------------------------------------
  // getWorkspaceUsers
  // ---------------------------------------------------------------
  describe('getWorkspaceUsers', () => {
    it('should return workspace users for assignee dropdown', async () => {
      req.query = { workspace_id: WORKSPACE_ID };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });
      // Users query
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, email: 'test@example.com', name: 'Test User', avatar_url: null, workspace_role: 'admin', created_at: new Date() },
          { id: 2, email: 'other@example.com', name: 'Other User', avatar_url: null, workspace_role: 'member', created_at: new Date() },
        ],
      });

      await getWorkspaceUsers(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          users: [
            expect.objectContaining({ id: 1, name: 'Test User', role: 'admin' }),
            expect.objectContaining({ id: 2, name: 'Other User', role: 'member' }),
          ],
        },
      });
    });

    it('should return 400 when workspace_id is missing', async () => {
      req.query = {};

      await getWorkspaceUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'workspace_id is required',
      });
    });

    it('should return 403 when user lacks access', async () => {
      req.query = { workspace_id: WORKSPACE_ID };
      query.mockResolvedValueOnce({ rows: [] });

      await getWorkspaceUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ---------------------------------------------------------------
  // inviteToWorkspace
  // ---------------------------------------------------------------
  describe('inviteToWorkspace', () => {
    it('should create invitation and send email', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { email: 'invite@example.com', role: 'member' };

      // verifyWorkspaceAccess (admin)
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Check existing user
      query.mockResolvedValueOnce({ rows: [] });
      // Check existing invitation
      query.mockResolvedValueOnce({ rows: [] });
      // Insert invitation
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'invite@example.com',
          role: 'member',
          token: 'mock-token-abc123',
          expires_at: new Date('2024-02-01'),
          created_at: new Date(),
        }],
      });
      // Get workspace name
      query.mockResolvedValueOnce({ rows: [{ name: 'My Workspace' }] });

      await inviteToWorkspace(req, res);

      expect(queueWorkspaceInvite).toHaveBeenCalledWith(expect.objectContaining({
        to: 'invite@example.com',
        inviterName: 'Test User',
        workspaceName: 'My Workspace',
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: {
          invitation: expect.objectContaining({
            email: 'invite@example.com',
            role: 'member',
            workspaceName: 'My Workspace',
          }),
        },
      }));
    });

    it('should return 400 when user is already a member', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { email: 'existing@example.com', role: 'member' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Existing user found
      query.mockResolvedValueOnce({ rows: [{ id: 5 }] });
      // Existing member found
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User is already a member of this workspace',
      });
    });

    it('should return 400 when invitation already pending', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { email: 'pending@example.com', role: 'member' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // No existing user
      query.mockResolvedValueOnce({ rows: [] });
      // Existing pending invitation
      query.mockResolvedValueOnce({ rows: [{ id: 99 }] });

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'An invitation is already pending for this email',
      });
    });

    it('should return 403 when user is not admin', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { email: 'invite@example.com' };

      // verifyWorkspaceAccess returns member role
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Only workspace admins can invite members',
      });
    });

    it('should return 400 for invalid email format', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { email: 'not-an-email', role: 'member' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email format',
      });
    });

    it('should return 400 for invalid role', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { email: 'invite@example.com', role: 'superadmin' };

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid role. Must be: admin, member, or viewer',
      });
    });

    it('should still create invitation when email sending fails', async () => {
      req.params = { id: WORKSPACE_ID };
      req.body = { email: 'invite@example.com', role: 'member' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // No existing user
      query.mockResolvedValueOnce({ rows: [] });
      // No existing invitation
      query.mockResolvedValueOnce({ rows: [] });
      // Insert invitation
      query.mockResolvedValueOnce({
        rows: [{
          id: 1, email: 'invite@example.com', role: 'member',
          token: 'mock-token-abc123', expires_at: new Date(), created_at: new Date(),
        }],
      });
      // Get workspace name
      query.mockResolvedValueOnce({ rows: [{ name: 'My Workspace' }] });
      // Email sending fails
      queueWorkspaceInvite.mockRejectedValueOnce(new Error('Email failed'));

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('email delivery pending'),
      }));
    });
  });

  // ---------------------------------------------------------------
  // acceptInvitation
  // ---------------------------------------------------------------
  describe('acceptInvitation', () => {
    it('should accept valid invitation and add user to workspace', async () => {
      req.params = { token: 'valid-token' };
      const futureDate = new Date(Date.now() + 86400000);

      // Find invitation (via client)
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          workspace_id: WORKSPACE_ID,
          email: 'test@example.com',
          role: 'member',
          accepted_at: null,
          expires_at: futureDate,
          workspace_name: 'My Workspace',
        }],
      });
      // Get user email
      mockClient.query.mockResolvedValueOnce({
        rows: [{ email: 'test@example.com' }],
      });
      // Check existing member
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Insert member
      mockClient.query.mockResolvedValueOnce({});
      // Mark invitation accepted
      mockClient.query.mockResolvedValueOnce({});
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});
      // Onboarding progress (uses pool query)
      query.mockResolvedValueOnce({});

      await acceptInvitation(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Successfully joined "My Workspace"',
        data: {
          workspaceId: WORKSPACE_ID,
          workspaceName: 'My Workspace',
          role: 'member',
          needsOnboarding: true,
        },
      });
    });

    it('should return 400 for invalid token', async () => {
      req.params = { token: 'invalid-token' };

      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // No invitation found

      await acceptInvitation(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid invitation token',
      });
    });

    it('should return 400 for expired invitation', async () => {
      req.params = { token: 'expired-token' };
      const pastDate = new Date(Date.now() - 86400000);

      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          workspace_id: WORKSPACE_ID,
          email: 'test@example.com',
          role: 'member',
          accepted_at: null,
          expires_at: pastDate,
          workspace_name: 'My Workspace',
        }],
      });
      // Get user email
      mockClient.query.mockResolvedValueOnce({
        rows: [{ email: 'test@example.com' }],
      });
      // Check existing member
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await acceptInvitation(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'This invitation has expired. Please ask the workspace admin to send a new invitation.',
      });
    });

    it('should return success when user is already a member (idempotent)', async () => {
      req.params = { token: 'valid-token' };
      const futureDate = new Date(Date.now() + 86400000);

      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          workspace_id: WORKSPACE_ID,
          email: 'test@example.com',
          role: 'member',
          accepted_at: null,
          expires_at: futureDate,
          workspace_name: 'My Workspace',
        }],
      });
      // Get user email
      mockClient.query.mockResolvedValueOnce({
        rows: [{ email: 'test@example.com' }],
      });
      // Already a member
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, role: 'admin' }] });

      await acceptInvitation(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: expect.stringContaining('already a member'),
        data: expect.objectContaining({
          needsOnboarding: false,
        }),
      }));
    });

    it('should return 403 when email does not match invitation', async () => {
      req.params = { token: 'valid-token' };
      const futureDate = new Date(Date.now() + 86400000);

      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          workspace_id: WORKSPACE_ID,
          email: 'different@example.com',
          role: 'member',
          accepted_at: null,
          expires_at: futureDate,
          workspace_name: 'My Workspace',
        }],
      });
      // Get user email - does not match invitation
      mockClient.query.mockResolvedValueOnce({
        rows: [{ email: 'test@example.com' }],
      });

      await acceptInvitation(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'This invitation was sent to a different email address',
      });
    });
  });

  // ---------------------------------------------------------------
  // getInviteInfo
  // ---------------------------------------------------------------
  describe('getInviteInfo', () => {
    it('should return valid invitation info', async () => {
      req.params = { token: 'valid-token' };
      const futureDate = new Date(Date.now() + 86400000);

      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          workspace_id: WORKSPACE_ID,
          email: 'invite@example.com',
          role: 'member',
          accepted_at: null,
          expires_at: futureDate,
          workspace_name: 'My Workspace',
          inviter_name: 'Test User',
        }],
      });

      await getInviteInfo(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          inviteStatus: 'valid',
          workspaceName: 'My Workspace',
          inviterName: 'Test User',
          invitedEmail: 'invite@example.com',
          role: 'member',
        },
      });
    });

    it('should return 404 for invalid token', async () => {
      req.params = { token: 'invalid-token' };
      query.mockResolvedValueOnce({ rows: [] });

      await getInviteInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        inviteStatus: 'invalid',
        message: 'This invite link is invalid.',
      });
    });

    it('should return accepted status for already accepted invite', async () => {
      req.params = { token: 'accepted-token' };

      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          workspace_id: WORKSPACE_ID,
          email: 'invite@example.com',
          role: 'member',
          accepted_at: new Date(),
          expires_at: new Date(Date.now() + 86400000),
          workspace_name: 'My Workspace',
          inviter_name: 'Test User',
        }],
      });

      await getInviteInfo(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          inviteStatus: 'accepted',
          workspaceName: 'My Workspace',
          inviterName: 'Test User',
          workspaceId: WORKSPACE_ID,
        },
      });
    });

    it('should return expired status for expired invite', async () => {
      req.params = { token: 'expired-token' };
      const pastDate = new Date(Date.now() - 86400000);

      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          workspace_id: WORKSPACE_ID,
          email: 'invite@example.com',
          role: 'member',
          accepted_at: null,
          expires_at: pastDate,
          workspace_name: 'My Workspace',
          inviter_name: 'Test User',
        }],
      });

      await getInviteInfo(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          inviteStatus: 'expired',
          workspaceName: 'My Workspace',
          inviterName: 'Test User',
        },
      });
    });
  });

  // ---------------------------------------------------------------
  // getWorkspaceInvitations
  // ---------------------------------------------------------------
  describe('getWorkspaceInvitations', () => {
    it('should return pending invitations for admins', async () => {
      req.params = { id: WORKSPACE_ID };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Invitations query
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'invite@example.com',
          role: 'member',
          expires_at: new Date(),
          created_at: new Date(),
          invited_by_name: 'Test User',
        }],
      });

      await getWorkspaceInvitations(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          invitations: [expect.objectContaining({
            id: 1,
            email: 'invite@example.com',
            role: 'member',
            invitedByName: 'Test User',
          })],
        },
      });
    });

    it('should return 403 when user is not admin', async () => {
      req.params = { id: WORKSPACE_ID };
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await getWorkspaceInvitations(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Only workspace admins can view invitations',
      });
    });
  });

  // ---------------------------------------------------------------
  // cancelInvitation
  // ---------------------------------------------------------------
  describe('cancelInvitation', () => {
    it('should cancel invitation when admin', async () => {
      req.params = { id: WORKSPACE_ID, invitationId: '5' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Delete invitation
      query.mockResolvedValueOnce({ rows: [{ id: 5 }] });

      await cancelInvitation(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Invitation cancelled',
      });
    });

    it('should return 404 when invitation not found', async () => {
      req.params = { id: WORKSPACE_ID, invitationId: '999' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Delete returns nothing
      query.mockResolvedValueOnce({ rows: [] });

      await cancelInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invitation not found',
      });
    });

    it('should return 403 when user is not admin', async () => {
      req.params = { id: WORKSPACE_ID, invitationId: '5' };
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await cancelInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ---------------------------------------------------------------
  // updateMemberRole
  // ---------------------------------------------------------------
  describe('updateMemberRole', () => {
    it('should update member role when admin', async () => {
      req.params = { id: WORKSPACE_ID, memberId: '5' };
      req.body = { role: 'admin' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Get member
      query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] });
      // Get workspace owner
      query.mockResolvedValueOnce({ rows: [{ owner_id: 1 }] });
      // Update role
      query.mockResolvedValueOnce({ rows: [{ id: 5, user_id: 2, role: 'admin' }] });

      await updateMemberRole(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Member role updated',
        data: {
          member: {
            memberId: 5,
            userId: 2,
            role: 'admin',
          },
        },
      });
    });

    it('should return 400 for invalid role', async () => {
      req.params = { id: WORKSPACE_ID, memberId: '5' };
      req.body = { role: 'superadmin' };

      await updateMemberRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid role. Must be: admin, member, or viewer',
      });
    });

    it('should return 403 when user is not admin', async () => {
      req.params = { id: WORKSPACE_ID, memberId: '5' };
      req.body = { role: 'member' };

      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await updateMemberRole(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 when trying to change workspace owner role', async () => {
      req.params = { id: WORKSPACE_ID, memberId: '5' };
      req.body = { role: 'member' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Get member (is the owner)
      query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] });
      // Get workspace owner (same as member)
      query.mockResolvedValueOnce({ rows: [{ owner_id: 1 }] });

      await updateMemberRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: "Cannot change workspace owner's role",
      });
    });

    it('should return 404 when member not found', async () => {
      req.params = { id: WORKSPACE_ID, memberId: '999' };
      req.body = { role: 'member' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Member not found
      query.mockResolvedValueOnce({ rows: [] });

      await updateMemberRole(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Member not found',
      });
    });
  });

  // ---------------------------------------------------------------
  // removeMember
  // ---------------------------------------------------------------
  describe('removeMember', () => {
    it('should remove member when admin', async () => {
      req.params = { id: WORKSPACE_ID, memberId: '5' };

      // Get target member
      query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] });
      // verifyWorkspaceAccess (admin check)
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Get workspace owner
      query.mockResolvedValueOnce({ rows: [{ owner_id: 1 }] });
      // Delete member
      query.mockResolvedValueOnce({});

      await removeMember(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Member removed from workspace',
      });
    });

    it('should allow member to remove themselves', async () => {
      req.params = { id: WORKSPACE_ID, memberId: '5' };

      // Get target member (same as req.user.id)
      query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] });
      // verifyWorkspaceAccess (even member can remove self)
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });
      // Get workspace owner (not this user)
      query.mockResolvedValueOnce({ rows: [{ owner_id: 999 }] });
      // Delete member
      query.mockResolvedValueOnce({});

      await removeMember(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'You have left the workspace',
      });
    });

    it('should return 400 when trying to remove workspace owner', async () => {
      req.params = { id: WORKSPACE_ID, memberId: '5' };

      // Get target member (is the owner)
      query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] });
      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Get workspace owner (same as target)
      query.mockResolvedValueOnce({ rows: [{ owner_id: 1 }] });

      await removeMember(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Cannot remove workspace owner. Transfer ownership first or delete the workspace.',
      });
    });

    it('should return 404 when member not found', async () => {
      req.params = { id: WORKSPACE_ID, memberId: '999' };
      query.mockResolvedValueOnce({ rows: [] });

      await removeMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Member not found',
      });
    });

    it('should return 403 when non-admin tries to remove another member', async () => {
      req.params = { id: WORKSPACE_ID, memberId: '5' };

      // Get target member (different from req.user)
      query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] });
      // verifyWorkspaceAccess (not admin)
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await removeMember(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Only workspace admins can remove other members',
      });
    });
  });

  // ---------------------------------------------------------------
  // getWorkspaceActivity
  // ---------------------------------------------------------------
  describe('getWorkspaceActivity', () => {
    it('should return activity feed for workspace', async () => {
      req.params = { id: WORKSPACE_ID };
      req.query = {};

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });
      // Activity query
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          action: 'task.created',
          entity_type: 'task',
          entity_id: 10,
          metadata: { title: 'New Task' },
          created_at: new Date(),
          user_id: 1,
          user_name: 'Test User',
          first_name: 'Test',
          last_name: 'User',
          avatar_url: null,
        }],
      });

      await getWorkspaceActivity(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          activities: [expect.objectContaining({
            id: 1,
            action: 'task.created',
            entityType: 'task',
            entityId: 10,
            user: expect.objectContaining({
              id: 1,
              name: 'Test User',
            }),
          })],
        },
      });
    });

    it('should respect pagination parameters', async () => {
      req.params = { id: WORKSPACE_ID };
      req.query = { limit: '10', offset: '20' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });
      // Activity query
      query.mockResolvedValueOnce({ rows: [] });

      await getWorkspaceActivity(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [WORKSPACE_ID, 10, 20]
      );
    });

    it('should return 403 when user lacks access', async () => {
      req.params = { id: WORKSPACE_ID };
      req.query = {};
      query.mockResolvedValueOnce({ rows: [] });

      await getWorkspaceActivity(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access denied',
      });
    });
  });

  // ---------------------------------------------------------------
  // getAuditLog
  // ---------------------------------------------------------------
  describe('getAuditLog', () => {
    it('should return audit logs for admin users', async () => {
      req.params = { id: WORKSPACE_ID };
      req.query = {};

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Audit logs query
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          action: 'workspace.updated',
          resource_type: 'workspace',
          resource_id: WORKSPACE_ID,
          details: { field: 'name' },
          ip_address: '127.0.0.1',
          created_at: new Date(),
          user_id: 1,
          user_name: 'Test User',
          avatar_url: null,
        }],
      });

      await getAuditLog(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          auditLogs: [expect.objectContaining({
            id: 1,
            action: 'workspace.updated',
            resourceType: 'workspace',
            ipAddress: '127.0.0.1',
            user: expect.objectContaining({
              id: 1,
              name: 'Test User',
            }),
          })],
        },
      });
    });

    it('should return 403 for non-admin users', async () => {
      req.params = { id: WORKSPACE_ID };
      req.query = {};
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await getAuditLog(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Admin access required',
      });
    });

    it('should respect pagination parameters', async () => {
      req.params = { id: WORKSPACE_ID };
      req.query = { limit: '25', offset: '50' };

      // verifyWorkspaceAccess
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Audit logs query
      query.mockResolvedValueOnce({ rows: [] });

      await getAuditLog(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [WORKSPACE_ID, 25, 50]
      );
    });
  });
});
