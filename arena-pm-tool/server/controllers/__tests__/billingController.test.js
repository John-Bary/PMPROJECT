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

// Shared mock Stripe instance so we can configure methods per-test
const mockStripeInstance = {
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  billingPortal: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
};

// Mock Stripe so getStripe() doesn't throw
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripeInstance);
});

// Set STRIPE_SECRET_KEY so getStripe() initializes without throwing
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';

const { verifyWorkspaceAccess } = require('../../middleware/workspaceAuth');
const logger = require('../../lib/logger');
const { queueTrialEndingEmail } = require('../../utils/emailQueue');

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

    it('should return 500 when database query fails', async () => {
      query.mockRejectedValueOnce(new Error('DB connection failed'));

      const { getPlans } = require('../billingController');
      await getPlans(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error fetching plans',
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

    it('should create Stripe customer and checkout session, returning URL', async () => {
      req.body = { workspace_id: workspaceId };
      process.env.STRIPE_PRO_PRICE_ID = 'price_test_pro';

      // Subscription query — no existing subscription (no stripe_customer_id)
      query.mockResolvedValueOnce({ rows: [] });
      // Member count
      query.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      // Workspace name
      query.mockResolvedValueOnce({ rows: [{ name: 'Test Workspace' }] });
      // User email/name
      query.mockResolvedValueOnce({ rows: [{ email: 'admin@test.com', name: 'Admin' }] });

      mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_new123' });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session/cs_test_123',
        id: 'cs_test_123',
      });

      const { createCheckoutSession } = require('../billingController');
      await createCheckoutSession(req, res);

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'admin@test.com',
        name: 'Admin',
        metadata: expect.objectContaining({ workspace_id: workspaceId }),
      }));
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
        customer: 'cus_new123',
        mode: 'subscription',
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: {
          checkoutUrl: 'https://checkout.stripe.com/session/cs_test_123',
          sessionId: 'cs_test_123',
        },
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

    it('should return portal URL when billing account exists', async () => {
      req.body = { workspace_id: workspaceId };

      // Subscription query with stripe_customer_id
      query.mockResolvedValueOnce({ rows: [{ stripe_customer_id: 'cus_existing123' }] });

      mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/session/bps_test_123',
      });

      const { createPortalSession } = require('../billingController');
      await createPortalSession(req, res);

      expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
        customer: 'cus_existing123',
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: {
          portalUrl: 'https://billing.stripe.com/session/bps_test_123',
        },
      }));
    });

    it('should return 400 when no billing account exists', async () => {
      req.body = { workspace_id: workspaceId };

      // Subscription query without stripe_customer_id
      query.mockResolvedValueOnce({ rows: [{ stripe_customer_id: null }] });

      const { createPortalSession } = require('../billingController');
      await createPortalSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'No billing account found. Please set up billing first.',
      }));
    });
  });

  describe('handleWebhook', () => {
    let mockClient;

    const buildWebhookReq = (eventType, dataObject) => ({
      body: Buffer.from('raw-body'),
      headers: { 'stripe-signature': 'sig_test_123' },
      user: { id: 1 },
      params: {},
      query: {},
      cookies: {},
    });

    const buildEvent = (type, dataObject) => ({
      type,
      data: { object: dataObject },
    });

    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);
    });

    afterEach(() => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('should handle customer.subscription.created and update to pro', async () => {
      const subscription = {
        id: 'sub_123',
        status: 'active',
        metadata: { workspace_id: workspaceId },
        trial_end: null,
        current_period_start: 1700000000,
        current_period_end: 1702600000,
        items: { data: [{ quantity: 5 }] },
      };

      const event = buildEvent('customer.subscription.created', subscription);
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      // BEGIN, UPDATE, COMMIT
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SET plan_id = 'pro'"),
        expect.arrayContaining(['sub_123', 'active', null, expect.any(Date), expect.any(Date), 5, workspaceId])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle customer.subscription.updated and update subscription fields', async () => {
      const subscription = {
        id: 'sub_456',
        status: 'trialing',
        metadata: { workspace_id: workspaceId },
        trial_end: 1701000000,
        current_period_start: 1700000000,
        current_period_end: 1702600000,
        items: { data: [{ quantity: 10 }] },
      };

      const event = buildEvent('customer.subscription.updated', subscription);
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      // Should map 'trialing' to 'trialing' via mapStripeStatus
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SET plan_id = 'pro'"),
        expect.arrayContaining(['sub_456', 'trialing', expect.any(Date), expect.any(Date), expect.any(Date), 10, workspaceId])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle customer.subscription.deleted and downgrade to free', async () => {
      const subscription = {
        id: 'sub_789',
        status: 'canceled',
        metadata: { workspace_id: workspaceId },
        canceled_at: 1701000000,
      };

      const event = buildEvent('customer.subscription.deleted', subscription);
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SET plan_id = 'free'"),
        [workspaceId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle invoice.paid and insert invoice record', async () => {
      const invoice = {
        id: 'inv_123',
        amount_paid: 1500,
        period_start: 1700000000,
        period_end: 1702600000,
        invoice_pdf: 'https://stripe.com/invoice.pdf',
        subscription_details: { metadata: { workspace_id: workspaceId } },
      };

      const event = buildEvent('invoice.paid', invoice);
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoices'),
        expect.arrayContaining([workspaceId, 'inv_123', 1500, 'paid'])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle invoice.payment_failed and update status to past_due with failed invoice', async () => {
      const invoice = {
        id: 'inv_fail_123',
        amount_due: 1500,
        period_start: 1700000000,
        period_end: 1702600000,
        subscription_details: { metadata: { workspace_id: workspaceId } },
      };

      const event = buildEvent('invoice.payment_failed', invoice);
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      // Should update subscription status to past_due
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'past_due'"),
        [workspaceId]
      );
      // Should insert failed invoice
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoices'),
        expect.arrayContaining([workspaceId, 'inv_fail_123', 1500, 'failed'])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle customer.subscription.trial_will_end and send trial ending email', async () => {
      const subscription = {
        id: 'sub_trial_123',
        status: 'trialing',
        metadata: { workspace_id: workspaceId },
        trial_end: 1701000000,
      };

      const event = buildEvent('customer.subscription.trial_will_end', subscription);
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      // Admin email lookup
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ email: 'admin@workspace.com', name: 'WS Admin' }] }) // admin lookup
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId }),
        'Trial ending soon for workspace'
      );
      expect(queueTrialEndingEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'admin@workspace.com',
        userName: 'WS Admin',
        trialEndDate: expect.any(Date),
      }));
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should skip processing when subscription metadata is missing workspace_id', async () => {
      const subscription = {
        id: 'sub_no_ws',
        status: 'active',
        metadata: {},
        trial_end: null,
        current_period_start: 1700000000,
        current_period_end: 1702600000,
        items: { data: [{ quantity: 1 }] },
      };

      const event = buildEvent('customer.subscription.created', subscription);
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(logger.warn).toHaveBeenCalledWith('Webhook: subscription event missing workspace_id metadata');
      // Should still COMMIT and return success (just skip the update)
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should return 400 when signature verification fails', async () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    });

    it('should return 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Webhook not configured' });
    });

    it('should rollback transaction on processing error', async () => {
      const subscription = {
        id: 'sub_err',
        status: 'active',
        metadata: { workspace_id: workspaceId },
        trial_end: null,
        current_period_start: 1700000000,
        current_period_end: 1702600000,
        items: { data: [{ quantity: 1 }] },
      };

      const event = buildEvent('customer.subscription.created', subscription);
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      // BEGIN succeeds, then UPDATE throws
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('DB write failed')); // UPDATE fails

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Webhook processing failed' });
    });

    it('should return received: true for unhandled event types', async () => {
      const event = buildEvent('some.unknown.event', { id: 'obj_123' });
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should map trialing status correctly via subscription.updated', async () => {
      const subscription = {
        id: 'sub_trialing',
        status: 'trialing',
        metadata: { workspace_id: workspaceId },
        trial_end: 1701000000,
        current_period_start: 1700000000,
        current_period_end: 1702600000,
        items: { data: [{ quantity: 2 }] },
      };

      const event = buildEvent('customer.subscription.updated', subscription);
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      // Verify the 'trialing' status is passed as the second parameter
      const updateCall = mockClient.query.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes("SET plan_id = 'pro'")
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1][1]).toBe('trialing');
    });
  });
});
