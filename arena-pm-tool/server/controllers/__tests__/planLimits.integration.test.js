/**
 * Plan Limits Enforcement Tests
 * Verifies that Free plan limits are enforced and Pro plan allows higher limits:
 * - Free: 3 members, 50 tasks, 1 workspace
 * - Pro: 50 members, unlimited tasks, 10 workspaces
 */

jest.mock('../../config/database');
jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { query } = require('../../config/database');
const {
  checkTaskLimit,
  checkMemberLimit,
  checkWorkspaceLimit,
  getWorkspacePlanLimits,
} = require('../../middleware/planLimits');

describe('Plan Limits Enforcement', () => {
  let req, res, next;

  beforeEach(() => {
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
    jest.clearAllMocks();
  });

  describe('getWorkspacePlanLimits', () => {
    it('returns free plan defaults when no active subscription exists', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // no subscription

      const limits = await getWorkspacePlanLimits('ws-uuid-123');

      expect(limits).toEqual({
        planId: 'free',
        maxMembers: 3,
        maxTasksPerWorkspace: 50,
        features: {},
      });
    });

    it('returns pro plan limits from active subscription', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          plan_id: 'pro',
          max_members: 50,
          max_tasks_per_workspace: null, // unlimited
          features: { calendar: true, reminders: true },
        }],
      });

      const limits = await getWorkspacePlanLimits('ws-uuid-123');

      expect(limits).toEqual({
        planId: 'pro',
        maxMembers: 50,
        maxTasksPerWorkspace: null,
        features: { calendar: true, reminders: true },
      });
    });

    it('queries subscription with active or trialing status', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await getWorkspacePlanLimits('ws-uuid-123');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("status IN ('active', 'trialing')"),
        ['ws-uuid-123']
      );
    });
  });

  describe('checkTaskLimit — Free plan (50 tasks)', () => {
    it('allows task creation when under limit (25/50)', async () => {
      // Mock subscription query - free plan
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      // Mock task count
      query.mockResolvedValueOnce({ rows: [{ count: '25' }] });

      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.planLimits.planId).toBe('free');
    });

    it('allows task creation at 49/50 (one below limit)', async () => {
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      query.mockResolvedValueOnce({ rows: [{ count: '49' }] });

      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('blocks task creation at limit (50/50)', async () => {
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      query.mockResolvedValueOnce({ rows: [{ count: '50' }] });

      await checkTaskLimit(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PLAN_LIMIT_TASKS',
        limit: 50,
        current: 50,
        planId: 'free',
        message: expect.stringContaining('50-task limit'),
      }));
    });

    it('blocks task creation over limit (55/50)', async () => {
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      query.mockResolvedValueOnce({ rows: [{ count: '55' }] });

      await checkTaskLimit(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('only counts top-level tasks (excludes subtasks)', async () => {
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      query.mockResolvedValueOnce({ rows: [{ count: '30' }] });

      await checkTaskLimit(req, res, next);

      // Verify the count query excludes subtasks
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('parent_task_id IS NULL'),
        ['ws-uuid-123']
      );
    });
  });

  describe('checkTaskLimit — Pro plan (unlimited)', () => {
    it('allows unlimited task creation on Pro plan', async () => {
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'pro', max_members: 50, max_tasks_per_workspace: null, features: {} }],
      });
      // No count query needed for unlimited

      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      // Should not query task count when limit is null
      expect(query).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkMemberLimit — Free plan (3 members)', () => {
    it('allows invite when under limit (1 member + 1 pending = 2/3)', async () => {
      req.params = { id: 'ws-uuid-123' };

      // Subscription query
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      // Member count + invitation count (Promise.all)
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // members
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // pending invites

      await checkMemberLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('blocks invite at limit (2 members + 1 pending = 3/3)', async () => {
      req.params = { id: 'ws-uuid-123' };

      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      query.mockResolvedValueOnce({ rows: [{ count: '2' }] }); // members
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // pending invites

      await checkMemberLimit(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PLAN_LIMIT_MEMBERS',
        limit: 3,
        current: 3,
        planId: 'free',
        message: expect.stringContaining('3-member limit'),
      }));
    });

    it('counts pending invitations towards limit', async () => {
      req.params = { id: 'ws-uuid-123' };

      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // 1 actual member
      query.mockResolvedValueOnce({ rows: [{ count: '2' }] }); // 2 pending invites = 3 total

      await checkMemberLimit(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('checkMemberLimit — Pro plan (50 members)', () => {
    it('allows invite with many members on Pro plan', async () => {
      req.params = { id: 'ws-uuid-123' };

      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'pro', max_members: 50, max_tasks_per_workspace: null, features: {} }],
      });
      query.mockResolvedValueOnce({ rows: [{ count: '25' }] }); // members
      query.mockResolvedValueOnce({ rows: [{ count: '5' }] }); // pending invites

      await checkMemberLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkWorkspaceLimit — Free plan (1 workspace)', () => {
    it('allows first workspace creation on free plan', async () => {
      // Count user's workspaces
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      // Check for pro subscription
      query.mockResolvedValueOnce({ rows: [] }); // no pro sub

      await checkWorkspaceLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('blocks second workspace on free plan', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // already has 1
      query.mockResolvedValueOnce({ rows: [] }); // no pro sub

      await checkWorkspaceLimit(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PLAN_LIMIT_WORKSPACES',
        limit: 1,
        current: 1,
        planId: 'free',
        message: expect.stringContaining('1 workspace'),
      }));
    });
  });

  describe('checkWorkspaceLimit — Pro plan (10 workspaces)', () => {
    it('allows multiple workspaces on Pro plan', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '5' }] }); // has 5
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // has pro sub

      await checkWorkspaceLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Fail-open behavior', () => {
    it('checkTaskLimit fails open on database error', async () => {
      query.mockRejectedValueOnce(new Error('DB connection lost'));

      await checkTaskLimit(req, res, next);

      // Should call next() despite error (fail open)
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('checkMemberLimit fails open on database error', async () => {
      req.params = { id: 'ws-uuid-123' };
      query.mockRejectedValueOnce(new Error('DB connection lost'));

      await checkMemberLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('checkWorkspaceLimit fails open on database error', async () => {
      query.mockRejectedValueOnce(new Error('DB connection lost'));

      await checkWorkspaceLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('checkTaskLimit passes through when no workspace_id', async () => {
      req.workspace = undefined;
      req.body = {};
      req.query = {};
      req.params = {};

      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('checkWorkspaceLimit passes through when no user', async () => {
      req.user = undefined;

      await checkWorkspaceLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('error response includes upgrade suggestion for free plan', async () => {
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free', max_members: 3, max_tasks_per_workspace: 50, features: {} }],
      });
      query.mockResolvedValueOnce({ rows: [{ count: '50' }] });

      await checkTaskLimit(req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Upgrade to Pro'),
      }));
    });
  });
});
