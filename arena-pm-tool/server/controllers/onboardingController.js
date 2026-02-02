// Onboarding Controller
// Handles workspace onboarding flow for invited users

const { query, getClient } = require('../config/database');

const ONBOARDING_STEPS = ['welcome', 'profile', 'tour', 'roles', 'getting-started'];
const TOTAL_STEPS = ONBOARDING_STEPS.length;

// Get onboarding status for current user in a workspace
const getOnboardingStatus = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;

    // Verify user is a member
    const memberResult = await query(
      `SELECT wm.role, wm.onboarding_completed_at, wm.joined_at
       FROM workspace_members wm
       WHERE wm.workspace_id = $1 AND wm.user_id = $2`,
      [workspaceId, req.user.id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this workspace'
      });
    }

    const membership = memberResult.rows[0];

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

    // ---- Non-critical queries: failures use fallback values ----

    // Get invitation info to find who invited them
    let invitation = null;
    try {
      const inviteResult = await query(
        `SELECT wi.role as invited_role, u.name as inviter_name, u.email as inviter_email
         FROM workspace_invitations wi
         LEFT JOIN users u ON wi.invited_by = u.id
         WHERE wi.workspace_id = $1 AND wi.email = (SELECT email FROM users WHERE id = $2)
         ORDER BY wi.accepted_at DESC NULLS LAST
         LIMIT 1`,
        [workspaceId, req.user.id]
      );
      invitation = inviteResult.rows[0] || null;
    } catch (err) {
      console.error('Non-fatal: Failed to fetch invitation info:', err.message);
    }

    // Get onboarding progress
    let progress = null;
    try {
      const progressResult = await query(
        `SELECT * FROM workspace_onboarding_progress
         WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, req.user.id]
      );
      progress = progressResult.rows[0] || null;
    } catch (err) {
      console.error('Non-fatal: Failed to fetch onboarding progress:', err.message);
    }

    // Get current user profile info
    let userProfile = null;
    try {
      const userResult = await query(
        `SELECT id, name, first_name, last_name, email, avatar_url, avatar_color
         FROM users WHERE id = $1`,
        [req.user.id]
      );
      userProfile = userResult.rows[0] || null;
    } catch (err) {
      console.error('Non-fatal: Failed to fetch user profile:', err.message);
    }

    // Get workspace members for the tour step
    let membersList = [];
    try {
      const membersResult = await query(
        `SELECT u.id, u.name, u.avatar_url, u.avatar_color, wm.role
         FROM workspace_members wm
         JOIN users u ON wm.user_id = u.id
         WHERE wm.workspace_id = $1
         ORDER BY wm.role, u.name
         LIMIT 10`,
        [workspaceId]
      );
      membersList = membersResult.rows;
    } catch (err) {
      console.error('Non-fatal: Failed to fetch members list:', err.message);
    }

    // Get workspace stats
    let stats = { member_count: '0', category_count: '0', task_count: '0' };
    try {
      const statsResult = await query(
        `SELECT
           (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1) as member_count,
           (SELECT COUNT(*) FROM categories WHERE workspace_id = $1) as category_count,
           (SELECT COUNT(*) FROM tasks WHERE workspace_id = $1) as task_count`,
        [workspaceId]
      );
      stats = statsResult.rows[0] || stats;
    } catch (err) {
      console.error('Non-fatal: Failed to fetch workspace stats:', err.message);
    }

    const isCompleted = !!membership.onboarding_completed_at || !!progress?.completed_at;
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
          completedAt: progress?.completed_at || membership.onboarding_completed_at,
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
        user: userProfile ? {
          id: userProfile.id,
          name: userProfile.name,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          email: userProfile.email,
          avatarUrl: userProfile.avatar_url,
          avatarColor: userProfile.avatar_color,
        } : null,
        members: membersList.map(m => ({
          id: m.id,
          name: m.name,
          avatarUrl: m.avatar_url,
          avatarColor: m.avatar_color,
          role: m.role,
        })),
      }
    });
  } catch (error) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching onboarding status',
      error: error.message
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

    res.json({
      status: 'success',
      message: 'Onboarding started',
      data: {
        progress: {
          currentStep: result.rows[0].current_step,
          stepsCompleted: result.rows[0].steps_completed,
          totalSteps: TOTAL_STEPS,
        }
      }
    });
  } catch (error) {
    console.error('Start onboarding error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error starting onboarding',
      error: error.message
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

    const progress = result.rows[0];

    res.json({
      status: 'success',
      message: `Step "${resolvedStepName}" completed`,
      data: {
        progress: {
          currentStep: Math.min(progress.current_step, TOTAL_STEPS),
          stepsCompleted: progress.steps_completed || [],
          totalSteps: TOTAL_STEPS,
        }
      }
    });
  } catch (error) {
    console.error('Update onboarding progress error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating onboarding progress',
      error: error.message
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
    await client.query(
      `INSERT INTO workspace_onboarding_progress (workspace_id, user_id, current_step, steps_completed, completed_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (workspace_id, user_id)
       DO UPDATE SET completed_at = NOW(), current_step = $3,
                     steps_completed = $4::jsonb,
                     updated_at = CURRENT_TIMESTAMP`,
      [workspaceId, req.user.id, TOTAL_STEPS, JSON.stringify(ONBOARDING_STEPS)]
    );

    // Mark onboarding as completed in workspace_members
    await client.query(
      `UPDATE workspace_members
       SET onboarding_completed_at = NOW()
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.user.id]
    );

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Onboarding completed successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Complete onboarding error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error completing onboarding',
      error: error.message
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
    await client.query(
      `INSERT INTO workspace_onboarding_progress (workspace_id, user_id, skipped_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (workspace_id, user_id)
       DO UPDATE SET skipped_at = NOW(), updated_at = CURRENT_TIMESTAMP`,
      [workspaceId, req.user.id]
    );

    // Also mark completed in workspace_members so we don't prompt again
    await client.query(
      `UPDATE workspace_members
       SET onboarding_completed_at = NOW()
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.user.id]
    );

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Onboarding skipped'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Skip onboarding error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error skipping onboarding',
      error: error.message
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
