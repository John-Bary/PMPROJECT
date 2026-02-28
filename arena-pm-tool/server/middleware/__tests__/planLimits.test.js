// Tests for plan limits middleware
const { query } = require('../../config/database');

jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('Plan Limits Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1 },
      workspace: { id: 'ws-uuid-123' },
      body: {},
      query: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('checkTaskLimit', () => {
    it('should allow task creation when under limit', async () => {
      // Subscription query - free plan
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      // Task count
      query.mockResolvedValueOnce({
        rows: [{ count: '25' }],
      });

      const { checkTaskLimit } = require('../planLimits');
      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block task creation when at limit', async () => {
      // Subscription query
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      // Task count at limit
      query.mockResolvedValueOnce({
        rows: [{ count: '50' }],
      });

      const { checkTaskLimit } = require('../planLimits');
      await checkTaskLimit(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PLAN_LIMIT_TASKS',
      }));
    });

    it('should use free plan defaults when no subscription exists', async () => {
      // No active subscription found
      query.mockResolvedValueOnce({ rows: [] });
      // Task count under free plan limit of 50
      query.mockResolvedValueOnce({ rows: [{ count: '10' }] });

      const { checkTaskLimit } = require('../planLimits');
      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.planLimits).toEqual(expect.objectContaining({
        planId: 'free',
        maxMembers: 3,
        maxTasksPerWorkspace: 50,
        features: {},
      }));
    });

    it('should allow unlimited tasks when maxTasksPerWorkspace is null', async () => {
      // Subscription with null max_tasks (unlimited)
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'enterprise', max_members: 100, max_tasks_per_workspace: null, features: {} }],
      });

      const { checkTaskLimit } = require('../planLimits');
      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.planLimits).toEqual(expect.objectContaining({
        planId: 'enterprise',
        maxTasksPerWorkspace: null,
      }));
    });

    it('should allow unlimited tasks when maxTasksPerWorkspace is undefined', async () => {
      // Subscription with undefined max_tasks (unlimited)
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'pro', max_members: 50, max_tasks_per_workspace: undefined, features: {} }],
      });

      const { checkTaskLimit } = require('../planLimits');
      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.planLimits).toEqual(expect.objectContaining({
        planId: 'pro',
      }));
    });

    it('should show plan name in error message for non-free plans', async () => {
      // Subscription query - pro plan with a task limit
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'pro', max_members: 50, max_tasks_per_workspace: 200, features: {} }],
      });
      // Task count at limit
      query.mockResolvedValueOnce({ rows: [{ count: '200' }] });

      const { checkTaskLimit } = require('../planLimits');
      await checkTaskLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PLAN_LIMIT_TASKS',
        planId: 'pro',
        message: expect.stringContaining('pro plan'),
      }));
    });

    it('should call next without workspaceId', async () => {
      req = { body: {}, query: {}, params: {} };

      const { checkTaskLimit } = require('../planLimits');
      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    });

    it('should fail open on database error', async () => {
      // Subscription query throws
      query.mockRejectedValueOnce(new Error('DB connection lost'));

      const { checkTaskLimit } = require('../planLimits');
      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle null features from database', async () => {
      // Subscription with null features
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: null }],
      });
      // Task count
      query.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      const { checkTaskLimit } = require('../planLimits');
      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.planLimits.features).toEqual({});
    });
  });

  describe('checkMemberLimit', () => {
    it('should allow invite when under member limit', async () => {
      req.params = { id: 'ws-uuid-123' };
      // Subscription query
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      // Member count
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      // Pending invite count
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const { checkMemberLimit } = require('../planLimits');
      await checkMemberLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block invite when at member limit', async () => {
      req.params = { id: 'ws-uuid-123' };
      // Subscription query
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      // Member count
      query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      // Pending invite count
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const { checkMemberLimit } = require('../planLimits');
      await checkMemberLimit(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PLAN_LIMIT_MEMBERS',
      }));
    });

    it('should allow invite when plan has unlimited members (null maxMembers)', async () => {
      req.params = { id: 'ws-uuid-123' };
      // Subscription query - plan with null max_members (unlimited)
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'enterprise', max_members: null, max_tasks_per_workspace: 1000, features: {} }],
      });

      const { checkMemberLimit } = require('../planLimits');
      await checkMemberLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.planLimits).toEqual(expect.objectContaining({
        planId: 'enterprise',
        maxMembers: null,
      }));
    });

    it('should show plan name in error message for non-free plans', async () => {
      req.params = { id: 'ws-uuid-123' };
      // Subscription query - pro plan
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'pro', max_members: 10, max_tasks_per_workspace: 500, features: {} }],
      });
      // Member count at limit
      query.mockResolvedValueOnce({ rows: [{ count: '8' }] });
      // Pending invite count
      query.mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const { checkMemberLimit } = require('../planLimits');
      await checkMemberLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PLAN_LIMIT_MEMBERS',
        planId: 'pro',
        message: expect.stringContaining('pro plan'),
      }));
    });

    it('should fall back to getWorkspaceIdFromRequest when params.id is missing', async () => {
      req.params = {};
      req.body = { workspace_id: 'ws-from-body' };
      // Subscription query
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      // Member count
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      // Pending invite count
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const { checkMemberLimit } = require('../planLimits');
      await checkMemberLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      // Verify the body workspace_id was used
      expect(query).toHaveBeenCalledWith(expect.any(String), ['ws-from-body']);
    });

    it('should call next without workspaceId', async () => {
      req = { params: {}, body: {}, query: {} };

      const { checkMemberLimit } = require('../planLimits');
      await checkMemberLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    });

    it('should fail open on database error', async () => {
      req.params = { id: 'ws-uuid-123' };
      query.mockRejectedValueOnce(new Error('DB timeout'));

      const { checkMemberLimit } = require('../planLimits');
      await checkMemberLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('checkWorkspaceLimit', () => {
    it('should allow workspace creation when under limit', async () => {
      // Count user's workspaces
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      // Check for pro subscription
      query.mockResolvedValueOnce({ rows: [] }); // no pro

      const { checkWorkspaceLimit } = require('../planLimits');
      await checkWorkspaceLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block workspace creation at limit on free plan', async () => {
      // Count user's workspaces - already has 1
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      // Check for pro subscription - none
      query.mockResolvedValueOnce({ rows: [] });

      const { checkWorkspaceLimit } = require('../planLimits');
      await checkWorkspaceLimit(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PLAN_LIMIT_WORKSPACES',
      }));
    });

    it('should fall through for pro users at workspace limit', async () => {
      // Count user's workspaces - at pro limit of 10
      query.mockResolvedValueOnce({ rows: [{ count: '10' }] });
      // Check for pro subscription - has pro
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const { checkWorkspaceLimit } = require('../planLimits');
      await checkWorkspaceLimit(req, res, next);

      // Pro users at limit fall through to controller-level BIZ-01 check
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next without userId', async () => {
      req.user = null;

      const { checkWorkspaceLimit } = require('../planLimits');
      await checkWorkspaceLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    });

    it('should fail open on database error', async () => {
      query.mockRejectedValueOnce(new Error('DB connection refused'));

      const { checkWorkspaceLimit } = require('../planLimits');
      await checkWorkspaceLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
