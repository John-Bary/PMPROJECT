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
  });
});
