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

    it('should log error but not fail webhook when trial ending email fails (line 496)', async () => {
      const subscription = {
        id: 'sub_trial_email_fail',
        status: 'trialing',
        metadata: { workspace_id: workspaceId },
        trial_end: 1701000000,
      };

      const event = buildEvent('customer.subscription.trial_will_end', subscription);
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      // Admin email lookup returns admin
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ email: 'admin@workspace.com', name: 'WS Admin' }] }) // admin lookup
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Make queueTrialEndingEmail throw
      queueTrialEndingEmail.mockRejectedValueOnce(new Error('Email service down'));

      req = buildWebhookReq();

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      // Should log the email error
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), workspaceId }),
        'Failed to send trial ending email'
      );
      // But still return success
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe('createCheckoutSession — additional coverage', () => {
    it('should update existing subscription with new stripe_customer_id (line 186)', async () => {
      req.body = { workspace_id: workspaceId };
      process.env.STRIPE_PRO_PRICE_ID = 'price_test_pro';

      // Subscription query — existing subscription row WITHOUT stripe_customer_id
      query.mockResolvedValueOnce({ rows: [{ id: 1, stripe_customer_id: null }] });
      // Member count
      query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      // Workspace name
      query.mockResolvedValueOnce({ rows: [{ name: 'My Workspace' }] });
      // User email/name
      query.mockResolvedValueOnce({ rows: [{ email: 'user@test.com', name: 'Test User' }] });

      mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_brand_new' });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session/cs_test_456',
        id: 'cs_test_456',
      });

      const { createCheckoutSession } = require('../billingController');
      await createCheckoutSession(req, res);

      // Should have updated the existing subscription row with the new customer ID
      expect(query).toHaveBeenCalledWith(
        'UPDATE subscriptions SET stripe_customer_id = $1 WHERE workspace_id = $2',
        ['cus_brand_new', workspaceId]
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          checkoutUrl: 'https://checkout.stripe.com/session/cs_test_456',
          sessionId: 'cs_test_456',
        }),
      }));
    });

    it('should return 500 when STRIPE_PRO_PRICE_ID is missing (line 194)', async () => {
      req.body = { workspace_id: workspaceId };
      delete process.env.STRIPE_PRO_PRICE_ID;

      // Subscription query — existing subscription WITH stripe_customer_id (skip customer creation)
      query.mockResolvedValueOnce({ rows: [{ id: 1, stripe_customer_id: 'cus_existing' }] });
      // Member count
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      // Workspace name
      query.mockResolvedValueOnce({ rows: [{ name: 'WS' }] });
      // User email/name
      query.mockResolvedValueOnce({ rows: [{ email: 'u@t.com', name: 'U' }] });

      const { createCheckoutSession } = require('../billingController');
      await createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Stripe price configuration is missing',
      }));
    });

    it('should return 500 when checkout session creation throws (lines 232-233)', async () => {
      req.body = { workspace_id: workspaceId };
      process.env.STRIPE_PRO_PRICE_ID = 'price_test_pro';

      // Subscription query — existing subscription WITH stripe_customer_id
      query.mockResolvedValueOnce({ rows: [{ id: 1, stripe_customer_id: 'cus_existing' }] });
      // Member count
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      // Workspace name
      query.mockResolvedValueOnce({ rows: [{ name: 'WS' }] });
      // User email/name
      query.mockResolvedValueOnce({ rows: [{ email: 'u@t.com', name: 'U' }] });

      mockStripeInstance.checkout.sessions.create.mockRejectedValueOnce(new Error('Stripe API error'));

      const { createCheckoutSession } = require('../billingController');
      await createCheckoutSession(req, res);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Create checkout session error'
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error creating checkout session',
      }));
    });
  });

  describe('createPortalSession — additional coverage', () => {
    it('should return 500 when portal session creation throws (lines 292-293)', async () => {
      req.body = { workspace_id: workspaceId };

      // Subscription query with stripe_customer_id
      query.mockResolvedValueOnce({ rows: [{ stripe_customer_id: 'cus_portal_test' }] });

      mockStripeInstance.billingPortal.sessions.create.mockRejectedValueOnce(
        new Error('Stripe portal error')
      );

      const { createPortalSession } = require('../billingController');
      await createPortalSession(req, res);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Create portal session error'
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error creating portal session',
      }));
    });
  });

  describe('Additional branch coverage', () => {
    it('should use fallback workspace name when workspace query returns no name (line 162)', async () => {
      req.body = { workspace_id: workspaceId };
      process.env.STRIPE_PRO_PRICE_ID = 'price_test_pro';

      // Subscription query — no existing subscription
      query.mockResolvedValueOnce({ rows: [] });
      // Member count
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      // Workspace name query returns empty row (no name field)
      query.mockResolvedValueOnce({ rows: [{}] });
      // User email/name
      query.mockResolvedValueOnce({ rows: [{ email: 'u@t.com', name: 'U' }] });

      mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_fallback' });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session/cs_test_fb',
        id: 'cs_test_fb',
      });

      const { createCheckoutSession } = require('../billingController');
      await createCheckoutSession(req, res);

      // The customer should be created with fallback workspace name 'Workspace'
      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith(expect.objectContaining({
        metadata: expect.objectContaining({
          workspace_name: 'Workspace',
        }),
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('should use invoice.metadata.workspace_id when subscription_details metadata is missing (invoice.paid)', async () => {
      const invoice = {
        id: 'inv_fallback_meta',
        amount_paid: 2000,
        period_start: 1700000000,
        period_end: 1702600000,
        invoice_pdf: 'https://stripe.com/invoice2.pdf',
        subscription_details: { metadata: {} }, // no workspace_id here
        metadata: { workspace_id: workspaceId }, // fallback
      };

      const event = {
        type: 'invoice.paid',
        data: { object: invoice },
      };

      const localMockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(localMockClient);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = {
        body: Buffer.from('raw-body'),
        headers: { 'stripe-signature': 'sig_test_123' },
        user: { id: 1 },
        params: {},
        query: {},
        cookies: {},
      };

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(localMockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoices'),
        expect.arrayContaining([workspaceId, 'inv_fallback_meta', 2000, 'paid'])
      );
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should use invoice.metadata.workspace_id when subscription_details metadata is missing (invoice.payment_failed)', async () => {
      const invoice = {
        id: 'inv_fail_fallback',
        amount_due: 3000,
        period_start: null,
        period_end: null,
        subscription_details: {},  // no metadata at all
        metadata: { workspace_id: workspaceId },
      };

      const event = {
        type: 'invoice.payment_failed',
        data: { object: invoice },
      };

      const localMockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(localMockClient);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = {
        body: Buffer.from('raw-body'),
        headers: { 'stripe-signature': 'sig_test_123' },
        user: { id: 1 },
        params: {},
        query: {},
        cookies: {},
      };

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      // Should still update subscription and insert invoice with fallback metadata
      expect(localMockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'past_due'"),
        [workspaceId]
      );
      expect(localMockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoices'),
        expect.arrayContaining([workspaceId, 'inv_fail_fallback', 3000, 'failed', null, null])
      );
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should skip invoice.paid when no workspace_id is available', async () => {
      const invoice = {
        id: 'inv_no_ws',
        amount_paid: 1000,
        period_start: 1700000000,
        period_end: 1702600000,
        invoice_pdf: 'https://stripe.com/invoice.pdf',
        subscription_details: { metadata: {} },
        metadata: {},
      };

      const event = {
        type: 'invoice.paid',
        data: { object: invoice },
      };

      const localMockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(localMockClient);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = {
        body: Buffer.from('raw-body'),
        headers: { 'stripe-signature': 'sig_test_123' },
        user: { id: 1 },
        params: {},
        query: {},
        cookies: {},
      };

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      const insertCalls = localMockClient.query.mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes('INSERT')
      );
      expect(insertCalls).toHaveLength(0);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should skip invoice.payment_failed when no workspace_id is available', async () => {
      const invoice = {
        id: 'inv_fail_no_ws',
        amount_due: 1500,
        period_start: 1700000000,
        period_end: 1702600000,
      };

      const event = {
        type: 'invoice.payment_failed',
        data: { object: invoice },
      };

      const localMockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(localMockClient);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = {
        body: Buffer.from('raw-body'),
        headers: { 'stripe-signature': 'sig_test_123' },
        user: { id: 1 },
        params: {},
        query: {},
        cookies: {},
      };

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      const dataCalls = localMockClient.query.mock.calls.filter(
        call => typeof call[0] === 'string' && (call[0].includes('UPDATE') || call[0].includes('INSERT'))
      );
      expect(dataCalls).toHaveLength(0);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should skip customer.subscription.deleted when workspace_id is missing', async () => {
      const subscription = {
        id: 'sub_del_no_ws',
        status: 'canceled',
        metadata: {},
        canceled_at: 1701000000,
      };

      const event = {
        type: 'customer.subscription.deleted',
        data: { object: subscription },
      };

      const localMockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(localMockClient);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = {
        body: Buffer.from('raw-body'),
        headers: { 'stripe-signature': 'sig_test_123' },
        user: { id: 1 },
        params: {},
        query: {},
        cookies: {},
      };

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      const updateCalls = localMockClient.query.mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes('UPDATE')
      );
      expect(updateCalls).toHaveLength(0);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle trial_will_end when no admin is found', async () => {
      const subscription = {
        id: 'sub_trial_no_admin',
        status: 'trialing',
        metadata: { workspace_id: workspaceId },
        trial_end: 1701000000,
      };

      const event = {
        type: 'customer.subscription.trial_will_end',
        data: { object: subscription },
      };

      const localMockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // admin lookup — no admin found
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };
      getClient.mockResolvedValue(localMockClient);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = {
        body: Buffer.from('raw-body'),
        headers: { 'stripe-signature': 'sig_test_123' },
        user: { id: 1 },
        params: {},
        query: {},
        cookies: {},
      };

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(queueTrialEndingEmail).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle trial_will_end when workspace_id is missing in metadata', async () => {
      const subscription = {
        id: 'sub_trial_no_ws',
        status: 'trialing',
        metadata: {},
        trial_end: 1701000000,
      };

      const event = {
        type: 'customer.subscription.trial_will_end',
        data: { object: subscription },
      };

      const localMockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(localMockClient);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = {
        body: Buffer.from('raw-body'),
        headers: { 'stripe-signature': 'sig_test_123' },
        user: { id: 1 },
        params: {},
        query: {},
        cookies: {},
      };

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(queueTrialEndingEmail).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should handle subscription with null trial_end in trial_will_end event', async () => {
      const subscription = {
        id: 'sub_trial_null_end',
        status: 'trialing',
        metadata: { workspace_id: workspaceId },
        trial_end: null,
      };

      const event = {
        type: 'customer.subscription.trial_will_end',
        data: { object: subscription },
      };

      const localMockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ email: 'admin@ws.com', name: 'Admin' }] }) // admin lookup
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };
      getClient.mockResolvedValue(localMockClient);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = {
        body: Buffer.from('raw-body'),
        headers: { 'stripe-signature': 'sig_test_123' },
        user: { id: 1 },
        params: {},
        query: {},
        cookies: {},
      };

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(queueTrialEndingEmail).toHaveBeenCalledWith(expect.objectContaining({
        trialEndDate: null,
      }));
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should default quantity to 1 when subscription items data is missing', async () => {
      const subscription = {
        id: 'sub_no_items',
        status: 'active',
        metadata: { workspace_id: workspaceId },
        trial_end: null,
        current_period_start: 1700000000,
        current_period_end: 1702600000,
        items: { data: [] },
      };

      const event = {
        type: 'customer.subscription.created',
        data: { object: subscription },
      };

      const localMockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(localMockClient);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = {
        body: Buffer.from('raw-body'),
        headers: { 'stripe-signature': 'sig_test_123' },
        user: { id: 1 },
        params: {},
        query: {},
        cookies: {},
      };

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      const updateCall = localMockClient.query.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes("SET plan_id = 'pro'")
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1][5]).toBe(1);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should map unknown Stripe status to active as default', async () => {
      const subscription = {
        id: 'sub_unknown_status',
        status: 'some_unknown_status',
        metadata: { workspace_id: workspaceId },
        trial_end: null,
        current_period_start: 1700000000,
        current_period_end: 1702600000,
        items: { data: [{ quantity: 1 }] },
      };

      const event = {
        type: 'customer.subscription.updated',
        data: { object: subscription },
      };

      const localMockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(localMockClient);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = {
        body: Buffer.from('raw-body'),
        headers: { 'stripe-signature': 'sig_test_123' },
        user: { id: 1 },
        params: {},
        query: {},
        cookies: {},
      };

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      const updateCall = localMockClient.query.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes("SET plan_id = 'pro'")
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1][1]).toBe('active');
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should hide error details in production mode via safeError (line 10)', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      req.query = { workspace_id: workspaceId };
      query.mockRejectedValueOnce(new Error('Sensitive DB error details'));

      const { getSubscription } = require('../billingController');
      await getSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error fetching subscription',
        error: undefined,
      }));

      process.env.NODE_ENV = origEnv;
    });

    it('should handle invoice.paid with null period_start and period_end (lines 416-417)', async () => {
      const invoice = {
        id: 'inv_null_periods',
        amount_paid: 500,
        period_start: null,
        period_end: null,
        invoice_pdf: 'https://stripe.com/invoice_null.pdf',
        subscription_details: { metadata: { workspace_id: workspaceId } },
      };

      const event = {
        type: 'invoice.paid',
        data: { object: invoice },
      };

      const localMockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(localMockClient);
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      req = {
        body: Buffer.from('raw-body'),
        headers: { 'stripe-signature': 'sig_test_123' },
        user: { id: 1 },
        params: {},
        query: {},
        cookies: {},
      };

      const { handleWebhook } = require('../billingController');
      await handleWebhook(req, res);

      expect(localMockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoices'),
        [workspaceId, 'inv_null_periods', 500, 'paid', null, null, 'https://stripe.com/invoice_null.pdf']
      );
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('should expose error message in non-production mode via safeError (line 10)', async () => {
      process.env.NODE_ENV = 'test';

      req.query = { workspace_id: workspaceId };
      query.mockRejectedValueOnce(new Error('DB connection lost'));

      const { getSubscription } = require('../billingController');
      await getSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error fetching subscription',
        error: 'DB connection lost',
      }));
    });
  });

  // IMPORTANT: This test uses jest.resetModules() which invalidates module caches.
  // It MUST be the last describe block to avoid breaking other tests.
  describe('getStripe — missing STRIPE_SECRET_KEY (line 17)', () => {
    it('should throw when STRIPE_SECRET_KEY is not set', async () => {
      jest.resetModules();

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
      jest.mock('stripe', () => {
        return jest.fn().mockImplementation(() => mockStripeInstance);
      });

      const savedKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      const { createCheckoutSession } = require('../billingController');

      const mockReq = {
        user: { id: 1 },
        body: { workspace_id: 'ws-123' },
        params: {},
        query: {},
        cookies: {},
        headers: {},
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      await createCheckoutSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Error creating checkout session',
      }));

      process.env.STRIPE_SECRET_KEY = savedKey;
    });
  });
});
