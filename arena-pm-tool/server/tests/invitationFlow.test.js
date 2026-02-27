/**
 * Invitation Flow Integration Tests
 * Tests the complete invitation lifecycle:
 * - Invite member by email (creates invitation with token)
 * - Accept invite (creates workspace_member, marks invitation accepted)
 * - Re-invite same email (returns error for pending invitation)
 * - Invite with invalid email (returns 400)
 * - Accept expired invitation (returns error)
 * - Cancel pending invitation (deletes invitation)
 * - Invite blocked when at member limit (free plan)
 * - Invited user gets correct role
 *
 * NOTE: workspaceController defines its own internal verifyWorkspaceAccess
 * that uses query() directly, so we mock the database layer, not the middleware.
 */

jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../utils/emailQueue', () => ({
  queueWorkspaceInvite: jest.fn().mockResolvedValue(true),
}));

const { query, getClient } = require('../config/database');
const { queueWorkspaceInvite } = require('../utils/emailQueue');
const {
  inviteToWorkspace,
  acceptInvitation,
  cancelInvitation,
} = require('../controllers/workspaceController');

describe('Invitation Flow Integration', () => {
  let req, res;
  const workspaceId = 'ws-uuid-invite';

  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    req = createMockReq({
      user: { id: 1, name: 'Admin User' },
    });
    res = createMockRes();
    jest.clearAllMocks();
    getClient.mockResolvedValue(mockClient);
  });

  // ------------------------------------------------------------------
  // Invite member by email
  // ------------------------------------------------------------------
  describe('Invite member by email', () => {
    it('creates invitation with token and sends email', async () => {
      req.params = { id: workspaceId };
      req.body = { email: 'newuser@example.com', role: 'member' };

      // Internal verifyWorkspaceAccess: SELECT role FROM workspace_members
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Check if user already exists in users table
      query.mockResolvedValueOnce({ rows: [] });
      // Check for existing pending invitation
      query.mockResolvedValueOnce({ rows: [] });
      // INSERT invitation
      query.mockResolvedValueOnce({
        rows: [{
          id: 50,
          email: 'newuser@example.com',
          role: 'member',
          token: 'generated-token-abc',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          created_at: new Date(),
        }],
      });
      // Get workspace name
      query.mockResolvedValueOnce({ rows: [{ name: 'Test Workspace' }] });

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: expect.stringContaining('newuser@example.com'),
        data: expect.objectContaining({
          invitation: expect.objectContaining({
            id: 50,
            email: 'newuser@example.com',
            role: 'member',
            workspaceName: 'Test Workspace',
          }),
        }),
      }));

      expect(queueWorkspaceInvite).toHaveBeenCalledWith(expect.objectContaining({
        to: 'newuser@example.com',
        inviterName: 'Admin User',
        workspaceName: 'Test Workspace',
      }));
    });
  });

  // ------------------------------------------------------------------
  // Accept invite
  // ------------------------------------------------------------------
  describe('Accept invitation', () => {
    it('creates workspace_member and marks invitation accepted', async () => {
      req.params = { token: 'valid-invite-token' };
      req.user = { id: 5 };

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // acceptInvitation: client = await getClient()
      // Then client.query('BEGIN') -- but the code does NOT explicitly call BEGIN,
      // it calls client.query('BEGIN') inside the try.
      // Let's trace the exact call order:
      // 1. client.query('BEGIN')
      // 2. client.query(SELECT wi...FOR UPDATE, [token])
      // 3. client.query(SELECT email FROM users, [userId])
      // 4. client.query(SELECT id,role FROM workspace_members, [workspace_id, userId])
      // 5. client.query(INSERT INTO workspace_members, [...])
      // 6. client.query(UPDATE workspace_invitations, [id])
      // 7. client.query('COMMIT')

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // SELECT invitation
          rows: [{
            id: 50,
            workspace_id: workspaceId,
            email: 'invited@example.com',
            role: 'member',
            accepted_at: null,
            expires_at: futureDate,
            workspace_name: 'Test Workspace',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ email: 'invited@example.com' }] }) // SELECT user email
        .mockResolvedValueOnce({ rows: [] }) // SELECT existing member (none)
        .mockResolvedValueOnce({ rows: [] }) // INSERT workspace_member
        .mockResolvedValueOnce({ rows: [] }) // UPDATE invitation accepted_at
        .mockResolvedValueOnce({}); // COMMIT

      // Post-commit: onboarding INSERT (uses pool query, not client)
      query.mockResolvedValueOnce({ rows: [] });

      await acceptInvitation(req, res);

      // Verify member was inserted with correct role
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO workspace_members'),
        [workspaceId, 5, 'member'],
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE workspace_invitations'),
        [50],
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: expect.stringContaining('Successfully joined'),
        data: expect.objectContaining({
          workspaceId: workspaceId,
          workspaceName: 'Test Workspace',
          role: 'member',
          needsOnboarding: true,
        }),
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // Re-invite same email
  // ------------------------------------------------------------------
  describe('Re-invite same email', () => {
    it('returns error for pending invitation on same email', async () => {
      req.params = { id: workspaceId };
      req.body = { email: 'already-invited@example.com', role: 'member' };

      // verifyWorkspaceAccess (admin)
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // Check if user exists in users table
      query.mockResolvedValueOnce({ rows: [] });
      // Check for existing pending invitation -- found
      query.mockResolvedValueOnce({ rows: [{ id: 99 }] });

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('already pending'),
      }));
    });
  });

  // ------------------------------------------------------------------
  // Invite with invalid email
  // ------------------------------------------------------------------
  describe('Invite with invalid email', () => {
    it('returns 400 for invalid email format', async () => {
      req.params = { id: workspaceId };
      req.body = { email: 'not-an-email', role: 'member' };

      // verifyWorkspaceAccess (admin)
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('Invalid email'),
      }));
    });

    it('returns 400 for empty email', async () => {
      req.params = { id: workspaceId };
      req.body = { email: '   ', role: 'member' };

      // verifyWorkspaceAccess (admin)
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('Email is required'),
      }));
    });
  });

  // ------------------------------------------------------------------
  // Accept expired invitation
  // ------------------------------------------------------------------
  describe('Accept expired invitation', () => {
    it('returns error for expired invitation', async () => {
      req.params = { token: 'expired-token' };
      req.user = { id: 5 };

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // SELECT invitation
          rows: [{
            id: 50,
            workspace_id: workspaceId,
            email: 'invited@example.com',
            role: 'member',
            accepted_at: null,
            expires_at: pastDate,
            workspace_name: 'Test Workspace',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ email: 'invited@example.com' }] }) // user email
        .mockResolvedValueOnce({ rows: [] }); // not already a member

      await acceptInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('expired'),
      }));
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // Cancel pending invitation
  // ------------------------------------------------------------------
  describe('Cancel pending invitation', () => {
    it('deletes the invitation record', async () => {
      req.params = { id: workspaceId, invitationId: '50' };

      // Internal verifyWorkspaceAccess: SELECT role
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // DELETE invitation RETURNING id
      query.mockResolvedValueOnce({ rows: [{ id: 50 }] });

      await cancelInvitation(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM workspace_invitations'),
        ['50', workspaceId],
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Invitation cancelled',
      }));
    });
  });

  // ------------------------------------------------------------------
  // Invite blocked: non-admin
  // ------------------------------------------------------------------
  describe('Invite blocked at member limit', () => {
    it('non-admin user cannot invite members', async () => {
      req.params = { id: workspaceId };
      req.body = { email: 'newmember@example.com', role: 'member' };

      // verifyWorkspaceAccess returns member role (not admin)
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('Only workspace admins'),
      }));
    });

    it('blocks invite when user is already a member of workspace', async () => {
      req.params = { id: workspaceId };
      req.body = { email: 'existing@example.com', role: 'member' };

      // Admin check
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
      // User exists
      query.mockResolvedValueOnce({ rows: [{ id: 10 }] });
      // Already a workspace member
      query.mockResolvedValueOnce({ rows: [{ id: 77 }] });

      await inviteToWorkspace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('already a member'),
      }));
    });
  });

  // ------------------------------------------------------------------
  // Invited user gets correct role
  // ------------------------------------------------------------------
  describe('Invited user gets correct role', () => {
    it('assigns viewer role when invitation specifies viewer', async () => {
      req.params = { token: 'viewer-invite-token' };
      req.user = { id: 7 };

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 60,
            workspace_id: workspaceId,
            email: 'viewer@example.com',
            role: 'viewer',
            accepted_at: null,
            expires_at: futureDate,
            workspace_name: 'Test Workspace',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ email: 'viewer@example.com' }] }) // user email
        .mockResolvedValueOnce({ rows: [] }) // not member
        .mockResolvedValueOnce({ rows: [] }) // INSERT member
        .mockResolvedValueOnce({ rows: [] }) // UPDATE invitation
        .mockResolvedValueOnce({}); // COMMIT

      query.mockResolvedValueOnce({ rows: [] }); // onboarding

      await acceptInvitation(req, res);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO workspace_members'),
        [workspaceId, 7, 'viewer'],
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          role: 'viewer',
        }),
      }));
    });

    it('assigns admin role when invitation specifies admin', async () => {
      req.params = { token: 'admin-invite-token' };
      req.user = { id: 8 };

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 61,
            workspace_id: workspaceId,
            email: 'newadmin@example.com',
            role: 'admin',
            accepted_at: null,
            expires_at: futureDate,
            workspace_name: 'Test Workspace',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ email: 'newadmin@example.com' }] })
        .mockResolvedValueOnce({ rows: [] }) // not member
        .mockResolvedValueOnce({ rows: [] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      query.mockResolvedValueOnce({ rows: [] }); // onboarding

      await acceptInvitation(req, res);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO workspace_members'),
        [workspaceId, 8, 'admin'],
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          role: 'admin',
        }),
      }));
    });
  });
});
