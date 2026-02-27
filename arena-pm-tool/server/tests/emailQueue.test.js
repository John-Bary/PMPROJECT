/**
 * Email Queue Integration Tests
 *
 * Tests the email queue writer (utils/emailQueue.js) which provides
 * helper functions to enqueue emails for asynchronous delivery via
 * the email_queue database table.
 *
 * Verifies:
 * - Each queue helper inserts into email_queue with correct template, to_email, subject
 * - Template data is stored as JSON
 * - maxAttempts defaults to 3
 * - Correct priority colors are applied
 * - Default values for optional fields (userName, assignedByName, etc.)
 */

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { query } = require('../config/database');

const {
  queueEmail,
  queueTaskReminder,
  queueMultipleTasksReminder,
  queueTaskAssignmentNotification,
  queueWorkspaceInvite,
  queueWelcomeEmail,
  queueVerificationEmail,
  queuePasswordResetEmail,
  queueTrialEndingEmail,
} = require('../utils/emailQueue');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_INSERT_RESULT = { rows: [{ id: 42 }] };

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue(MOCK_INSERT_RESULT);
  // Default CLIENT_URL
  process.env.CLIENT_URL = 'https://www.todoria.com';
});

/**
 * Extract the arguments passed to query() for the INSERT call.
 * Returns { sql, params } where params = [to, subject, template, templateDataJson, maxAttempts].
 */
const getInsertArgs = () => {
  expect(query).toHaveBeenCalledTimes(1);
  const [sql, params] = query.mock.calls[0];
  return {
    sql,
    to: params[0],
    subject: params[1],
    template: params[2],
    templateDataJson: params[3],
    templateData: JSON.parse(params[3]),
    maxAttempts: params[4],
  };
};

// ---------------------------------------------------------------------------
// queueEmail (generic)
// ---------------------------------------------------------------------------

describe('queueEmail', () => {
  it('inserts into email_queue with correct parameters', async () => {
    const result = await queueEmail({
      to: 'user@test.com',
      subject: 'Test Subject',
      template: 'welcome.html',
      templateData: { userName: 'Alice' },
    });

    expect(result).toEqual({ id: 42 });

    const args = getInsertArgs();
    expect(args.sql).toContain('INSERT INTO email_queue');
    expect(args.to).toBe('user@test.com');
    expect(args.subject).toBe('Test Subject');
    expect(args.template).toBe('welcome.html');
    expect(args.templateData).toEqual({ userName: 'Alice' });
  });

  it('defaults maxAttempts to 3', async () => {
    await queueEmail({
      to: 'user@test.com',
      subject: 'Test',
      template: 'welcome.html',
      templateData: {},
    });

    const args = getInsertArgs();
    expect(args.maxAttempts).toBe(3);
  });

  it('allows custom maxAttempts', async () => {
    await queueEmail({
      to: 'user@test.com',
      subject: 'Test',
      template: 'welcome.html',
      templateData: {},
      maxAttempts: 5,
    });

    const args = getInsertArgs();
    expect(args.maxAttempts).toBe(5);
  });

  it('stores templateData as JSON string', async () => {
    await queueEmail({
      to: 'user@test.com',
      subject: 'Test',
      template: 'welcome.html',
      templateData: { userName: 'Bob', nested: { key: 'val' } },
    });

    const args = getInsertArgs();
    expect(typeof args.templateDataJson).toBe('string');
    expect(JSON.parse(args.templateDataJson)).toEqual({ userName: 'Bob', nested: { key: 'val' } });
  });

  it('returns the inserted row id', async () => {
    query.mockResolvedValue({ rows: [{ id: 99 }] });
    const result = await queueEmail({
      to: 'x@y.com',
      subject: 'S',
      template: 't.html',
      templateData: {},
    });
    expect(result).toEqual({ id: 99 });
  });
});

// ---------------------------------------------------------------------------
// queueWelcomeEmail
// ---------------------------------------------------------------------------

