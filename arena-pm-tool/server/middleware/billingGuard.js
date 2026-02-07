// Billing Guard Middleware
// Checks workspace subscription status before allowing write operations.
// Returns 402 Payment Required for expired/canceled subscriptions.

const { query } = require('../config/database');

/**
 * Get workspace_id from the request (body, query, or params).
 * Falls back to looking up workspace_id from a task or category if needed.
 */
const getWorkspaceIdFromRequest = (req) => {
  return req.body?.workspace_id
    || req.query?.workspace_id
    || req.params?.workspaceId
    || req.workspace?.id;
};

/**
 * Middleware: require an active or trialing subscription.
 * Blocks requests with 402 if the workspace subscription is canceled or past_due.
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceIdFromRequest(req);

    // If no workspace context, skip billing check (endpoint might not be workspace-scoped)
    if (!workspaceId) {
      return next();
    }

    const result = await query(
      `SELECT s.status, s.plan_id, p.name as plan_name
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.workspace_id = $1`,
      [workspaceId]
    );

    // No subscription found — treat as free tier (active)
    if (result.rows.length === 0) {
      req.subscription = { planId: 'free', status: 'active' };
      return next();
    }

    const sub = result.rows[0];

    if (sub.status === 'canceled') {
      return res.status(402).json({
        status: 'error',
        code: 'SUBSCRIPTION_CANCELED',
        message: 'Your subscription has been canceled. Please resubscribe to continue using this workspace.',
      });
    }

    if (sub.status === 'past_due') {
      return res.status(402).json({
        status: 'error',
        code: 'PAYMENT_PAST_DUE',
        message: 'Your payment is past due. Please update your payment method to continue.',
      });
    }

    // Attach subscription info to request for downstream use
    req.subscription = {
      planId: sub.plan_id,
      planName: sub.plan_name,
      status: sub.status,
    };

    next();
  } catch (error) {
    console.error('Billing guard error:', error);
    // Don't block the request on billing check failure — fail open
    // so users aren't locked out due to a billing system bug
    next();
  }
};

module.exports = {
  requireActiveSubscription,
};
