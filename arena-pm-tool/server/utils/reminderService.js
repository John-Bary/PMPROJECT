// Reminder Service
// Finds tasks that need reminders and sends emails to assignees.
// Uses reminder_log table to prevent duplicate reminders and
// PostgreSQL advisory locks to prevent concurrent execution.

const { query, getClient } = require('../config/database');
const {
  sendTaskReminder,
  sendMultipleTasksReminder,
  verifyConnection
} = require('./emailService');
const logger = require('../lib/logger');

const REMINDER_LOCK_ID = 583921; // Arbitrary advisory lock ID for reminder job

const parsedDefault = parseInt(process.env.REMINDER_LOOKAHEAD_DAYS || '2', 10);
const DEFAULT_LOOKAHEAD_DAYS = Number.isFinite(parsedDefault) ? parsedDefault : 2;
const normalizeLookaheadDays = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_LOOKAHEAD_DAYS;
};

// Find tasks that are due within the lookahead window and not completed,
// excluding tasks that already have a reminder logged for today.
const findTasksNeedingReminders = async ({ lookaheadDays = DEFAULT_LOOKAHEAD_DAYS } = {}) => {
  const lookahead = normalizeLookaheadDays(lookaheadDays);

  const result = await query(
    `
      SELECT
        t.id,
        t.title,
        t.description,
        t.due_date,
        t.priority,
        t.status,
        t.assignee_id,
        u.email AS assignee_email,
        u.name AS assignee_name
      FROM tasks t
      JOIN users u ON u.id = t.assignee_id
      WHERE (t.status IS NULL OR t.status <> 'completed')
        AND t.completed_at IS NULL
        AND t.due_date IS NOT NULL
        AND u.email IS NOT NULL
        AND u.email <> ''
        AND (u.email_notifications_enabled IS NULL OR u.email_notifications_enabled = true)
        AND t.due_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 * INTERVAL '1 day')
        AND NOT EXISTS (
          SELECT 1 FROM reminder_log rl
          WHERE rl.task_id = t.id
            AND rl.user_id = t.assignee_id
            AND rl.reminded_on = CURRENT_DATE
        )
      ORDER BY t.due_date ASC
    `,
    [lookahead]
  );

  return result.rows.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.due_date,
    priority: task.priority || 'medium',
    status: task.status,
    assigneeId: task.assignee_id,
    assigneeEmail: task.assignee_email,
    assigneeName: task.assignee_name
  }));
};

// Group tasks by assignee so each user gets a single email
const groupTasksByAssignee = (tasks = []) => {
  return tasks.reduce((groups, task) => {
    if (!groups[task.assigneeEmail]) {
      groups[task.assigneeEmail] = [];
    }
    groups[task.assigneeEmail].push(task);
    return groups;
  }, {});
};

// Log that a reminder was sent for a task+user on today's date (idempotency key)
const logReminder = async (taskId, userId) => {
  await query(`
    INSERT INTO reminder_log (task_id, user_id, reminded_on)
    VALUES ($1, $2, CURRENT_DATE)
    ON CONFLICT (task_id, user_id, reminded_on) DO NOTHING
  `, [taskId, userId]);
};

// Send reminder emails (aggregated per assignee)
// Uses advisory lock to prevent concurrent execution.
const sendReminderEmails = async ({ lookaheadDays = DEFAULT_LOOKAHEAD_DAYS, dryRun = false } = {}) => {
  const lookahead = normalizeLookaheadDays(lookaheadDays);

  // Acquire advisory lock to prevent concurrent runs
  if (!dryRun) {
    const lockResult = await query('SELECT pg_try_advisory_lock($1) AS acquired', [REMINDER_LOCK_ID]);
    if (!lockResult.rows[0].acquired) {
      return {
        sent: 0,
        failed: 0,
        totalTasks: 0,
        lookaheadDays: lookahead,
        message: 'Skipped: another reminder job is already running.',
        skipped: true,
      };
    }
  }

  try {
    const tasks = await findTasksNeedingReminders({ lookaheadDays: lookahead });

    if (!tasks.length) {
      return {
        sent: 0,
        failed: 0,
        totalTasks: 0,
        lookaheadDays: lookahead,
        message: 'No tasks need reminders in the configured window.'
      };
    }

    if (!dryRun) {
      const emailReady = await verifyConnection().catch(error => {
        logger.error({ err: error }, 'Email verification failed');
        return false;
      });

      if (!emailReady) {
        return {
          sent: 0,
          failed: tasks.length,
          totalTasks: tasks.length,
          lookaheadDays: lookahead,
          message: 'Email configuration failed verification.'
        };
      }
    }

    const grouped = groupTasksByAssignee(tasks);
    const results = [];
    let sent = 0;
    let failed = 0;

    for (const [email, userTasks] of Object.entries(grouped)) {
      const userName = userTasks[0].assigneeName || 'there';

      // Build payload compatible with email templates
      const templateTasks = userTasks.map(task => ({
        id: task.id,
        name: task.title,
        title: task.title,
        description: task.description,
        due_date: task.dueDate,
        priority: task.priority
      }));

      if (dryRun) {
        results.push({ email, count: userTasks.length, success: true, dryRun: true });
        continue;
      }

      try {
        let response;
        if (userTasks.length === 1) {
          const task = userTasks[0];
          response = await sendTaskReminder({
            to: email,
            userName,
            taskName: task.title,
            taskDescription: task.description,
            dueDate: task.dueDate,
            priority: task.priority
          });
        } else {
          response = await sendMultipleTasksReminder({
            to: email,
            userName,
            tasks: templateTasks
          });
        }

        if (response.success) {
          sent += 1;
          // Log each task as reminded for today to prevent duplicates
          for (const task of userTasks) {
            await logReminder(task.id, task.assigneeId);
          }
        } else {
          failed += 1;
        }

        results.push({
          email,
          count: userTasks.length,
          success: response.success,
          error: response.error || null
        });
      } catch (error) {
        failed += 1;
        results.push({
          email,
          count: userTasks.length,
          success: false,
          error: error.message
        });
      }
    }

    return {
      sent,
      failed,
      totalTasks: tasks.length,
      lookaheadDays: lookahead,
      results
    };
  } finally {
    // Release advisory lock
    if (!dryRun) {
      try {
        await query('SELECT pg_advisory_unlock($1)', [REMINDER_LOCK_ID]);
      } catch (_) {
        // Lock release failed — will auto-release on disconnect
      }
    }
  }
};

module.exports = {
  findTasksNeedingReminders,
  sendReminderEmails
};
