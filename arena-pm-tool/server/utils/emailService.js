const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

const templatesDir = path.join(__dirname, '..', 'templates', 'email');
const templateCache = new Map();

let resendClient = null;

const getResendClient = () => {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is missing. Set it in your .env file.');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

const loadTemplate = (templateName) => {
  const templatePath = path.join(templatesDir, templateName);

  if (templateCache.has(templatePath)) {
    return templateCache.get(templatePath);
  }

  try {
    const template = fs.readFileSync(templatePath, 'utf8');
    templateCache.set(templatePath, template);
    return template;
  } catch (error) {
    console.error(`❌ Could not load email template at ${templatePath}`);
    throw error;
  }
};

// Simple templating: supports {{variable}} and {{#if variable}}...{{/if}}
const renderTemplate = (templateName, data = {}) => {
  let template = loadTemplate(templateName);

  template = template.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, key, block) => {
    return data[key] ? block : '';
  });

  template = template.replace(/{{(\w+)}}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : '';
  });

  return template;
};

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const getFromAddress = () => {
  const fromName = process.env.EMAIL_FROM_NAME || 'Todorio';
  const fromEmail = process.env.EMAIL_FROM;
  return `${fromName} <${fromEmail}>`;
};

// Verify email configuration
const verifyConnection = async () => {
  try {
    getResendClient();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error.message);
    return false;
  }
};

// Send email with HTML template
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || stripHtml(html)
    });

    if (error) {
      console.error('❌ Failed to send email:', error.message);
      return { success: false, error: error.message };
    }

    console.log('📧 Email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    return { success: false, error: error.message };
  }
};

const buildTaskRows = (tasks = []) => {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return '<tr><td style="padding: 16px; color: #666666;">No tasks found.</td></tr>';
  }

  return tasks.map(task => {
    const priority = task.priority || 'medium';
    const dueDate = formatDate(task.due_date || task.dueDate);

    return `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #eeeeee;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td>
                <p style="margin: 0 0 4px 0; color: #1a1a1a; font-size: 15px; font-weight: 500;">
                  ${task.name || task.title}
                </p>
                <p style="margin: 0; color: #888888; font-size: 13px;">
                  Due: ${dueDate}
                </p>
              </td>
              <td align="right" valign="top">
                <span style="display: inline-block; padding: 4px 10px; background-color: ${getPriorityColor(priority)}; color: #ffffff; font-size: 11px; font-weight: 500; border-radius: 10px; text-transform: capitalize;">
                  ${priority}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');
};

// Send task reminder email using HTML template
const sendTaskReminder = async ({ to, userName, taskName, dueDate, taskDescription, priority }) => {
  const subject = `⏰ Reminder: "${taskName}" is due soon`;

  const html = renderTemplate('taskReminder.html', {
    userName: userName || 'there',
    taskName,
    taskDescription,
    dueDate: formatDate(dueDate),
    priority: priority || 'medium',
    priorityColor: getPriorityColor(priority)
  });

  return sendEmail({ to, subject, html });
};

// Send multiple tasks reminder email using HTML template
const sendMultipleTasksReminder = async ({ to, userName, tasks }) => {
  const taskCount = Array.isArray(tasks) ? tasks.length : 0;

  if (taskCount === 0) {
    return { success: false, error: 'No tasks provided for reminder email' };
  }

  const subject = `⏰ Reminder: You have ${taskCount} task${taskCount > 1 ? 's' : ''} due soon`;

  const html = renderTemplate('multipleTasksReminder.html', {
    userName: userName || 'there',
    taskCount,
    taskPlural: taskCount > 1 ? 's' : '',
    taskVerb: taskCount > 1 ? 'are' : 'is',
    taskRows: buildTaskRows(tasks)
  });

  return sendEmail({ to, subject, html });
};

// Send task assignment notification email
const sendTaskAssignmentNotification = async ({
  to,
  userName,
  taskId,
  taskTitle,
  taskDescription,
  assignedByName,
  dueDate,
  priority
}) => {
  const subject = `New Task Assigned: "${taskTitle}"`;

  // Build task URL - uses CLIENT_URL env variable or defaults to localhost
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const taskUrl = `${clientUrl}/tasks?taskId=${taskId}`;

  const html = renderTemplate('taskAssignment.html', {
    userName: userName || 'there',
    taskTitle,
    taskDescription,
    assignedByName: assignedByName || 'A team member',
    dueDate: formatDate(dueDate),
    priority: priority || 'medium',
    priorityColor: getPriorityColor(priority),
    taskUrl
  });

  return sendEmail({ to, subject, html });
};

// Helper function to get priority color
const getPriorityColor = (priority) => {
  const colors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#22c55e'
  };
  return colors[priority] || colors.medium;
};

// Helper function to format date
const formatDate = (date) => {
  if (!date) return 'No date set';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

module.exports = {
  verifyConnection,
  sendEmail,
  sendTaskReminder,
  sendMultipleTasksReminder,
  sendTaskAssignmentNotification
};
