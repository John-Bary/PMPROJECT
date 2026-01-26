const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const templatesDir = path.join(__dirname, '..', 'templates', 'email');
const templateCache = new Map();

const ensureEmailConfig = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email credentials missing. Set EMAIL_USER and EMAIL_PASSWORD in your .env file.');
  }
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
  const fromName = process.env.EMAIL_FROM_NAME || 'Arena PM Tool';
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  return `${fromName} <${fromEmail}>`;
};

// Create reusable transporter
const createTransporter = () => {
  ensureEmailConfig();

  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure: process.env.EMAIL_SECURE === 'true' || port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Verify email configuration
const verifyConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
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
    const transporter = createTransporter();

    const mailOptions = {
      from: getFromAddress(),
      to,
      subject,
      html,
      text: text || stripHtml(html)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
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
  createTransporter,
  verifyConnection,
  sendEmail,
  sendTaskReminder,
  sendMultipleTasksReminder
};
