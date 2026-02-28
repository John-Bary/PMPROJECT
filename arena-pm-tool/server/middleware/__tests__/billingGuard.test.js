// Tests for billingGuard middleware
const { query } = require('../../config/database');

jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { requireActiveSubscription } = require('../billingGuard');

describe('Billing Guard Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockReq();
    res = createMockRes();
    next = createMockNext();
  });

  describe('requireActiveSubscription', () => {
    it('should allow request when subscription status is active', async () => {
      req.body.workspace_id = 'ws-123';
      query.mockResolvedValueOnce({
        rows: [{ status: 'active', plan_id: 'pro', plan_name: 'Pro' }],
      });

      await requireActiveSubscription(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.subscription).toEqual({
        planId: 'pro',
        planName: 'Pro',
        status: 'active',
      });
    });

    it('should allow request when subscription status is trialing', async () => {
      req.body.workspace_id = 'ws-123';
      query.mockResolvedValueOnce({
        rows: [{ status: 'trialing', plan_id: 'pro', plan_name: 'Pro' }],
      });

      await requireActiveSubscription(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.subscription).toEqual({
        planId: 'pro',
        planName: 'Pro',
        status: 'trialing',
      });
    });

    it('should block request with 402 when subscription is canceled', async () => {
      req.body.workspace_id = 'ws-123';
      query.mockResolvedValueOnce({
        rows: [{ status: 'canceled', plan_id: 'pro', plan_name: 'Pro' }],
      });

      await requireActiveSubscription(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: 'SUBSCRIPTION_CANCELED',
        message: 'Your subscription has been canceled. Please resubscribe to continue using this workspace.',
      });
    });

    it('should block request with 402 when subscription is past_due', async () => {
      req.body.workspace_id = 'ws-123';
      query.mockResolvedValueOnce({
        rows: [{ status: 'past_due', plan_id: 'pro', plan_name: 'Pro' }],
      });

      await requireActiveSubscription(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        code: 'PAYMENT_PAST_DUE',
        message: 'Your payment is past due. Please update your payment method to continue.',
      });
    });

    it('should allow request and set free plan when no subscription record exists', async () => {
      req.body.workspace_id = 'ws-123';
      query.mockResolvedValueOnce({ rows: [] });

      await requireActiveSubscription(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.subscription).toEqual({
        planId: 'free',
        status: 'active',
      });
    });

    it('should skip billing check and call next when no workspace_id is present', async () => {
      // req has no workspace_id anywhere
      await requireActiveSubscription(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should read workspace_id from query parameter', async () => {
      req.query.workspace_id = 'ws-from-query';
      query.mockResolvedValueOnce({
        rows: [{ status: 'active', plan_id: 'pro', plan_name: 'Pro' }],
      });

      await requireActiveSubscription(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['ws-from-query']
      );
      expect(next).toHaveBeenCalled();
    });

    it('should read workspace_id from params.workspaceId', async () => {
      req.params.workspaceId = 'ws-from-params';
      query.mockResolvedValueOnce({
        rows: [{ status: 'active', plan_id: 'free', plan_name: 'Free' }],
      });

      await requireActiveSubscription(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['ws-from-params']
      );
      expect(next).toHaveBeenCalled();
    });

    it('should read workspace_id from req.workspace.id', async () => {
      req.workspace = { id: 'ws-from-workspace' };
      query.mockResolvedValueOnce({
        rows: [{ status: 'active', plan_id: 'pro', plan_name: 'Pro' }],
      });

      await requireActiveSubscription(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['ws-from-workspace']
      );
      expect(next).toHaveBeenCalled();
    });

    it('should fail open on database errors (call next, not block)', async () => {
      req.body.workspace_id = 'ws-123';
      query.mockRejectedValueOnce(new Error('Database connection failed'));

      await requireActiveSubscription(req, res, next);

      // Fail open: user is not blocked
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should log error when database query fails', async () => {
      const logger = require('../../lib/logger');
      req.body.workspace_id = 'ws-123';
      const dbError = new Error('Connection refused');
      query.mockRejectedValueOnce(dbError);

      await requireActiveSubscription(req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        { err: dbError },
        'Billing guard error'
      );
    });

    it('should prioritize body.workspace_id over other sources', async () => {
      req.body.workspace_id = 'ws-body';
      req.query.workspace_id = 'ws-query';
      req.params.workspaceId = 'ws-params';
      query.mockResolvedValueOnce({
        rows: [{ status: 'active', plan_id: 'pro', plan_name: 'Pro' }],
      });

      await requireActiveSubscription(req, res, next);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['ws-body']
      );
    });
  });
});
