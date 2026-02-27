// Tests for billing controller
const { query, getClient } = require('../../config/database');

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../../middleware/workspaceAuth', () => ({
  verifyWorkspaceAccess: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../utils/emailQueue', () => ({
  queueTrialEndingEmail: jest.fn().mockResolvedValue(true),
}));

// Mock Stripe so getStripe() doesn't throw
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
  }));
});

// Set STRIPE_SECRET_KEY so getStripe() initializes without throwing
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';

const { verifyWorkspaceAccess } = require('../../middleware/workspaceAuth');

describe('Billing Controller', () => {
  let req, res;
  const workspaceId = 'ws-uuid-123';

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1 },
      body: {},
      params: {},
      query: {},
      cookies: {},
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    verifyWorkspaceAccess.mockResolvedValue({ role: 'admin' });
  });

  describe('getSubscription', () => {
    it('should return subscription with plan details and usage for workspace', async () => {
      req.query = { workspace_id: workspaceId };

      // Subscription query
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          plan_id: 'pro',
          plan_name: 'Pro',
          status: 'active',
          seat_count: 5,
          trial_ends_at: null,
          current_period_start: new Date(),
          current_period_end: new Date(),
          price_per_seat_cents: 300,
          max_members: 50,
          max_tasks_per_workspace: null,
          features: { calendar: true },
          created_at: new Date(),
        }],
      });
      // Task count
      query.mockResolvedValueOnce({ rows: [{ count: '25' }] });
      // Member count
      query.mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const { getSubscription } = require('../billingController');
      await getSubscription(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          subscription: expect.objectContaining({
            planId: 'pro',
            status: 'active',
            seatCount: 5,
          }),
          plan: expect.objectContaining({
            id: 'pro',
            name: 'Pro',
            pricePerSeatCents: 300,
          }),
          usage: {
            tasks: 25,
            members: 3,
          },
        }),
      }));
    });

    it('should return free plan when no subscription exists', async () => {
      req.query = { workspace_id: workspaceId };
      query.mockResolvedValueOnce({ rows: [] }); // no subscription

      const { getSubscription } = require('../billingController');
      await getSubscription(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          subscription: null,
          plan: { id: 'free', name: 'Free' },
        }),
      }));
    });

    it('should return 400 when workspace_id is missing', async () => {
      req.query = {};

      const { getSubscription } = require('../billingController');
      await getSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'workspace_id is required',
      }));
    });

    it('should return 403 when user lacks workspace access', async () => {
      req.query = { workspace_id: workspaceId };
      verifyWorkspaceAccess.mockResolvedValue(null);

      const { getSubscription } = require('../billingController');
      await getSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle database errors', async () => {
      req.query = { workspace_id: workspaceId };
      query.mockRejectedValueOnce(new Error('Connection lost'));

      const { getSubscription } = require('../billingController');
      await getSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error fetching subscription',
      }));
    });
  });

  describe('getPlans', () => {
    it('should return available plans', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { id: 'free', name: 'Free', price_per_seat_cents: 0, max_members: 3, max_tasks_per_workspace: 50, features: {} },
          { id: 'pro', name: 'Pro', price_per_seat_cents: 300, max_members: 50, max_tasks_per_workspace: null, features: { calendar: true } },
        ],
      });

      const { getPlans } = require('../billingController');
      await getPlans(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: {
          plans: [
            expect.objectContaining({ id: 'free', pricePerSeatCents: 0 }),
            expect.objectContaining({ id: 'pro', pricePerSeatCents: 300 }),
          ],
        },
      }));
    });
  });

  describe('createCheckoutSession', () => {
    it('should return 400 when workspace_id is missing', async () => {
      req.body = {};

      const { createCheckoutSession } = require('../billingController');
      await createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'workspace_id is required',
      }));
    });

    it('should return 403 when user is not workspace admin', async () => {
      req.body = { workspace_id: workspaceId };
      verifyWorkspaceAccess.mockResolvedValue({ role: 'member' });

      const { createCheckoutSession } = require('../billingController');
      await createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Only workspace admins can manage billing',
      }));
    });
  });

  describe('createPortalSession', () => {
    it('should return 400 when workspace_id is missing', async () => {
      req.body = {};

      const { createPortalSession } = require('../billingController');
      await createPortalSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'workspace_id is required',
      }));
    });

    it('should return 403 when user is not workspace admin', async () => {
      req.body = { workspace_id: workspaceId };
      verifyWorkspaceAccess.mockResolvedValue({ role: 'member' });

      const { createPortalSession } = require('../billingController');
      await createPortalSession(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
