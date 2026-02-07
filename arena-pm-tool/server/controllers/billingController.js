// Billing Controller
// Handles Stripe checkout, portal, subscription status, and webhook processing

const { query, getClient } = require('../config/database');
const { verifyWorkspaceAccess } = require('../middleware/workspaceAuth');

// Helper: sanitize error for response (hide internals in production)
const safeError = (error) => process.env.NODE_ENV === 'production' ? undefined : error.message;

// Lazy-load Stripe to avoid crashes when STRIPE_SECRET_KEY is not set (e.g. tests)
let _stripe = null;
const getStripe = () => {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    const Stripe = require('stripe');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
};

// ============================================================================
// GET /api/billing/subscription — Get current workspace subscription status
// ============================================================================
const getSubscription = async (req, res) => {
  try {
    const { workspace_id } = req.query;

    if (!workspace_id) {
      return res.status(400).json({
        status: 'error',
        message: 'workspace_id is required',
      });
    }

    // Verify user has access to this workspace
    const membership = await verifyWorkspaceAccess(req.user.id, workspace_id);
    if (!membership) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this workspace',
      });
    }

    const result = await query(
      `SELECT s.*, p.name as plan_name, p.price_per_seat_cents,
              p.max_members, p.max_tasks_per_workspace, p.features
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.workspace_id = $1`,
      [workspace_id]
    );

    if (result.rows.length === 0) {
      return res.json({
        status: 'success',
        data: {
          subscription: null,
          plan: { id: 'free', name: 'Free' },
        },
      });
    }

    const sub = result.rows[0];

    // Get current usage stats
    const [taskCount, memberCount] = await Promise.all([
      query(
        'SELECT COUNT(*) as count FROM tasks WHERE workspace_id = $1 AND parent_task_id IS NULL',
        [workspace_id]
      ),
      query(
        'SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = $1',
        [workspace_id]
      ),
    ]);

    res.json({
      status: 'success',
      data: {
        subscription: {
          id: sub.id,
          planId: sub.plan_id,
          planName: sub.plan_name,
          status: sub.status,
          seatCount: sub.seat_count,
          trialEndsAt: sub.trial_ends_at,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          pricePerSeatCents: sub.price_per_seat_cents,
          createdAt: sub.created_at,
        },
        plan: {
          id: sub.plan_id,
          name: sub.plan_name,
          pricePerSeatCents: sub.price_per_seat_cents,
          maxMembers: sub.max_members,
          maxTasksPerWorkspace: sub.max_tasks_per_workspace,
          features: sub.features,
        },
        usage: {
          tasks: parseInt(taskCount.rows[0].count),
          members: parseInt(memberCount.rows[0].count),
        },
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching subscription',
      error: safeError(error),
    });
  }
};

// ============================================================================
// POST /api/billing/checkout — Create Stripe Checkout Session
// ============================================================================
const createCheckoutSession = async (req, res) => {
  try {
    const stripe = getStripe();
    const { workspace_id } = req.body;

    if (!workspace_id) {
      return res.status(400).json({
        status: 'error',
        message: 'workspace_id is required',
      });
    }

    // Verify user is workspace admin
    const membership = await verifyWorkspaceAccess(req.user.id, workspace_id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only workspace admins can manage billing',
      });
    }

    // Get current subscription
    const subResult = await query(
      'SELECT * FROM subscriptions WHERE workspace_id = $1',
      [workspace_id]
    );

    // Get workspace member count for seat quantity
    const memberResult = await query(
      'SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = $1',
      [workspace_id]
    );
    const seatCount = Math.max(parseInt(memberResult.rows[0].count), 1);

    // Get workspace info
    const wsResult = await query(
      'SELECT name FROM workspaces WHERE id = $1',
      [workspace_id]
    );
    const workspaceName = wsResult.rows[0]?.name || 'Workspace';

    // Get user email for customer
    const userResult = await query(
      'SELECT email, name FROM users WHERE id = $1',
      [req.user.id]
    );

    let stripeCustomerId = subResult.rows[0]?.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userResult.rows[0].email,
        name: userResult.rows[0].name,
        metadata: {
          workspace_id,
          workspace_name: workspaceName,
        },
      });
      stripeCustomerId = customer.id;

      // Save the customer ID
      if (subResult.rows.length > 0) {
        await query(
          'UPDATE subscriptions SET stripe_customer_id = $1 WHERE workspace_id = $2',
          [stripeCustomerId, workspace_id]
        );
      }
    }

    if (!process.env.STRIPE_PRO_PRICE_ID) {
      return res.status(500).json({
        status: 'error',
        message: 'Stripe price configuration is missing',
      });
    }

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: seatCount,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          workspace_id,
        },
      },
      success_url: `${clientUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${clientUrl}/settings/billing?canceled=true`,
      metadata: {
        workspace_id,
      },
    });

    res.json({
      status: 'success',
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating checkout session',
      error: safeError(error),
    });
  }
};

