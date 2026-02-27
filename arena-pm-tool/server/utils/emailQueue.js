// Email Queue Writer
// Provides functions to enqueue emails for reliable delivery via the email_queue table.
// Emails are processed asynchronously by the email queue processor cron job.

const { query } = require('../config/database');

/**
 * Enqueue an email for asynchronous delivery.
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.template - Template file name (e.g., 'taskReminder.html')
 * @param {object} options.templateData - Template variables to render
 * @param {number} [options.maxAttempts=3] - Maximum delivery attempts
 * @returns {Promise<{ id: number }>}
 */
const queueEmail = async ({ to, subject, template, templateData, maxAttempts = 3 }) => {
  const result = await query(`
    INSERT INTO email_queue (to_email, subject, template, template_data, max_attempts)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [to, subject, template, JSON.stringify(templateData), maxAttempts]);

  return { id: result.rows[0].id };
};

/**
 * Enqueue a task reminder email.
 */
const queueTaskReminder = async ({ to, userName, taskName, dueDate, taskDescription, priority }) => {
  return queueEmail({
    to,
    subject: `\u23F0 Reminder: "${taskName}" is due soon`,
    template: 'taskReminder.html',
    templateData: {
      userName: userName || 'there',
      taskName,
      taskDescription,
      dueDate,
      priority: priority || 'medium',
      priorityColor: getPriorityColor(priority),
    },
  });
};

/**
 * Enqueue a multiple-tasks reminder email.
 */
const queueMultipleTasksReminder = async ({ to, userName, tasks, taskRows }) => {
  const taskCount = Array.isArray(tasks) ? tasks.length : 0;
  return queueEmail({
    to,
    subject: `\u23F0 Reminder: You have ${taskCount} task${taskCount > 1 ? 's' : ''} due soon`,
    template: 'multipleTasksReminder.html',
    templateData: {
      userName: userName || 'there',
      taskCount,
      taskPlural: taskCount > 1 ? 's' : '',
      taskVerb: taskCount > 1 ? 'are' : 'is',
      taskRows: taskRows || '',
    },
  });
};

/**
 * Enqueue a task assignment notification email.
 */
const queueTaskAssignmentNotification = async ({
  to, userName, taskId, taskTitle, taskDescription, assignedByName, dueDate, priority
}) => {
  const clientUrl = (process.env.CLIENT_URL || 'https://www.todoria.com').replace(/\/+$/, '');
  const taskUrl = `${clientUrl}/tasks?taskId=${taskId}`;

  return queueEmail({
    to,
    subject: `New Task Assigned: "${taskTitle}"`,
    template: 'taskAssignment.html',
    templateData: {
      userName: userName || 'there',
      taskTitle,
      taskDescription,
      assignedByName: assignedByName || 'A team member',
      dueDate,
      priority: priority || 'medium',
      priorityColor: getPriorityColor(priority),
      taskUrl,
    },
  });
};

/**
 * Enqueue a workspace invitation email.
 */
const queueWorkspaceInvite = async ({ to, inviterName, workspaceName, inviteUrl }) => {
  return queueEmail({
    to,
    subject: `You're invited to join ${workspaceName} on Todoria`,
    template: 'workspaceInvite.html',
    templateData: {
      inviterName: inviterName || 'A team member',
      workspaceName,
      inviteUrl,
    },
  });
};

/**
 * Enqueue a welcome email.
 */
const queueWelcomeEmail = async ({ to, userName }) => {
  return queueEmail({
    to,
    subject: 'Welcome to Todoria!',
    template: 'welcome.html',
    templateData: {
      userName: userName || 'there',
    },
  });
};

/**
 * Enqueue an email verification email.
 */
const queueVerificationEmail = async ({ to, userName, verificationUrl }) => {
  return queueEmail({
    to,
    subject: 'Verify Your Email — Todoria',
    template: 'emailVerification.html',
    templateData: {
      userName: userName || 'there',
      verificationUrl,
    },
  });
};

/**
 * Enqueue a password reset email.
 */
const queuePasswordResetEmail = async ({ to, userName, resetUrl }) => {
  return queueEmail({
    to,
    subject: 'Reset Your Password — Todoria',
    template: 'passwordReset.html',
    templateData: {
      userName: userName || 'there',
      resetUrl,
    },
  });
};

/**
 * Enqueue a trial ending notification email.
 */
const queueTrialEndingEmail = async ({ to, userName, trialEndDate, billingUrl }) => {
  return queueEmail({
    to,
    subject: 'Your Todoria Pro trial ends soon',
    template: 'trialEnding.html',
    templateData: {
      userName: userName || 'there',
      trialEndDate,
      billingUrl,
    },
  });
};

const getPriorityColor = (priority) => {
  const colors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
  return colors[priority] || colors.medium;
};

module.exports = {
  queueEmail,
  queueTaskReminder,
  queueMultipleTasksReminder,
  queueTaskAssignmentNotification,
  queueWorkspaceInvite,
  queueWelcomeEmail,
  queueVerificationEmail,
  queuePasswordResetEmail,
  queueTrialEndingEmail,
};