describe('queueWelcomeEmail', () => {
  it('inserts with correct template and subject', async () => {
    await queueWelcomeEmail({ to: 'new@user.com', userName: 'Alice' });

    const args = getInsertArgs();
    expect(args.template).toBe('welcome.html');
    expect(args.subject).toBe('Welcome to Todoria!');
    expect(args.to).toBe('new@user.com');
    expect(args.maxAttempts).toBe(3);
  });

  it('stores userName in templateData', async () => {
    await queueWelcomeEmail({ to: 'new@user.com', userName: 'Alice' });

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('Alice');
  });

  it('defaults userName to "there" when not provided', async () => {
    await queueWelcomeEmail({ to: 'new@user.com' });

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('there');
  });
});

// ---------------------------------------------------------------------------
// queueVerificationEmail
// ---------------------------------------------------------------------------

describe('queueVerificationEmail', () => {
  const params = {
    to: 'verify@user.com',
    userName: 'Bob',
    verificationUrl: 'https://todoria.com/verify?token=abc',
  };

  it('inserts with correct template and subject', async () => {
    await queueVerificationEmail(params);

    const args = getInsertArgs();
    expect(args.template).toBe('emailVerification.html');
    expect(args.subject).toContain('Verify Your Email');
    expect(args.to).toBe('verify@user.com');
  });

  it('stores userName and verificationUrl in templateData', async () => {
    await queueVerificationEmail(params);

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('Bob');
    expect(args.templateData.verificationUrl).toBe('https://todoria.com/verify?token=abc');
  });

  it('defaults userName to "there"', async () => {
    await queueVerificationEmail({ to: 'x@y.com', verificationUrl: 'https://x.com' });

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('there');
  });
});

// ---------------------------------------------------------------------------
// queuePasswordResetEmail
// ---------------------------------------------------------------------------

describe('queuePasswordResetEmail', () => {
  const params = {
    to: 'reset@user.com',
    userName: 'Charlie',
    resetUrl: 'https://todoria.com/reset?token=xyz',
  };

  it('inserts with correct template and subject', async () => {
    await queuePasswordResetEmail(params);

    const args = getInsertArgs();
    expect(args.template).toBe('passwordReset.html');
    expect(args.subject).toContain('Reset Your Password');
    expect(args.to).toBe('reset@user.com');
  });

  it('stores userName and resetUrl in templateData', async () => {
    await queuePasswordResetEmail(params);

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('Charlie');
    expect(args.templateData.resetUrl).toBe('https://todoria.com/reset?token=xyz');
  });

  it('defaults userName to "there"', async () => {
    await queuePasswordResetEmail({ to: 'x@y.com', resetUrl: 'https://x.com/r' });

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('there');
  });
});

// ---------------------------------------------------------------------------
// queueTaskReminder
// ---------------------------------------------------------------------------

describe('queueTaskReminder', () => {
  const params = {
    to: 'remind@user.com',
    userName: 'Diana',
    taskName: 'Fix bug #123',
    dueDate: '2025-03-15',
    taskDescription: 'Critical production issue',
    priority: 'high',
  };

  it('inserts with correct template and subject', async () => {
    await queueTaskReminder(params);

    const args = getInsertArgs();
    expect(args.template).toBe('taskReminder.html');
    expect(args.subject).toContain('Fix bug #123');
    expect(args.subject).toContain('due soon');
    expect(args.to).toBe('remind@user.com');
  });

  it('stores all task fields in templateData', async () => {
    await queueTaskReminder(params);

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('Diana');
    expect(args.templateData.taskName).toBe('Fix bug #123');
    expect(args.templateData.dueDate).toBe('2025-03-15');
    expect(args.templateData.taskDescription).toBe('Critical production issue');
    expect(args.templateData.priority).toBe('high');
  });

  it('sets priorityColor for high priority', async () => {
    await queueTaskReminder(params);

    const args = getInsertArgs();
    expect(args.templateData.priorityColor).toBe('#ef4444');
  });

  it('sets priorityColor for medium priority', async () => {
    await queueTaskReminder({ ...params, priority: 'medium' });

    const args = getInsertArgs();
    expect(args.templateData.priorityColor).toBe('#f59e0b');
  });

  it('sets priorityColor for low priority', async () => {
    await queueTaskReminder({ ...params, priority: 'low' });

    const args = getInsertArgs();
    expect(args.templateData.priorityColor).toBe('#22c55e');
  });

  it('defaults priority to "medium" when not provided', async () => {
    await queueTaskReminder({ to: 'x@y.com', taskName: 'T' });

    const args = getInsertArgs();
    expect(args.templateData.priority).toBe('medium');
  });

  it('defaults userName to "there" when not provided', async () => {
    await queueTaskReminder({ to: 'x@y.com', taskName: 'T' });

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('there');
  });
});

