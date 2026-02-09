// Workspace Routes
// API endpoints for workspace management

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { inviteLimiter } = require('../middleware/rateLimiter');
const { requireActiveSubscription } = require('../middleware/billingGuard');
const { checkMemberLimit, checkWorkspaceLimit } = require('../middleware/planLimits');
const withErrorHandling = require('../lib/withErrorHandling');
const validate = require('../middleware/validate');
const { createWorkspaceSchema, updateWorkspaceSchema, inviteToWorkspaceSchema } = require('../middleware/schemas');
const { auditLog } = require('../middleware/auditLog');
const workspaceController = require('../controllers/workspaceController');
const onboardingController = require('../controllers/onboardingController');

// ============================================================================
// Public Routes (no authentication required)
// ============================================================================

// GET /api/workspaces/invite-info/:token - Get invite details for landing page
router.get('/invite-info/:token', withErrorHandling(workspaceController.getInviteInfo));

// All routes below require authentication
router.use(authMiddleware);

// ============================================================================
// Workspace CRUD
// ============================================================================

// GET /api/workspaces - Get all workspaces for current user
router.get('/', withErrorHandling(workspaceController.getMyWorkspaces));

// POST /api/workspaces - Create new workspace (plan limit enforced)
router.post('/', checkWorkspaceLimit, validate(createWorkspaceSchema), auditLog('create', 'workspace'), workspaceController.createWorkspace);

// GET /api/workspaces/users - Get users for workspace (for assignee dropdown)
router.get('/users', withErrorHandling(workspaceController.getWorkspaceUsers));

// GET /api/workspaces/:id - Get single workspace
router.get('/:id', withErrorHandling(workspaceController.getWorkspaceById));

// PUT /api/workspaces/:id - Update workspace
router.put('/:id', validate(updateWorkspaceSchema), auditLog('update', 'workspace'), withErrorHandling(workspaceController.updateWorkspace));

// DELETE /api/workspaces/:id - Delete workspace
router.delete('/:id', auditLog('delete', 'workspace'), withErrorHandling(workspaceController.deleteWorkspace));

// ============================================================================
// Workspace Members
// ============================================================================

// GET /api/workspaces/:id/members - Get all members of workspace
router.get('/:id/members', withErrorHandling(workspaceController.getWorkspaceMembers));

// PATCH /api/workspaces/:id/members/:memberId - Update member role
router.patch('/:id/members/:memberId', withErrorHandling(workspaceController.updateMemberRole));

// DELETE /api/workspaces/:id/members/:memberId - Remove member from workspace
router.delete('/:id/members/:memberId', withErrorHandling(workspaceController.removeMember));

// ============================================================================
// Workspace Invitations
// ============================================================================

// POST /api/workspaces/accept-invite/:token - Accept invitation (any authenticated user)
// Defined before /:id routes to prevent parameterized route conflicts
router.post('/accept-invite/:token', withErrorHandling(workspaceController.acceptInvitation));

// POST /api/workspaces/:id/invite - Invite user to workspace (rate + plan limited)
router.post('/:id/invite', inviteLimiter, requireActiveSubscription, checkMemberLimit, validate(inviteToWorkspaceSchema), workspaceController.inviteToWorkspace);

// GET /api/workspaces/:id/invitations - Get pending invitations for workspace
router.get('/:id/invitations', withErrorHandling(workspaceController.getWorkspaceInvitations));

// DELETE /api/workspaces/:id/invitations/:invitationId - Cancel invitation
router.delete('/:id/invitations/:invitationId', withErrorHandling(workspaceController.cancelInvitation));

// ============================================================================
// Workspace Activity Feed
// ============================================================================

// GET /api/workspaces/:id/activity - Get activity feed for workspace
router.get('/:id/activity', withErrorHandling(workspaceController.getWorkspaceActivity));

// GET /api/workspaces/:id/audit-log - View audit log (admin only)
router.get('/:id/audit-log', withErrorHandling(workspaceController.getAuditLog));

// ============================================================================
// Workspace Onboarding
// ============================================================================

// GET /api/workspaces/:id/onboarding - Get onboarding status and data
router.get('/:id/onboarding', withErrorHandling(onboardingController.getOnboardingStatus));

// POST /api/workspaces/:id/onboarding/start - Start/restart onboarding
router.post('/:id/onboarding/start', withErrorHandling(onboardingController.startOnboarding));

// PUT /api/workspaces/:id/onboarding/progress - Update step progress
router.put('/:id/onboarding/progress', withErrorHandling(onboardingController.updateProgress));

// POST /api/workspaces/:id/onboarding/complete - Mark onboarding as complete
router.post('/:id/onboarding/complete', withErrorHandling(onboardingController.completeOnboarding));

// POST /api/workspaces/:id/onboarding/skip - Skip onboarding
router.post('/:id/onboarding/skip', withErrorHandling(onboardingController.skipOnboarding));

module.exports = router;
