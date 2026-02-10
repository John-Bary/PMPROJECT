// Plan Limits Middleware
// Enforces usage limits based on workspace subscription plan.
// Checks task count, member count, and workspace count limits.

const { query } = require('../config/database');
const logger = require('../lib/logger');

/**
 * Get workspace_id from the request (body, query, or params).
 */
const getWorkspaceIdFromRequest = (req) => {
  return req.body?.workspace_id
    || req.query?.workspace_id
    || req.params?.workspaceId
    || req.params?.id
    || req.workspace?.id;
};

/**
 * Load the workspace plan limits from the database.
 * Returns { planId, maxMembers, maxTasksPerWorkspace, features } or null.
 */
const getWorkspacePlanLimits = async (workspaceId) => {
  const result = await query(
    `SELECT p.id as plan_id, p.max_members, p.max_tasks_per_workspace, p.features
     FROM subscriptions s
     JOIN plans p ON s.plan_id = p.id
     WHERE s.workspace_id = $1 AND s.status IN ('active', 'trialing')`,
    [workspaceId]
  );

  if (result.rows.length === 0) {
    // No subscription or not active — enforce free plan defaults
    return {
      planId: 'free',
      maxMembers: 3,
      maxTasksPerWorkspace: 50,
      features: {},
    };
  }

  return {
    planId: result.rows[0].plan_id,
    maxMembers: result.rows[0].max_members,
    maxTasksPerWorkspace: result.rows[0].max_tasks_per_workspace,
    features: result.rows[0].features || {},
  };
};

/**
 * Middleware: enforce task creation limit.
 * Use on POST /api/tasks.
 */
const checkTaskLimit = async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceIdFromRequest(req);
    if (!workspaceId) return next();

    const plan = await getWorkspacePlanLimits(workspaceId);

    // NULL max = unlimited
    if (plan.maxTasksPerWorkspace === null || plan.maxTasksPerWorkspace === undefined) {
      req.planLimits = plan;
      return next();
    }

    // Count current top-level tasks (exclude subtasks)
    const countResult = await query(
      'SELECT COUNT(*) as count FROM tasks WHERE workspace_id = $1 AND parent_task_id IS NULL',
      [workspaceId]
    );
    const currentCount = parseInt(countResult.rows[0].count);

    if (currentCount >= plan.maxTasksPerWorkspace) {
      return res.status(403).json({
        status: 'error',
        code: 'PLAN_LIMIT_TASKS',
        message: `Your workspace has reached the ${plan.maxTasksPerWorkspace}-task limit on the ${plan.planId === 'free' ? 'Free' : plan.planId} plan. Upgrade to Pro for unlimited tasks.`,
        limit: plan.maxTasksPerWorkspace,
        current: currentCount,
        planId: plan.planId,
      });
    }

    req.planLimits = plan;
    next();
  } catch (error) {
    logger.error({ err: error }, 'Check task limit error');
    // Fail open — don't block users due to limit-check bugs
    next();
  }
};

/**
 * Middleware: enforce member/invite limit.
 * Use on POST /api/workspaces/:id/invite.
 */
const checkMemberLimit = async (req, res, next) => {
  try {
    const workspaceId = req.params?.id || getWorkspaceIdFromRequest(req);
    if (!workspaceId) return next();

    const plan = await getWorkspacePlanLimits(workspaceId);

    // NULL max = unlimited
    if (plan.maxMembers === null || plan.maxMembers === undefined) {
      req.planLimits = plan;
      return next();
    }

    // Count current members + pending invitations
    const [membersResult, invitesResult] = await Promise.all([
      query(
        'SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = $1',
        [workspaceId]
      ),
      query(
        `SELECT COUNT(*) as count FROM workspace_invitations
         WHERE workspace_id = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
        [workspaceId]
      ),
    ]);

    const totalSeats = parseInt(membersResult.rows[0].count) + parseInt(invitesResult.rows[0].count);

    if (totalSeats >= plan.maxMembers) {
      return res.status(403).json({
        status: 'error',
        code: 'PLAN_LIMIT_MEMBERS',
        message: `Your workspace has reached the ${plan.maxMembers}-member limit on the ${plan.planId === 'free' ? 'Free' : plan.planId} plan. Upgrade to Pro for up to 50 members.`,
        limit: plan.maxMembers,
        current: totalSeats,
        planId: plan.planId,
      });
    }

    req.planLimits = plan;
    next();
  } catch (error) {
    logger.error({ err: error }, 'Check member limit error');
    // Fail open
    next();
  }
};

/**
 * Middleware: enforce workspace creation limit per user.
 * Use on POST /api/workspaces.
 * Free users: 1 workspace. Pro users: workspaces are checked by current plan.
 */
const checkWorkspaceLimit = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next();

    // Count workspaces owned by the user
    const countResult = await query(
      'SELECT COUNT(*) as count FROM workspaces WHERE owner_id = $1',
      [userId]
    );
    const currentCount = parseInt(countResult.rows[0].count);

    // Check if any of the user's workspaces have a pro subscription
    const proResult = await query(
      `SELECT 1 FROM subscriptions s
       JOIN workspaces w ON s.workspace_id = w.id
       WHERE w.owner_id = $1 AND s.plan_id = 'pro' AND s.status IN ('active', 'trialing')
       LIMIT 1`,
      [userId]
    );
    const hasPro = proResult.rows.length > 0;

    // Free plan: 1 workspace owned, Pro: up to 10 (existing BIZ-01 limit)
    const maxWorkspaces = hasPro ? 10 : 1;

    if (currentCount >= maxWorkspaces) {
      if (!hasPro) {
        return res.status(403).json({
          status: 'error',
          code: 'PLAN_LIMIT_WORKSPACES',
          message: 'Free plan allows 1 workspace. Upgrade to Pro for up to 10 workspaces.',
          limit: maxWorkspaces,
          current: currentCount,
          planId: 'free',
        });
      }
      // For pro users, fall through to the existing BIZ-01 check in the controller
    }

    next();
  } catch (error) {
    logger.error({ err: error }, 'Check workspace limit error');
    // Fail open
    next();
  }
};

module.exports = {
  checkTaskLimit,
  checkMemberLimit,
  checkWorkspaceLimit,
  getWorkspacePlanLimits,
};
