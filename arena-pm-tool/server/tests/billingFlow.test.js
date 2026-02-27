/**
 * Billing Flow E2E Integration Tests
 * Tests the billing controller functions directly:
 * - Free signup defaults
 * - Subscription retrieval with plan details and usage
 * - Plan listing
 * - Checkout session creation (admin vs non-admin)
 * - Portal session creation (admin vs non-admin)
 * - Webhook handling: invoice.paid, customer.subscription.deleted
 */

const { query, getClient } = require('../config/database');

jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../middleware/workspaceAuth', () => ({
  verifyWorkspaceAccess: jest.fn(),
}));

jest.mock('../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../utils/emailQueue', () => ({
  queueTrialEndingEmail: jest.fn().mockResolvedValue(true),
}));

// Mock Stripe with full method chain
const mockStripe = {
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  billingPortal: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

// Set env vars so getStripe() initializes
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_PRO_PRICE_ID = 'price_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.CLIENT_URL = 'http://localhost:3000';

const { verifyWorkspaceAccess } = require('../middleware/workspaceAuth');
const {
  getSubscription,
  getPlans,
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
} = require('../controllers/billingController');

describe('Billing Flow Integration', () => {
  let req, res;
  const workspaceId = 'ws-uuid-billing';

  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    req = createMockReq({ user: { id: 1 } });
    res = createMockRes();
    jest.clearAllMocks();
    getClient.mockResolvedValue(mockClient);
    verifyWorkspaceAccess.mockResolvedValue({ role: 'admin' });
  });

  // ------------------------------------------------------------------
  // Free signup: no subscription returns free plan
  // ------------------------------------------------------------------
  describe('Free signup defaults', () => {
    it('returns free plan when workspace has no subscription', async () => {
      req.query = { workspace_id: workspaceId };
      query.mockResolvedValueOnce({ rows: [] }); // no subscription

      await getSubscription(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          subscription: null,
          plan: { id: 'free', name: 'Free' },
        }),
      }));
    });
  });

  // ------------------------------------------------------------------
  // Get subscription with plan details and usage
  // ------------------------------------------------------------------
  describe('Get subscription', () => {
    it('returns subscription with plan details and usage stats', async () => {
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
          current_period_start: new Date('2026-02-01'),
          current_period_end: new Date('2026-03-01'),
          price_per_seat_cents: 300,
          max_members: 50,
          max_tasks_per_workspace: null,
          features: { calendar: true, reminders: true },
          created_at: new Date('2026-01-15'),
        }],
      });
      // Task count
      query.mockResolvedValueOnce({ rows: [{ count: '42' }] });
      // Member count
      query.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await getSubscription(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          subscription: expect.objectContaining({
            planId: 'pro',
            planName: 'Pro',
            status: 'active',
            seatCount: 5,
            pricePerSeatCents: 300,
          }),
          plan: expect.objectContaining({
            id: 'pro',
            name: 'Pro',
            maxMembers: 50,
            maxTasksPerWorkspace: null,
            features: { calendar: true, reminders: true },
          }),
          usage: {
            tasks: 42,
            members: 5,
          },
        }),
      }));
    });
  });

  // ------------------------------------------------------------------
  // Get available plans
  // ------------------------------------------------------------------
  describe('Get available plans', () => {
    it('returns all active plans ordered by price', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { id: 'free', name: 'Free', price_per_seat_cents: 0, max_members: 3, max_tasks_per_workspace: 50, features: {} },
          { id: 'pro', name: 'Pro', price_per_seat_cents: 300, max_members: 50, max_tasks_per_workspace: null, features: { calendar: true } },
        ],
      });

      await getPlans(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('active = true'),
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: {
          plans: [
            expect.objectContaining({ id: 'free', pricePerSeatCents: 0, maxMembers: 3 }),
            expect.objectContaining({ id: 'pro', pricePerSeatCents: 300, maxMembers: 50 }),
          ],
        },
      }));
    });
  });

  // ------------------------------------------------------------------
  // Create checkout session
  // ------------------------------------------------------------------
  describe('Create checkout session', () => {
    it('creates Stripe checkout session for admin user', async () => {
      req.body = { workspace_id: workspaceId };
      verifyWorkspaceAccess.mockResolvedValue({ role: 'admin' });

      // Subscription check
      query.mockResolvedValueOnce({ rows: [] });
      // Member count
      query.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      // Workspace name
      query.mockResolvedValueOnce({ rows: [{ name: 'Test Workspace' }] });
      // User email/name
      query.mockResolvedValueOnce({ rows: [{ email: 'admin@example.com', name: 'Admin User' }] });

      mockStripe.customers.create.mockResolvedValue({ id: 'cus_test123' });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session/test',
        id: 'cs_test_123',
      });

      await createCheckoutSession(req, res);

      expect(mockStripe.customers.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'admin@example.com',
        metadata: expect.objectContaining({ workspace_id: workspaceId }),
      }));
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'subscription',
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price: 'price_test_fake',
            quantity: 3,
          }),
        ]),
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          checkoutUrl: 'https://checkout.stripe.com/session/test',
          sessionId: 'cs_test_123',
        }),
      }));
    });

    it('blocks non-admin from creating checkout session', async () => {
      req.body = { workspace_id: workspaceId };
      verifyWorkspaceAccess.mockResolvedValue({ role: 'member' });

      await createCheckoutSession(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Only workspace admins can manage billing',
      }));
    });
  });

  // ------------------------------------------------------------------
  // Create portal session
  // ------------------------------------------------------------------
  describe('Create portal session', () => {
    it('creates Stripe portal session for admin user', async () => {
      req.body = { workspace_id: workspaceId };
      verifyWorkspaceAccess.mockResolvedValue({ role: 'admin' });

      query.mockResolvedValueOnce({
        rows: [{ stripe_customer_id: 'cus_existing123' }],
      });

      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal/test',
      });

      await createPortalSession(req, res);

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
        customer: 'cus_existing123',
        return_url: 'http://localhost:3000/billing',
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          portalUrl: 'https://billing.stripe.com/portal/test',
        }),
      }));
    });

    it('blocks non-admin from creating portal session', async () => {
      req.body = { workspace_id: workspaceId };
      verifyWorkspaceAccess.mockResolvedValue({ role: 'member' });

      await createPortalSession(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Only workspace admins can manage billing',
      }));
    });
  });

  // ------------------------------------------------------------------
  // Webhook: invoice.paid
  // ------------------------------------------------------------------
  describe('Webhook: invoice.paid', () => {
    it('records paid invoice in the invoices table', async () => {
      const invoiceEvent = {
        type: 'invoice.paid',
        data: {
          object: {
            id: 'inv_test_123',
            amount_paid: 900,
            subscription_details: { metadata: { workspace_id: workspaceId } },
            period_start: Math.floor(Date.now() / 1000),
            period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
            invoice_pdf: 'https://stripe.com/invoice.pdf',
          },
        },
      };

      req.headers = { 'stripe-signature': 'sig_test' };
      req.body = Buffer.from('raw-body');
      mockStripe.webhooks.constructEvent.mockReturnValue(invoiceEvent);

      mockClient.query.mockResolvedValue({ rows: [] }); // BEGIN, INSERT, COMMIT

      await handleWebhook(req, res);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        req.body,
        'sig_test',
        'whsec_test_fake',
      );
      // Verify BEGIN was called
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      // Verify INSERT INTO invoices was called
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoices'),
        expect.arrayContaining([workspaceId, 'inv_test_123', 900, 'paid']),
      );
      // Verify COMMIT
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  // ------------------------------------------------------------------
  // Webhook: customer.subscription.deleted
  // ------------------------------------------------------------------
  describe('Webhook: customer.subscription.deleted', () => {
    it('downgrades workspace to free plan', async () => {
      const deletedEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_456',
            metadata: { workspace_id: workspaceId },
          },
        },
      };

      req.headers = { 'stripe-signature': 'sig_test' };
      req.body = Buffer.from('raw-body');
      mockStripe.webhooks.constructEvent.mockReturnValue(deletedEvent);

      mockClient.query.mockResolvedValue({ rows: [] });

      await handleWebhook(req, res);

      // Verify the downgrade UPDATE was called
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("plan_id = 'free'"),
        [workspaceId],
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });
});
