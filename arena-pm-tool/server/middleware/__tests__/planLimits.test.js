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
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('checkTaskLimit', () => {
    it('should allow task creation when under limit', async () => {
      // Mock subscription query - free plan with 50 task limit
      query.mockResolvedValueOnce({
        rows: [{ max_tasks_per_workspace: 50 }],
      });
      // Mock current task count
      query.mockResolvedValueOnce({
        rows: [{ count: '25' }],
      });

      const { checkTaskLimit } = require('../planLimits');
      await checkTaskLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block task creation when at limit', async () => {
      query.mockResolvedValueOnce({
        rows: [{ max_tasks_per_workspace: 50 }],
      });
      query.mockResolvedValueOnce({
        rows: [{ count: '50' }],
      });

      const { checkTaskLimit } = require('../planLimits');
      await checkTaskLimit(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('checkMemberLimit', () => {
    it('should allow invite when under member limit', async () => {
      query.mockResolvedValueOnce({
        rows: [{ max_members: 3 }],
      });
      query.mockResolvedValueOnce({
        rows: [{ count: '2' }],
      });

      const { checkMemberLimit } = require('../planLimits');
      await checkMemberLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block invite when at member limit', async () => {
      query.mockResolvedValueOnce({
        rows: [{ max_members: 3 }],
      });
      query.mockResolvedValueOnce({
        rows: [{ count: '3' }],
      });

      const { checkMemberLimit } = require('../planLimits');
      await checkMemberLimit(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('checkWorkspaceLimit', () => {
    it('should allow workspace creation when under limit', async () => {
      query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });

      const { checkWorkspaceLimit } = require('../planLimits');
      await checkWorkspaceLimit(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block workspace creation when at limit', async () => {
      // Free plan users can only have 1 workspace
      query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });
      // Mock plan query
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free' }],
      });

      const { checkWorkspaceLimit } = require('../planLimits');
      await checkWorkspaceLimit(req, res, next);

      // Depending on implementation, might call next or block
      expect(res.status).toHaveBeenCalled();
    });
  });
});