// ---------------------------------------------------------------------------
// queueMultipleTasksReminder
// ---------------------------------------------------------------------------

describe('queueMultipleTasksReminder', () => {
  const tasks = [
    { name: 'Task A', priority: 'high', due_date: '2025-03-15' },
    { name: 'Task B', priority: 'low', due_date: '2025-03-16' },
  ];

  const params = {
    to: 'multi@user.com',
    userName: 'Eve',
    tasks,
    taskRows: '<tr><td>pre-built HTML</td></tr>',
  };

  it('inserts with correct template and pluralized subject', async () => {
    await queueMultipleTasksReminder(params);

    const args = getInsertArgs();
    expect(args.template).toBe('multipleTasksReminder.html');
    expect(args.subject).toContain('2 tasks');
    expect(args.subject).toContain('due soon');
    expect(args.to).toBe('multi@user.com');
  });

  it('stores taskCount, plural, and verb in templateData', async () => {
    await queueMultipleTasksReminder(params);

    const args = getInsertArgs();
    expect(args.templateData.taskCount).toBe(2);
    expect(args.templateData.taskPlural).toBe('s');
    expect(args.templateData.taskVerb).toBe('are');
  });

  it('stores taskRows in templateData', async () => {
    await queueMultipleTasksReminder(params);

    const args = getInsertArgs();
    expect(args.templateData.taskRows).toBe('<tr><td>pre-built HTML</td></tr>');
  });

  it('handles singular task (1 task)', async () => {
    await queueMultipleTasksReminder({
      ...params,
      tasks: [tasks[0]],
    });

    const args = getInsertArgs();
    expect(args.subject).toContain('1 task');
    expect(args.subject).not.toContain('1 tasks');
    expect(args.templateData.taskCount).toBe(1);
    expect(args.templateData.taskPlural).toBe('');
    expect(args.templateData.taskVerb).toBe('is');
  });

  it('defaults taskRows to empty string when not provided', async () => {
    await queueMultipleTasksReminder({
      to: 'x@y.com',
      userName: 'Test',
      tasks: [tasks[0]],
    });

    const args = getInsertArgs();
    expect(args.templateData.taskRows).toBe('');
  });

  it('defaults userName to "there"', async () => {
    await queueMultipleTasksReminder({ to: 'x@y.com', tasks });

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('there');
  });
});

// ---------------------------------------------------------------------------
// queueTaskAssignmentNotification
// ---------------------------------------------------------------------------

