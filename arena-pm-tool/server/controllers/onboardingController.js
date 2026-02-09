// Onboarding Controller
// Handles workspace onboarding flow for invited users

const { query, getClient } = require('../config/database');
const logger = require('../lib/logger');

// Helper: sanitize error for response (hide internals in production)
const safeError = (error) => process.env.NODE_ENV === 'production' ? undefined : error.message;

const ONBOARDING_STEPS = ['welcome', 'profile', 'tour', 'roles', 'getting-started'];
const TOTAL_STEPS = ONBOARDING_STEPS.length;

// Get onboarding status for current user in a workspace
const getOnboardingStatus = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;

    // Verify user is a member — try with onboarding_completed_at first,
    // fall back to without it if the column doesn't exist yet.
    let memberResult;
    let onboardingColumnExists = true;
    try {
      memberResult = await query(
        `SELECT wm.role, wm.onboarding_completed_at, wm.joined_at
         FROM workspace_members wm
         WHERE wm.workspace_id = $1 AND wm.user_id = $2`,
        [workspaceId, req.user.id]
      );
    } catch (memberErr) {
      // Column onboarding_completed_at may not exist yet
      if (memberErr.message && memberErr.message.includes('onboarding_completed_at')) {
        onboardingColumnExists = false;
        memberResult = await query(
          `SELECT wm.role, wm.joined_at
           FROM workspace_members wm
           WHERE wm.workspace_id = $1 AND wm.user_id = $2`,
          [workspaceId, req.user.id]
        );
      } else {
        throw memberErr;
      }
    }

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this workspace'
      });
    }

    const membership = memberResult.rows[0];

    // Self-healing: ensure onboarding progress row exists.
    // If the table doesn't exist yet, silently skip — we'll use defaults.
    let onboardingTableExists = true;
    try {
      await query(
        `INSERT INTO workspace_onboarding_progress (workspace_id, user_id, current_step, steps_completed)
         VALUES ($1, $2, 1, '[]'::jsonb)
         ON CONFLICT (workspace_id, user_id) DO NOTHING`,
        [workspaceId, req.user.id]
      );
    } catch (insertErr) {
      console.warn('Onboarding progress table may not exist yet, using defaults:', insertErr.message);
      onboardingTableExists = false;
    }

    // Get workspace info with inviter details
    const workspaceResult = await query(
      `SELECT w.name, w.owner_id, u.name as owner_name
       FROM workspaces w
       LEFT JOIN users u ON w.owner_id = u.id
       WHERE w.id = $1`,
      [workspaceId]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Workspace not found'
      });
    }

    const workspace = workspaceResult.rows[0];

    // Get invitation info to find who invited them
    let inviteResult = { rows: [] };
    try {
      inviteResult = await query(
        `SELECT wi.role as invited_role, u.name as inviter_name, u.email as inviter_email
         FROM workspace_invitations wi
         LEFT JOIN users u ON wi.invited_by = u.id
         WHERE wi.workspace_id = $1 AND wi.email = (SELECT email FROM users WHERE id = $2)
         ORDER BY wi.accepted_at DESC NULLS LAST
         LIMIT 1`,
        [workspaceId, req.user.id]
      );
    } catch (inviteErr) {
      console.warn('Could not query invitation info for onboarding:', inviteErr.message);
    }

    // Get onboarding progress — fall back to null if table doesn't exist
    let progressResult = { rows: [] };
    if (onboardingTableExists) {
      try {
        progressResult = await query(
          `SELECT * FROM workspace_onboarding_progress
           WHERE workspace_id = $1 AND user_id = $2`,
          [workspaceId, req.user.id]
        );
      } catch (progressErr) {
        console.warn('Could not query onboarding progress, using defaults:', progressErr.message);
      }
    }

    // Get current user profile info — fall back gracefully if columns
    // like first_name / last_name don't exist yet on the deployed DB.
    let userResult = { rows: [] };
    try {
      userResult = await query(
        `SELECT id, name, first_name, last_name, email, avatar_url, avatar_color
         FROM users WHERE id = $1`,
        [req.user.id]
      );
    } catch (userErr) {
      console.warn('Could not query full user profile, falling back:', userErr.message);
      try {
        userResult = await query(
          `SELECT id, name, email, avatar_color FROM users WHERE id = $1`,
          [req.user.id]
        );
      } catch (fallbackErr) {
        console.warn('User profile fallback also failed:', fallbackErr.message);
      }
    }

    // Get workspace members for the tour step
    let membersResult = { rows: [] };
    try {
      membersResult = await query(
        `SELECT u.id, u.name, u.avatar_url, u.avatar_color, wm.role
         FROM workspace_members wm
         JOIN users u ON wm.user_id = u.id
         WHERE wm.workspace_id = $1
         ORDER BY wm.role, u.name
         LIMIT 10`,
        [workspaceId]
      );
    } catch (membersErr) {
      console.warn('Could not query workspace members for onboarding:', membersErr.message);
    }

    // Get workspace stats — each sub-select is safe on its own but the
    // query can fail if workspace_id column doesn't exist on a table.
    let statsResult = { rows: [{ member_count: '0', category_count: '0', task_count: '0' }] };
    try {
      statsResult = await query(
        `SELECT
           (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1) as member_count,
           (SELECT COUNT(*) FROM categories WHERE workspace_id = $1) as category_count,
           (SELECT COUNT(*) FROM tasks WHERE workspace_id = $1) as task_count`,
        [workspaceId]
      );
    } catch (statsErr) {
      console.warn('Could not query workspace stats for onboarding:', statsErr.message);
    }

    const progress = progressResult.rows[0] || null;
    const invitation = inviteResult.rows[0] || null;
    const stats = statsResult.rows[0];

    const memberOnboardingCompleted = onboardingColumnExists ? membership.onboarding_completed_at : null;
    const isCompleted = !!memberOnboardingCompleted || !!progress?.completed_at;
    const isSkipped = !!progress?.skipped_at;

    res.json({
      status: 'success',
      data: {
        onboarding: {
          isCompleted,
          isSkipped,
          currentStep: progress?.current_step || 1,
          stepsCompleted: progress?.steps_completed || [],
          totalSteps: TOTAL_STEPS,
          steps: ONBOARDING_STEPS,
          completedAt: progress?.completed_at || memberOnboardingCompleted,
          skippedAt: progress?.skipped_at,
        },
        workspace: {
          id: workspaceId,
          name: workspace.name,
          ownerName: workspace.owner_name,
          memberCount: parseInt(stats.member_count),
          categoryCount: parseInt(stats.category_count),
          taskCount: parseInt(stats.task_count),
        },
        invitation: invitation ? {
          inviterName: invitation.inviter_name,
          inviterEmail: invitation.inviter_email,
          role: invitation.invited_role,
        } : null,
        userRole: membership.role,
        user: userResult.rows[0] ? {
          id: userResult.rows[0].id,
          name: userResult.rows[0].name,
          firstName: userResult.rows[0].first_name,
          lastName: userResult.rows[0].last_name,
          email: userResult.rows[0].email,
          avatarUrl: userResult.rows[0].avatar_url,
          avatarColor: userResult.rows[0].avatar_color,
        } : null,
        members: membersResult.rows.map(m => ({
          id: m.id,
          name: m.name,
          avatarUrl: m.avatar_url,
          avatarColor: m.avatar_color,
          role: m.role,
        })),
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get onboarding status error');
    res.status(500).json({
      status: 'error',
      message: 'Error fetching onboarding status',
      error: safeError(error)
    });
  }
};

// Start or initialize onboarding for a user in a workspace
const startOnboarding = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;

    // Verify user is a member
    const memberResult = await query(
      `SELECT id FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.user.id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this workspace'
      });
    }

    // Upsert onboarding progress (create if not exists, reset if exists)
    let progressRow = null;
    try {
      const result = await query(
        `INSERT INTO workspace_onboarding_progress (workspace_id, user_id, current_step, steps_completed)
         VALUES ($1, $2, 1, '[]'::jsonb)
         ON CONFLICT (workspace_id, user_id)
         DO UPDATE SET current_step = 1, steps_completed = '[]'::jsonb,
                       skipped_at = NULL, completed_at = NULL,
                       updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [workspaceId, req.user.id]
      );
      progressRow = result.rows[0];
    } catch (progressErr) {
      console.warn('Could not upsert onboarding progress (table may not exist yet):', progressErr.message);
    }

    res.json({
      status: 'success',
      message: 'Onboarding started',
      data: {
        progress: {
          currentStep: progressRow?.current_step || 1,
          stepsCompleted: progressRow?.steps_completed || [],
          totalSteps: TOTAL_STEPS,
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Start onboarding error');
    res.status(500).json({
      status: 'error',
      message: 'Error starting onboarding',
      error: safeError(error)
    });
  }
};

// Update onboarding progress (mark a step as completed, advance to next)
const updateProgress = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;
    const { step, stepName } = req.body;

    if (!step && !stepName) {
      return res.status(400).json({
        status: 'error',
        message: 'step number or stepName is required'
      });
    }

    // Validate step
    const stepNum = step || (ONBOARDING_STEPS.indexOf(stepName) + 1);
    if (stepNum < 1 || stepNum > TOTAL_STEPS) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid step. Must be between 1 and ${TOTAL_STEPS}`
      });
    }

    const resolvedStepName = stepName || ONBOARDING_STEPS[stepNum - 1];

    // Verify user is a member
    const memberResult = await query(
      `SELECT id FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.user.id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this workspace'
      });
    }

    // Upsert progress, adding step to completed array
    let progress = null;
    try {
      const result = await query(
        `INSERT INTO workspace_onboarding_progress (workspace_id, user_id, current_step, steps_completed)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (workspace_id, user_id)
         DO UPDATE SET
           current_step = GREATEST(workspace_onboarding_progress.current_step, $3),
           steps_completed = (
             SELECT jsonb_agg(DISTINCT elem)
             FROM (
               SELECT jsonb_array_elements(
                 COALESCE(workspace_onboarding_progress.steps_completed, '[]'::jsonb) || $4::jsonb
               ) as elem
             ) sub
           ),
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [workspaceId, req.user.id, stepNum + 1, JSON.stringify([resolvedStepName])]
      );
      progress = result.rows[0];
    } catch (progressErr) {
      console.warn('Could not update onboarding progress (table may not exist yet):', progressErr.message);
    }

    res.json({
      status: 'success',
      message: `Step "${resolvedStepName}" completed`,
      data: {
        progress: {
          currentStep: progress ? Math.min(progress.current_step, TOTAL_STEPS) : stepNum + 1,
          stepsCompleted: progress?.steps_completed || [resolvedStepName],
          totalSteps: TOTAL_STEPS,
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Update onboarding progress error');
    res.status(500).json({
      status: 'error',
      message: 'Error updating onboarding progress',
      error: safeError(error)
    });
  }
};

// Complete onboarding
const completeOnboarding = async (req, res) => {
  const client = await getClient();

  try {
    const { id: workspaceId } = req.params;

    await client.query('BEGIN');

    // Verify user is a member
    const memberResult = await client.query(
      `SELECT id FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.user.id]
    );

    if (memberResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this workspace'
      });
    }

    // Mark onboarding as completed in progress table
    try {
      await client.query(
        `INSERT INTO workspace_onboarding_progress (workspace_id, user_id, current_step, steps_completed, completed_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())
         ON CONFLICT (workspace_id, user_id)
         DO UPDATE SET completed_at = NOW(), current_step = $3,
                       steps_completed = $4::jsonb,
                       updated_at = CURRENT_TIMESTAMP`,
        [workspaceId, req.user.id, TOTAL_STEPS, JSON.stringify(ONBOARDING_STEPS)]
      );
    } catch (progressErr) {
      console.warn('Could not update onboarding progress table (may not exist yet):', progressErr.message);
    }

    // Mark onboarding as completed in workspace_members
    try {
      await client.query(
        `UPDATE workspace_members
         SET onboarding_completed_at = NOW()
         WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, req.user.id]
      );
    } catch (memberErr) {
      console.warn('Could not update onboarding_completed_at column (may not exist yet):', memberErr.message);
    }

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Onboarding completed successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Complete onboarding error');
    res.status(500).json({
      status: 'error',
      message: 'Error completing onboarding',
      error: safeError(error)
    });
  } finally {
    client.release();
  }
};

// Skip onboarding
const skipOnboarding = async (req, res) => {
  const client = await getClient();

  try {
    const { id: workspaceId } = req.params;

    await client.query('BEGIN');

    // Verify user is a member
    const memberResult = await client.query(
      `SELECT id FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.user.id]
    );

    if (memberResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this workspace'
      });
    }

    // Mark onboarding as skipped
    try {
      await client.query(
        `INSERT INTO workspace_onboarding_progress (workspace_id, user_id, skipped_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (workspace_id, user_id)
         DO UPDATE SET skipped_at = NOW(), updated_at = CURRENT_TIMESTAMP`,
        [workspaceId, req.user.id]
      );
    } catch (progressErr) {
      console.warn('Could not update onboarding progress table (may not exist yet):', progressErr.message);
    }

    // Also mark completed in workspace_members so we don't prompt again
    try {
      await client.query(
        `UPDATE workspace_members
         SET onboarding_completed_at = NOW()
         WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, req.user.id]
      );
    } catch (memberErr) {
      console.warn('Could not update onboarding_completed_at column (may not exist yet):', memberErr.message);
    }

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Onboarding skipped'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Skip onboarding error');
    res.status(500).json({
      status: 'error',
      message: 'Error skipping onboarding',
      error: safeError(error)
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getOnboardingStatus,
  startOnboarding,
  updateProgress,
  completeOnboarding,
  skipOnboarding,
  ONBOARDING_STEPS,
  TOTAL_STEPS,
};
