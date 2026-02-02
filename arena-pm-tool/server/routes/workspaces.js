// Workspace Routes
// API endpoints for workspace management

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const workspaceController = require('../controllers/workspaceController');
const onboardingController = require('../controllers/onboardingController');

// ============================================================================
// Public Routes (no authentication required)
// ============================================================================

// GET /api/workspaces/invite-info/:token - Get invite details for landing page
router.get('/invite-info/:token', workspaceController.getInviteInfo);

// All routes below require authentication
router.use(authMiddleware);

// ============================================================================
// Workspace CRUD
// ============================================================================

// GET /api/workspaces - Get all workspaces for current user
router.get('/', workspaceController.getMyWorkspaces);

// POST /api/workspaces - Create new workspace
router.post('/', workspaceController.createWorkspace);

// GET /api/workspaces/users - Get users for workspace (for assignee dropdown)
router.get('/users', workspaceController.getWorkspaceUsers);

// GET /api/workspaces/:id - Get single workspace
router.get('/:id', workspaceController.getWorkspaceById);

// PUT /api/workspaces/:id - Update workspace
router.put('/:id', workspaceController.updateWorkspace);

// DELETE /api/workspaces/:id - Delete workspace
router.delete('/:id', workspaceController.deleteWorkspace);

// ============================================================================
// Workspace Members
// ============================================================================

// GET /api/workspaces/:id/members - Get all members of workspace
router.get('/:id/members', workspaceController.getWorkspaceMembers);

// PATCH /api/workspaces/:id/members/:memberId - Update member role
router.patch('/:id/members/:memberId', workspaceController.updateMemberRole);

// DELETE /api/workspaces/:id/members/:memberId - Remove member from workspace
router.delete('/:id/members/:memberId', workspaceController.removeMember);

// ============================================================================
// Workspace Invitations
// ============================================================================

// POST /api/workspaces/accept-invite/:token - Accept invitation (any authenticated user)
// Defined before /:id routes to prevent parameterized route conflicts
router.post('/accept-invite/:token', workspaceController.acceptInvitation);

// POST /api/workspaces/:id/invite - Invite user to workspace
router.post('/:id/invite', workspaceController.inviteToWorkspace);

// GET /api/workspaces/:id/invitations - Get pending invitations for workspace
router.get('/:id/invitations', workspaceController.getWorkspaceInvitations);

// DELETE /api/workspaces/:id/invitations/:invitationId - Cancel invitation
router.delete('/:id/invitations/:invitationId', workspaceController.cancelInvitation);

// ============================================================================
// Workspace Onboarding
// ============================================================================

// GET /api/workspaces/:id/onboarding - Get onboarding status and data
router.get('/:id/onboarding', onboardingController.getOnboardingStatus);

// POST /api/workspaces/:id/onboarding/start - Start/restart onboarding
router.post('/:id/onboarding/start', onboardingController.startOnboarding);

// PUT /api/workspaces/:id/onboarding/progress - Update step progress
router.put('/:id/onboarding/progress', onboardingController.updateProgress);

// POST /api/workspaces/:id/onboarding/complete - Mark onboarding as complete
router.post('/:id/onboarding/complete', onboardingController.completeOnboarding);

// POST /api/workspaces/:id/onboarding/skip - Skip onboarding
router.post('/:id/onboarding/skip', onboardingController.skipOnboarding);

module.exports = router;
