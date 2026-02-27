// Billing Routes
// Defines all billing/subscription-related API endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const withErrorHandling = require('../lib/withErrorHandling');
const billingController = require('../controllers/billingController');

// Public: get available plans (no auth needed)
router.get('/plans', withErrorHandling(billingController.getPlans));

// Stripe webhook — must use raw body (not JSON-parsed).
// This route is registered BEFORE the authMiddleware and BEFORE express.json()
// in server.js to receive the raw body for signature verification.
// We export the handler separately for server.js to wire up.

// All other billing routes require authentication
router.use(authMiddleware);

// GET /api/billing/subscription — Get current workspace subscription
router.get('/subscription', withErrorHandling(billingController.getSubscription));

// POST /api/billing/checkout — Create Stripe Checkout Session
router.post('/checkout', withErrorHandling(billingController.createCheckoutSession));

// POST /api/billing/portal — Create Stripe Customer Portal session
router.post('/portal', withErrorHandling(billingController.createPortalSession));

module.exports = router;