describe('queueTaskAssignmentNotification', () => {
  const params = {
    to: 'assigned@user.com',
    userName: 'Frank',
    taskId: 42,
    taskTitle: 'Design review',
    taskDescription: 'Review the new UI mocks',
    assignedByName: 'Manager Gail',
    dueDate: '2025-04-01',
    priority: 'high',
  };

  it('inserts with correct template and subject', async () => {
    await queueTaskAssignmentNotification(params);

    const args = getInsertArgs();
    expect(args.template).toBe('taskAssignment.html');
    expect(args.subject).toContain('Design review');
    expect(args.subject).toContain('New Task Assigned');
    expect(args.to).toBe('assigned@user.com');
  });

  it('stores all task fields in templateData', async () => {
    await queueTaskAssignmentNotification(params);

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('Frank');
    expect(args.templateData.taskTitle).toBe('Design review');
    expect(args.templateData.taskDescription).toBe('Review the new UI mocks');
    expect(args.templateData.assignedByName).toBe('Manager Gail');
    expect(args.templateData.dueDate).toBe('2025-04-01');
    expect(args.templateData.priority).toBe('high');
  });

  it('builds taskUrl from CLIENT_URL and taskId', async () => {
    process.env.CLIENT_URL = 'https://app.todoria.com';
    await queueTaskAssignmentNotification(params);

    const args = getInsertArgs();
    expect(args.templateData.taskUrl).toBe('https://app.todoria.com/tasks?taskId=42');
  });

  it('strips trailing slashes from CLIENT_URL', async () => {
    process.env.CLIENT_URL = 'https://app.todoria.com///';
    await queueTaskAssignmentNotification(params);

    const args = getInsertArgs();
    expect(args.templateData.taskUrl).toBe('https://app.todoria.com/tasks?taskId=42');
  });

  it('falls back to production URL when CLIENT_URL is unset', async () => {
    delete process.env.CLIENT_URL;
    await queueTaskAssignmentNotification(params);

    const args = getInsertArgs();
    expect(args.templateData.taskUrl).toBe('https://www.todoria.com/tasks?taskId=42');
  });

  it('sets priorityColor based on priority', async () => {
    await queueTaskAssignmentNotification(params);

    const args = getInsertArgs();
    expect(args.templateData.priorityColor).toBe('#ef4444');
  });

  it('defaults priority to "medium"', async () => {
    await queueTaskAssignmentNotification({ ...params, priority: undefined });

    const args = getInsertArgs();
    expect(args.templateData.priority).toBe('medium');
  });

  it('defaults assignedByName to "A team member"', async () => {
    await queueTaskAssignmentNotification({ ...params, assignedByName: undefined });

    const args = getInsertArgs();
    expect(args.templateData.assignedByName).toBe('A team member');
  });

  it('defaults userName to "there"', async () => {
    await queueTaskAssignmentNotification({ ...params, userName: undefined });

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('there');
  });
});

// ---------------------------------------------------------------------------
// queueWorkspaceInvite
// ---------------------------------------------------------------------------

describe('queueWorkspaceInvite', () => {
  const params = {
    to: 'invite@user.com',
    inviterName: 'Admin Alice',
    workspaceName: 'Acme Corp',
    inviteUrl: 'https://todoria.com/invite/token456',
  };

  it('inserts with correct template and subject', async () => {
    await queueWorkspaceInvite(params);

    const args = getInsertArgs();
    expect(args.template).toBe('workspaceInvite.html');
    expect(args.subject).toContain('Acme Corp');
    expect(args.subject).toContain('invited');
    expect(args.to).toBe('invite@user.com');
  });

  it('stores inviterName, workspaceName, inviteUrl in templateData', async () => {
    await queueWorkspaceInvite(params);

    const args = getInsertArgs();
    expect(args.templateData.inviterName).toBe('Admin Alice');
    expect(args.templateData.workspaceName).toBe('Acme Corp');
    expect(args.templateData.inviteUrl).toBe('https://todoria.com/invite/token456');
  });

  it('defaults inviterName to "A team member"', async () => {
    await queueWorkspaceInvite({ ...params, inviterName: undefined });

    const args = getInsertArgs();
    expect(args.templateData.inviterName).toBe('A team member');
  });
});

// ---------------------------------------------------------------------------
// queueTrialEndingEmail
// ---------------------------------------------------------------------------

describe('queueTrialEndingEmail', () => {
  const params = {
    to: 'trial@user.com',
    userName: 'Hannah',
    trialEndDate: '2025-04-15',
    billingUrl: 'https://todoria.com/billing',
  };

  it('inserts with correct template and subject', async () => {
    await queueTrialEndingEmail(params);

    const args = getInsertArgs();
    expect(args.template).toBe('trialEnding.html');
    expect(args.subject).toContain('trial ends soon');
    expect(args.to).toBe('trial@user.com');
  });

  it('stores userName, trialEndDate, billingUrl in templateData', async () => {
    await queueTrialEndingEmail(params);

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('Hannah');
    expect(args.templateData.trialEndDate).toBe('2025-04-15');
    expect(args.templateData.billingUrl).toBe('https://todoria.com/billing');
  });

  it('defaults userName to "there"', async () => {
    await queueTrialEndingEmail({ ...params, userName: undefined });

    const args = getInsertArgs();
    expect(args.templateData.userName).toBe('there');
  });

  it('maxAttempts defaults to 3', async () => {
    await queueTrialEndingEmail(params);

    const args = getInsertArgs();
    expect(args.maxAttempts).toBe(3);
  });
});
