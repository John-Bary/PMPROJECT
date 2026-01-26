// Reminder Service
// Finds tasks that need reminders and sends emails to assignees

const { query } = require('../config/database');
const {
  sendTaskReminder,
  sendMultipleTasksReminder,
  verifyConnection
} = require('./emailService');

const parsedDefault = parseInt(process.env.REMINDER_LOOKAHEAD_DAYS || '2', 10);
const DEFAULT_LOOKAHEAD_DAYS = Number.isFinite(parsedDefault) ? parsedDefault : 2;
const normalizeLookaheadDays = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_LOOKAHEAD_DAYS;
};

// Find tasks that are due within the lookahead window and not completed
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

// Send reminder emails (aggregated per assignee)
const sendReminderEmails = async ({ lookaheadDays = DEFAULT_LOOKAHEAD_DAYS, dryRun = false } = {}) => {
  const lookahead = normalizeLookaheadDays(lookaheadDays);
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
      console.error('Email verification failed:', error.message);
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
};

module.exports = {
  findTasksNeedingReminders,
  sendReminderEmails
};
