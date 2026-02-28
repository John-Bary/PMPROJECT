const { query } = require('../../config/database');
const logger = require('../../lib/logger');
const {
  requireWorkspaceMember,
  requireWorkspaceRole,
  requireWorkspaceAdmin,
  requireWorkspaceEditor,
  checkWorkspaceEditPermission,
  verifyWorkspaceAccess,
  canUserEdit,
} = require('../workspaceAuth');

jest.mock('../../config/database', () => ({ query: jest.fn() }));
jest.mock('../../lib/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

describe('Workspace Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq({ user: { id: 1 } });
    res = createMockRes();
    next = createMockNext();
  });

  // ---------------------------------------------------------------------------
  // requireWorkspaceMember
  // ---------------------------------------------------------------------------
  describe('requireWorkspaceMember', () => {
    it('should return 400 when no workspace_id is present in request', async () => {
      await requireWorkspaceMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'workspace_id is required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should get workspace_id from body.workspace_id', async () => {
      req.body.workspace_id = 'ws-body';
      query.mockResolvedValue({ rows: [{ role: 'member' }] });

      await requireWorkspaceMember(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'ws-body']
      );
      expect(next).toHaveBeenCalled();
    });

    it('should get workspace_id from query.workspace_id', async () => {
      req.query.workspace_id = 'ws-query';
      query.mockResolvedValue({ rows: [{ role: 'admin' }] });

      await requireWorkspaceMember(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'ws-query']
      );
      expect(next).toHaveBeenCalled();
    });

    it('should get workspace_id from params.workspaceId', async () => {
      req.params.workspaceId = 'ws-param';
      query.mockResolvedValue({ rows: [{ role: 'viewer' }] });

      await requireWorkspaceMember(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'ws-param']
      );
      expect(next).toHaveBeenCalled();
    });

    it('should get workspace_id from params.id', async () => {
      req.params.id = 'ws-id';
      query.mockResolvedValue({ rows: [{ role: 'member' }] });

      await requireWorkspaceMember(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 'ws-id']
      );
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when user is not a member of the workspace', async () => {
      req.body.workspace_id = 'ws-1';
      query.mockResolvedValue({ rows: [] });

      await requireWorkspaceMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should attach workspace info to req and call next when user is a member', async () => {
      req.body.workspace_id = 'ws-1';
      query.mockResolvedValue({ rows: [{ role: 'admin' }] });

      await requireWorkspaceMember(req, res, next);

      expect(req.workspace).toEqual({ id: 'ws-1', role: 'admin' });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 500 when the database query throws an error', async () => {
      req.body.workspace_id = 'ws-1';
      const dbError = new Error('Connection lost');
      query.mockRejectedValue(dbError);

      await requireWorkspaceMember(req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        { err: dbError },
        'Workspace auth error'
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Error verifying workspace access',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should hide error details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        req.body.workspace_id = 'ws-1';
        query.mockRejectedValue(new Error('Connection lost'));

        await requireWorkspaceMember(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Error verifying workspace access',
          error: undefined,
        });
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // requireWorkspaceRole
  // ---------------------------------------------------------------------------
  describe('requireWorkspaceRole', () => {
    it('should return 400 when no workspace_id is present', async () => {
      const middleware = requireWorkspaceRole('admin');

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'workspace_id is required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not a member', async () => {
      req.body.workspace_id = 'ws-1';
      query.mockResolvedValue({ rows: [] });
      const middleware = requireWorkspaceRole('admin');

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 with role info when user role is not in allowedRoles', async () => {
      req.body.workspace_id = 'ws-1';
      query.mockResolvedValue({ rows: [{ role: 'viewer' }] });
      const middleware = requireWorkspaceRole('admin');

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'This action requires one of these roles: admin. Your role: viewer',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access and call next when user role matches an allowed role', async () => {
      req.body.workspace_id = 'ws-1';
      query.mockResolvedValue({ rows: [{ role: 'admin' }] });
      const middleware = requireWorkspaceRole('admin');

      await middleware(req, res, next);

      expect(req.workspace).toEqual({ id: 'ws-1', role: 'admin' });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should work with multiple allowed roles', async () => {
      req.body.workspace_id = 'ws-1';
      query.mockResolvedValue({ rows: [{ role: 'member' }] });
      const middleware = requireWorkspaceRole('admin', 'member');

      await middleware(req, res, next);

      expect(req.workspace).toEqual({ id: 'ws-1', role: 'member' });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 500 with error details when query throws (non-production)', async () => {
      req.body.workspace_id = 'ws-1';
      const dbError = new Error('Connection lost');
      query.mockRejectedValue(dbError);
      const middleware = requireWorkspaceRole('admin');

      await middleware(req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        { err: dbError },
        'Workspace role auth error'
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error verifying workspace role',
        error: 'Connection lost',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should hide error details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        req.body.workspace_id = 'ws-1';
        query.mockRejectedValue(new Error('Connection lost'));
        const middleware = requireWorkspaceRole('admin');

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Error verifying workspace role',
          error: undefined,
        });
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // requireWorkspaceAdmin
  // ---------------------------------------------------------------------------
  describe('requireWorkspaceAdmin', () => {
    beforeEach(() => {
      req.body.workspace_id = 'ws-1';
    });

    it('should allow admin role', async () => {
      query.mockResolvedValue({ rows: [{ role: 'admin' }] });

      await requireWorkspaceAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.workspace).toEqual({ id: 'ws-1', role: 'admin' });
    });

    it('should block member role', async () => {
      query.mockResolvedValue({ rows: [{ role: 'member' }] });

      await requireWorkspaceAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'This action requires one of these roles: admin. Your role: member',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should block viewer role', async () => {
      query.mockResolvedValue({ rows: [{ role: 'viewer' }] });

      await requireWorkspaceAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'This action requires one of these roles: admin. Your role: viewer',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // requireWorkspaceEditor
  // ---------------------------------------------------------------------------
  describe('requireWorkspaceEditor', () => {
    beforeEach(() => {
      req.body.workspace_id = 'ws-1';
    });

    it('should allow admin role', async () => {
      query.mockResolvedValue({ rows: [{ role: 'admin' }] });

      await requireWorkspaceEditor(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.workspace).toEqual({ id: 'ws-1', role: 'admin' });
    });

    it('should allow member role', async () => {
      query.mockResolvedValue({ rows: [{ role: 'member' }] });

      await requireWorkspaceEditor(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.workspace).toEqual({ id: 'ws-1', role: 'member' });
    });

    it('should block viewer role', async () => {
      query.mockResolvedValue({ rows: [{ role: 'viewer' }] });

      await requireWorkspaceEditor(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'This action requires one of these roles: admin, member. Your role: viewer',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // checkWorkspaceEditPermission
  // ---------------------------------------------------------------------------
  describe('checkWorkspaceEditPermission', () => {
    it('should set canEdit: false and call next when no workspace_id is present', async () => {
      await checkWorkspaceEditPermission(req, res, next);

      expect(req.workspace).toEqual({ canEdit: false });
      expect(next).toHaveBeenCalled();
    });

    it('should set canEdit: false and call next when user is not a member', async () => {
      req.body.workspace_id = 'ws-1';
      query.mockResolvedValue({ rows: [] });

      await checkWorkspaceEditPermission(req, res, next);

      expect(req.workspace).toEqual({ canEdit: false });
      expect(next).toHaveBeenCalled();
    });

    it('should set canEdit: true and isAdmin: true for admin role', async () => {
      req.body.workspace_id = 'ws-1';
      query.mockResolvedValue({ rows: [{ role: 'admin' }] });

      await checkWorkspaceEditPermission(req, res, next);

      expect(req.workspace).toEqual({
        id: 'ws-1',
        role: 'admin',
        canEdit: true,
        isAdmin: true,
        isViewer: false,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should set canEdit: true and isAdmin: false for member role', async () => {
      req.body.workspace_id = 'ws-1';
      query.mockResolvedValue({ rows: [{ role: 'member' }] });

      await checkWorkspaceEditPermission(req, res, next);

      expect(req.workspace).toEqual({
        id: 'ws-1',
        role: 'member',
        canEdit: true,
        isAdmin: false,
        isViewer: false,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should set canEdit: false and isViewer: true for viewer role', async () => {
      req.body.workspace_id = 'ws-1';
      query.mockResolvedValue({ rows: [{ role: 'viewer' }] });

      await checkWorkspaceEditPermission(req, res, next);

      expect(req.workspace).toEqual({
        id: 'ws-1',
        role: 'viewer',
        canEdit: false,
        isAdmin: false,
        isViewer: true,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should handle errors gracefully by setting canEdit: false and calling next', async () => {
      req.body.workspace_id = 'ws-1';
      const dbError = new Error('Database timeout');
      query.mockRejectedValue(dbError);

      await checkWorkspaceEditPermission(req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        { err: dbError },
        'Check edit permission error'
      );
      expect(req.workspace).toEqual({ canEdit: false });
      expect(next).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // verifyWorkspaceAccess
  // ---------------------------------------------------------------------------
  describe('verifyWorkspaceAccess', () => {
    it('should return the membership object when user is a member', async () => {
      query.mockResolvedValue({ rows: [{ role: 'member' }] });

      const result = await verifyWorkspaceAccess(1, 'ws-1');

      expect(query).toHaveBeenCalledWith(expect.any(String), [1, 'ws-1']);
      expect(result).toEqual({ role: 'member' });
    });

    it('should return null when user is not a member', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await verifyWorkspaceAccess(1, 'ws-1');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // canUserEdit
  // ---------------------------------------------------------------------------
  describe('canUserEdit', () => {
    it('should return true for admin role', async () => {
      query.mockResolvedValue({ rows: [{ role: 'admin' }] });

      const result = await canUserEdit(1, 'ws-1');

      expect(result).toBe(true);
    });

    it('should return true for member role', async () => {
      query.mockResolvedValue({ rows: [{ role: 'member' }] });

      const result = await canUserEdit(1, 'ws-1');

      expect(result).toBe(true);
    });

    it('should return false for viewer role', async () => {
      query.mockResolvedValue({ rows: [{ role: 'viewer' }] });

      const result = await canUserEdit(1, 'ws-1');

      expect(result).toBe(false);
    });

    it('should return false when user is not a member', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await canUserEdit(1, 'ws-1');

      expect(result).toBeFalsy();
    });
  });
});