// ============================================================================
// POST /api/billing/portal — Create Stripe Customer Portal session
// ============================================================================
const createPortalSession = async (req, res) => {
  try {
    const stripe = getStripe();
    const { workspace_id } = req.body;

    if (!workspace_id) {
      return res.status(400).json({
        status: 'error',
        message: 'workspace_id is required',
      });
    }

    // Verify user is workspace admin
    const membership = await verifyWorkspaceAccess(req.user.id, workspace_id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only workspace admins can manage billing',
      });
    }

    // Get Stripe customer ID
    const subResult = await query(
      'SELECT stripe_customer_id FROM subscriptions WHERE workspace_id = $1',
      [workspace_id]
    );

    if (!subResult.rows[0]?.stripe_customer_id) {
      return res.status(400).json({
        status: 'error',
        message: 'No billing account found. Please set up billing first.',
      });
    }

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subResult.rows[0].stripe_customer_id,
      return_url: `${clientUrl}/settings/billing`,
    });

    res.json({
      status: 'success',
      data: {
        portalUrl: portalSession.url,
      },
    });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating portal session',
      error: safeError(error),
    });
  }
};

// ============================================================================
// POST /api/billing/webhook — Stripe webhook handler
// ============================================================================
const handleWebhook = async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw body (must be Buffer, not parsed JSON)
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    switch (event.type) {
      // ----------------------------------------------------------------
      // Subscription created or updated
      // ----------------------------------------------------------------
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const workspaceId = subscription.metadata?.workspace_id;

        if (!workspaceId) {
          console.warn('Webhook: subscription event missing workspace_id metadata');
          break;
        }

        const status = mapStripeStatus(subscription.status);

        await client.query(
          `UPDATE subscriptions
           SET plan_id = 'pro',
               stripe_subscription_id = $1,
               status = $2,
               trial_ends_at = $3,
               current_period_start = $4,
               current_period_end = $5,
               seat_count = $6,
               updated_at = NOW()
           WHERE workspace_id = $7`,
          [
            subscription.id,
            status,
            subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            new Date(subscription.current_period_start * 1000),
            new Date(subscription.current_period_end * 1000),
            subscription.items?.data?.[0]?.quantity || 1,
            workspaceId,
          ]
        );
        break;
      }

      // ----------------------------------------------------------------
      // Subscription deleted (canceled and expired)
      // ----------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const workspaceId = subscription.metadata?.workspace_id;

        if (!workspaceId) break;

        // Downgrade to free plan
        await client.query(
          `UPDATE subscriptions
           SET plan_id = 'free',
               stripe_subscription_id = NULL,
               status = 'active',
               trial_ends_at = NULL,
               current_period_start = NULL,
               current_period_end = NULL,
               updated_at = NOW()
           WHERE workspace_id = $1`,
          [workspaceId]
        );
        break;
      }

      // ----------------------------------------------------------------
      // Invoice paid - record the invoice
      // ----------------------------------------------------------------
      case 'invoice.paid': {
        const invoice = event.data.object;
        const workspaceId = invoice.subscription_details?.metadata?.workspace_id
          || invoice.metadata?.workspace_id;

        if (!workspaceId) break;

        await client.query(
          `INSERT INTO invoices (workspace_id, stripe_invoice_id, amount_cents, status, period_start, period_end, pdf_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [
            workspaceId,
            invoice.id,
            invoice.amount_paid,
            'paid',
            invoice.period_start ? new Date(invoice.period_start * 1000) : null,
            invoice.period_end ? new Date(invoice.period_end * 1000) : null,
            invoice.invoice_pdf,
          ]
        );
        break;
      }

      // ----------------------------------------------------------------
      // Invoice payment failed
      // ----------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const workspaceId = invoice.subscription_details?.metadata?.workspace_id
          || invoice.metadata?.workspace_id;

        if (!workspaceId) break;

        await client.query(
          `UPDATE subscriptions
           SET status = 'past_due', updated_at = NOW()
           WHERE workspace_id = $1`,
          [workspaceId]
        );

        await client.query(
          `INSERT INTO invoices (workspace_id, stripe_invoice_id, amount_cents, status, period_start, period_end)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [
            workspaceId,
            invoice.id,
            invoice.amount_due,
            'failed',
            invoice.period_start ? new Date(invoice.period_start * 1000) : null,
            invoice.period_end ? new Date(invoice.period_end * 1000) : null,
          ]
        );
        break;
      }

      // ----------------------------------------------------------------
      // Trial will end - could send notification email here
      // ----------------------------------------------------------------
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object;
        const workspaceId = subscription.metadata?.workspace_id;
        if (workspaceId) {
          console.log(`Trial ending soon for workspace ${workspaceId}`);
          // TODO: Send trial-ending notification email to workspace admin
        }
        break;
      }

      default:
        // Unhandled event type - ignore silently
        break;
    }

    await client.query('COMMIT');

    res.json({ received: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  } finally {
    client.release();
  }
};

// ============================================================================
// GET /api/billing/plans — Get available plans
// ============================================================================
const getPlans = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM plans WHERE active = true ORDER BY price_per_seat_cents ASC'
    );

    res.json({
      status: 'success',
      data: {
        plans: result.rows.map((plan) => ({
          id: plan.id,
          name: plan.name,
          pricePerSeatCents: plan.price_per_seat_cents,
          maxMembers: plan.max_members,
          maxTasksPerWorkspace: plan.max_tasks_per_workspace,
          features: plan.features,
        })),
      },
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching plans',
      error: safeError(error),
    });
  }
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map Stripe subscription status to our internal status values
 */
function mapStripeStatus(stripeStatus) {
  const statusMap = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    trialing: 'trialing',
    unpaid: 'past_due',
    incomplete: 'past_due',
    incomplete_expired: 'canceled',
    paused: 'canceled',
  };
  return statusMap[stripeStatus] || 'active';
}

module.exports = {
  getSubscription,
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  getPlans,
};
