/**
 * Multi-Tenant Data Isolation Tests
 * Verifies that users in workspace A cannot access data in workspace B.
 * Tests workspace-scoped queries and workspaceAuth middleware.
 */

jest.mock('../../config/database');
jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { query } = require('../../config/database');
const {
  requireWorkspaceMember,
  requireWorkspaceRole,
  requireWorkspaceAdmin,
  requireWorkspaceEditor,
  verifyWorkspaceAccess,
} = require('../../middleware/workspaceAuth');

describe('Multi-Tenant Data Isolation', () => {
  let req, res, next;

  const userA = { id: 1, email: 'usera@example.com', role: 'member' };
  const userB = { id: 2, email: 'userb@example.com', role: 'member' };
  const workspaceA = 'ws-uuid-aaa';
  const workspaceB = 'ws-uuid-bbb';

  beforeEach(() => {
    req = createMockReq({ user: userA });
    res = createMockRes();
    next = createMockNext();
    jest.clearAllMocks();
  });

  describe('requireWorkspaceMember', () => {
    it('allows access when user is a member of the workspace', async () => {
      req.body.workspace_id = workspaceA;

      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await requireWorkspaceMember(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('workspace_members'),
        [userA.id, workspaceA]
      );
      expect(next).toHaveBeenCalled();
      expect(req.workspace).toEqual({ id: workspaceA, role: 'member' });
    });

    it('blocks access when user is NOT a member of the workspace', async () => {
      req.body.workspace_id = workspaceB;

      query.mockResolvedValueOnce({ rows: [] }); // no membership

      await requireWorkspaceMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('do not have access'),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects request with no workspace_id', async () => {
      // No workspace_id in body, query, or params
      await requireWorkspaceMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('workspace_id is required'),
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireWorkspaceRole', () => {
    it('allows admin to access admin-only routes', async () => {
      req.params = { id: workspaceA };
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      await requireWorkspaceAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.workspace.role).toBe('admin');
    });

    it('blocks member from admin-only routes', async () => {
      req.params = { id: workspaceA };
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await requireWorkspaceAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('requires one of these roles'),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks viewer from editor routes', async () => {
      req.params = { id: workspaceA };
      query.mockResolvedValueOnce({ rows: [{ role: 'viewer' }] });

      await requireWorkspaceEditor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows member to access editor routes', async () => {
      req.params = { id: workspaceA };
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await requireWorkspaceEditor(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('blocks non-member entirely (even before role check)', async () => {
      req.params = { id: workspaceB };
      query.mockResolvedValueOnce({ rows: [] }); // not a member

      const customRoleMiddleware = requireWorkspaceRole('admin', 'member');
      await customRoleMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('do not have access'),
      }));
    });
  });

  describe('Cross-workspace isolation scenarios', () => {
    it('user A cannot query tasks in workspace B', async () => {
      // Simulate what happens when user A tries to access workspace B's tasks
      req.user = userA;
      req.query.workspace_id = workspaceB;

      // workspaceAuth check returns no membership
      query.mockResolvedValueOnce({ rows: [] });

      await requireWorkspaceMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      // Task query should never be executed
      expect(next).not.toHaveBeenCalled();
    });

    it('user B cannot invite members to workspace A', async () => {
      req.user = userB;
      req.params = { id: workspaceA };

      // User B is not a member of workspace A
      query.mockResolvedValueOnce({ rows: [] });

      await requireWorkspaceAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('viewer in workspace A cannot modify tasks', async () => {
      req.user = { id: 3, email: 'viewer@example.com', role: 'member' };
      req.params = { id: workspaceA };

      // User is a viewer in this workspace
      query.mockResolvedValueOnce({ rows: [{ role: 'viewer' }] });

      await requireWorkspaceEditor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('requires one of these roles'),
      }));
    });
  });

  describe('verifyWorkspaceAccess helper', () => {
    it('returns membership when user belongs to workspace', async () => {
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      const result = await verifyWorkspaceAccess(userA.id, workspaceA);

      expect(result).toEqual({ role: 'admin' });
    });

    it('returns null when user does not belong to workspace', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const result = await verifyWorkspaceAccess(userA.id, workspaceB);

      expect(result).toBeNull();
    });
  });

  describe('Workspace ID extraction from different request locations', () => {
    it('extracts workspace_id from request body', async () => {
      req.body = { workspace_id: workspaceA };
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await requireWorkspaceMember(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [userA.id, workspaceA]
      );
      expect(next).toHaveBeenCalled();
    });

    it('extracts workspace_id from query params', async () => {
      req.query = { workspace_id: workspaceA };
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await requireWorkspaceMember(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [userA.id, workspaceA]
      );
      expect(next).toHaveBeenCalled();
    });

    it('extracts workspaceId from URL params', async () => {
      req.params = { workspaceId: workspaceA };
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      await requireWorkspaceMember(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [userA.id, workspaceA]
      );
      expect(next).toHaveBeenCalled();
    });

    it('extracts id from URL params (workspace routes)', async () => {
      req.params = { id: workspaceA };
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      await requireWorkspaceMember(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [userA.id, workspaceA]
      );
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Database error handling', () => {
    it('returns 500 on database error in requireWorkspaceMember', async () => {
      req.body.workspace_id = workspaceA;
      query.mockRejectedValueOnce(new Error('Connection lost'));

      await requireWorkspaceMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 500 on database error in requireWorkspaceRole', async () => {
      req.params = { id: workspaceA };
      query.mockRejectedValueOnce(new Error('Connection lost'));

      await requireWorkspaceAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
