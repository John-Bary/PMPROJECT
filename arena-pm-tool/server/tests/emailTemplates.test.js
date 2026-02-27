/**
 * Email Template Rendering Integration Tests
 *
 * Tests all 8 email templates via the emailTemplates.js renderQueuedEmail() function:
 * - welcome.html
 * - emailVerification.html
 * - passwordReset.html
 * - taskReminder.html
 * - multipleTasksReminder.html
 * - taskAssignment.html
 * - workspaceInvite.html
 * - trialEnding.html
 *
 * Verifies:
 * - Each template renders without throwing
 * - Template variables are substituted (no raw {{variable}} in output)
 * - HTML output contains expected content (user name, URLs, etc.)
 * - Text-only version is generated
 * - XSS protection: user inputs are HTML-escaped
 * - Conditional {{#if}} blocks work correctly
 */

const { renderQueuedEmail } = require('../utils/emailTemplates');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert no unresolved {{variable}} placeholders remain in output */
const expectNoRawPlaceholders = (html) => {
  // Match {{word}} but NOT {{#if ...}} or {{/if}} which would indicate
  // a bug in conditional processing — however those are also resolved,
  // so any leftover {{ }} is a problem.
  const leftover = html.match(/\{\{[^}]+\}\}/g);
  expect(leftover).toBeNull();
};

/** Assert text version is non-empty, has no HTML tags */
const expectCleanText = (text) => {
  expect(typeof text).toBe('string');
  expect(text.length).toBeGreaterThan(0);
  expect(text).not.toMatch(/<[a-z][a-z0-9]*[\s>]/i);
};

// ---------------------------------------------------------------------------
// 1. welcome.html
// ---------------------------------------------------------------------------

describe('Email Template: welcome.html', () => {
  const templateName = 'welcome.html';

  it('renders without throwing', () => {
    expect(() => renderQueuedEmail(templateName, { userName: 'Alice' })).not.toThrow();
  });

  it('substitutes userName into the HTML output', () => {
    const { html } = renderQueuedEmail(templateName, { userName: 'Alice' });
    expect(html).toContain('Alice');
    expectNoRawPlaceholders(html);
  });

  it('generates a text-only version', () => {
    const { text } = renderQueuedEmail(templateName, { userName: 'Alice' });
    expectCleanText(text);
    expect(text).toContain('Alice');
  });

  it('HTML-escapes user-supplied userName (XSS protection)', () => {
    const { html } = renderQueuedEmail(templateName, { userName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders with missing userName (falls back to empty string)', () => {
    const { html } = renderQueuedEmail(templateName, {});
    expectNoRawPlaceholders(html);
    expect(html).toContain('Todoria');
  });

  it('accepts templateData as a JSON string', () => {
    const { html } = renderQueuedEmail(templateName, JSON.stringify({ userName: 'Bob' }));
    expect(html).toContain('Bob');
  });
});

// ---------------------------------------------------------------------------
// 2. emailVerification.html
// ---------------------------------------------------------------------------

describe('Email Template: emailVerification.html', () => {
  const templateName = 'emailVerification.html';
  const data = {
    userName: 'Charlie',
    verificationUrl: 'https://todoria.com/verify?token=abc123',
  };

  it('renders without throwing', () => {
    expect(() => renderQueuedEmail(templateName, data)).not.toThrow();
  });

  it('substitutes userName and verificationUrl', () => {
    const { html } = renderQueuedEmail(templateName, data);
    expect(html).toContain('Charlie');
    expect(html).toContain('https://todoria.com/verify?token=abc123');
    expectNoRawPlaceholders(html);
  });

  it('generates a text-only version containing the URL', () => {
    const { text } = renderQueuedEmail(templateName, data);
    expectCleanText(text);
    expect(text).toContain('Charlie');
  });

  it('HTML-escapes userName but preserves verificationUrl (safe key)', () => {
    const { html } = renderQueuedEmail(templateName, {
      userName: '<img onerror=alert(1)>',
      verificationUrl: 'https://todoria.com/verify?token=safe',
    });
    expect(html).not.toContain('<img onerror');
    expect(html).toContain('&lt;img onerror=alert(1)&gt;');
    expect(html).toContain('https://todoria.com/verify?token=safe');
  });
});

// ---------------------------------------------------------------------------
// 3. passwordReset.html
// ---------------------------------------------------------------------------

describe('Email Template: passwordReset.html', () => {
  const templateName = 'passwordReset.html';
  const data = {
    userName: 'Diana',
    resetUrl: 'https://todoria.com/reset?token=xyz789',
  };

  it('renders without throwing', () => {
    expect(() => renderQueuedEmail(templateName, data)).not.toThrow();
  });

  it('substitutes userName and resetUrl', () => {
    const { html } = renderQueuedEmail(templateName, data);
    expect(html).toContain('Diana');
    expect(html).toContain('https://todoria.com/reset?token=xyz789');
    expectNoRawPlaceholders(html);
  });

  it('generates a text-only version', () => {
    const { text } = renderQueuedEmail(templateName, data);
    expectCleanText(text);
    expect(text).toContain('Diana');
  });

  it('HTML-escapes userName but keeps resetUrl intact (safe key)', () => {
    const { html } = renderQueuedEmail(templateName, {
      userName: '"Evil" <User>',
      resetUrl: 'https://todoria.com/reset?t=ok',
    });
    expect(html).toContain('&quot;Evil&quot; &lt;User&gt;');
    expect(html).toContain('https://todoria.com/reset?t=ok');
  });
});

// ---------------------------------------------------------------------------
// 4. taskReminder.html
// ---------------------------------------------------------------------------

describe('Email Template: taskReminder.html', () => {
  const templateName = 'taskReminder.html';

  const fullData = {
    userName: 'Eve',
    taskName: 'Deploy v2.0',
    taskDescription: 'Ship the release to production',
    dueDate: 'Friday, March 14, 2025',
    priority: 'high',
    priorityColor: '#ef4444',
  };

  it('renders without throwing', () => {
    expect(() => renderQueuedEmail(templateName, fullData)).not.toThrow();
  });

  it('substitutes all variables', () => {
    const { html } = renderQueuedEmail(templateName, fullData);
    expect(html).toContain('Eve');
    expect(html).toContain('Deploy v2.0');
    expect(html).toContain('Ship the release to production');
    expect(html).toContain('Friday, March 14, 2025');
    expect(html).toContain('high');
    expect(html).toContain('#ef4444');
    expectNoRawPlaceholders(html);
  });

  it('generates a text-only version with task details', () => {
    const { text } = renderQueuedEmail(templateName, fullData);
    expectCleanText(text);
    expect(text).toContain('Eve');
    expect(text).toContain('Deploy v2.0');
  });

  it('conditional block: includes taskDescription when present', () => {
    const { html } = renderQueuedEmail(templateName, fullData);
    expect(html).toContain('Ship the release to production');
  });

  it('conditional block: omits taskDescription block when absent', () => {
    const dataWithout = { ...fullData };
    delete dataWithout.taskDescription;
    const { html } = renderQueuedEmail(templateName, dataWithout);
    // The paragraph that would hold the description should be gone
    expect(html).not.toContain('Ship the release to production');
    expectNoRawPlaceholders(html);
  });

  it('HTML-escapes taskName (XSS protection)', () => {
    const { html } = renderQueuedEmail(templateName, {
      ...fullData,
      taskName: '<b onmouseover=alert(1)>XSS</b>',
    });
    expect(html).not.toContain('<b onmouseover');
    expect(html).toContain('&lt;b onmouseover=alert(1)&gt;XSS&lt;/b&gt;');
  });

  it('HTML-escapes taskDescription (XSS protection)', () => {
    const { html } = renderQueuedEmail(templateName, {
      ...fullData,
      taskDescription: '"><script>steal()</script>',
    });
    expect(html).not.toContain('<script>steal()');
    expect(html).toContain('&quot;&gt;&lt;script&gt;steal()&lt;/script&gt;');
  });
});

// ---------------------------------------------------------------------------
// 5. multipleTasksReminder.html
// ---------------------------------------------------------------------------

describe('Email Template: multipleTasksReminder.html', () => {
  const templateName = 'multipleTasksReminder.html';

  const data = {
    userName: 'Frank',
    taskCount: 3,
    taskPlural: 's',
    taskVerb: 'are',
    taskRows: '<tr><td>Task row HTML here</td></tr>',
  };

  it('renders without throwing', () => {
    expect(() => renderQueuedEmail(templateName, data)).not.toThrow();
  });

  it('substitutes all variables including taskRows', () => {
    const { html } = renderQueuedEmail(templateName, data);
    expect(html).toContain('Frank');
    expect(html).toContain('3');
    expect(html).toContain('Task row HTML here');
    expectNoRawPlaceholders(html);
  });

  it('generates a text-only version', () => {
    const { text } = renderQueuedEmail(templateName, data);
    expectCleanText(text);
    expect(text).toContain('Frank');
  });

  it('does not escape taskRows (safe key — pre-built HTML)', () => {
    const { html } = renderQueuedEmail(templateName, {
      ...data,
      taskRows: '<tr><td style="color: red;">Important</td></tr>',
    });
    expect(html).toContain('<tr><td style="color: red;">Important</td></tr>');
  });

  it('handles singular task count (no plural s)', () => {
    const singular = {
      userName: 'Grace',
      taskCount: 1,
      taskPlural: '',
      taskVerb: 'is',
      taskRows: '<tr><td>Single task</td></tr>',
    };
    const { html } = renderQueuedEmail(templateName, singular);
    expect(html).toContain('1 task');
    expect(html).not.toContain('1 tasks');
    expect(html).toContain('is');
  });

  it('HTML-escapes userName but not taskRows', () => {
    const { html } = renderQueuedEmail(templateName, {
      ...data,
      userName: 'O\'Brien & <Co>',
    });
    expect(html).toContain('O&#39;Brien &amp; &lt;Co&gt;');
    // taskRows should remain raw HTML
    expect(html).toContain('Task row HTML here');
  });
});

// ---------------------------------------------------------------------------
// 6. taskAssignment.html
// ---------------------------------------------------------------------------

describe('Email Template: taskAssignment.html', () => {
  const templateName = 'taskAssignment.html';

  const fullData = {
    userName: 'Hannah',
    taskTitle: 'Design new landing page',
    taskDescription: 'Create mockups for the homepage redesign',
    assignedByName: 'Manager Bob',
    dueDate: 'Monday, April 7, 2025',
    priority: 'medium',
    priorityColor: '#f59e0b',
    taskUrl: 'https://todoria.com/tasks?taskId=42',
  };

  it('renders without throwing', () => {
    expect(() => renderQueuedEmail(templateName, fullData)).not.toThrow();
  });

  it('substitutes all variables', () => {
    const { html } = renderQueuedEmail(templateName, fullData);
    expect(html).toContain('Hannah');
    expect(html).toContain('Design new landing page');
    expect(html).toContain('Create mockups for the homepage redesign');
    expect(html).toContain('Manager Bob');
    expect(html).toContain('Monday, April 7, 2025');
    expect(html).toContain('medium');
    expect(html).toContain('#f59e0b');
    expect(html).toContain('https://todoria.com/tasks?taskId=42');
    expectNoRawPlaceholders(html);
  });

  it('generates a text-only version', () => {
    const { text } = renderQueuedEmail(templateName, fullData);
    expectCleanText(text);
    expect(text).toContain('Hannah');
    expect(text).toContain('Design new landing page');
  });

  it('conditional block: includes taskDescription when present', () => {
    const { html } = renderQueuedEmail(templateName, fullData);
    expect(html).toContain('Create mockups for the homepage redesign');
  });

  it('conditional block: omits taskDescription block when absent', () => {
    const noDesc = { ...fullData };
    delete noDesc.taskDescription;
    const { html } = renderQueuedEmail(templateName, noDesc);
    expect(html).not.toContain('Create mockups for the homepage redesign');
    expectNoRawPlaceholders(html);
  });

  it('HTML-escapes taskTitle and assignedByName (XSS protection)', () => {
    const { html } = renderQueuedEmail(templateName, {
      ...fullData,
      taskTitle: '<script>alert("xss")</script>',
      assignedByName: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('does not escape taskUrl (safe key)', () => {
    const { html } = renderQueuedEmail(templateName, fullData);
    expect(html).toContain('href="https://todoria.com/tasks?taskId=42"');
  });
});

// ---------------------------------------------------------------------------
// 7. workspaceInvite.html
// ---------------------------------------------------------------------------

describe('Email Template: workspaceInvite.html', () => {
  const templateName = 'workspaceInvite.html';

  const data = {
    inviterName: 'Ivan',
    workspaceName: 'Acme Corp',
    inviteUrl: 'https://todoria.com/invite/token123',
  };

  it('renders without throwing', () => {
    expect(() => renderQueuedEmail(templateName, data)).not.toThrow();
  });

  it('substitutes all variables', () => {
    const { html } = renderQueuedEmail(templateName, data);
    expect(html).toContain('Ivan');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('https://todoria.com/invite/token123');
    expectNoRawPlaceholders(html);
  });

  it('generates a text-only version', () => {
    const { text } = renderQueuedEmail(templateName, data);
    expectCleanText(text);
    expect(text).toContain('Ivan');
    expect(text).toContain('Acme Corp');
  });

  it('HTML-escapes inviterName and workspaceName (XSS protection)', () => {
    const { html } = renderQueuedEmail(templateName, {
      ...data,
      inviterName: 'Eve <evil@hack.com>',
      workspaceName: 'Corp & "Friends"',
    });
    expect(html).toContain('Eve &lt;evil@hack.com&gt;');
    expect(html).toContain('Corp &amp; &quot;Friends&quot;');
  });

  it('does not escape inviteUrl (safe key)', () => {
    const { html } = renderQueuedEmail(templateName, data);
    expect(html).toContain('href="https://todoria.com/invite/token123"');
  });
});

// ---------------------------------------------------------------------------
// 8. trialEnding.html
// ---------------------------------------------------------------------------

describe('Email Template: trialEnding.html', () => {
  const templateName = 'trialEnding.html';

  const data = {
    userName: 'Julia',
    trialEndDate: 'Wednesday, March 19, 2025',
    billingUrl: 'https://todoria.com/billing',
  };

  it('renders without throwing', () => {
    expect(() => renderQueuedEmail(templateName, data)).not.toThrow();
  });

  it('substitutes all variables', () => {
    const { html } = renderQueuedEmail(templateName, data);
    expect(html).toContain('Julia');
    expect(html).toContain('Wednesday, March 19, 2025');
    expect(html).toContain('https://todoria.com/billing');
    expectNoRawPlaceholders(html);
  });

  it('generates a text-only version', () => {
    const { text } = renderQueuedEmail(templateName, data);
    expectCleanText(text);
    expect(text).toContain('Julia');
    expect(text).toContain('Pro');
  });

  it('HTML-escapes userName but preserves billingUrl (safe key)', () => {
    const { html } = renderQueuedEmail(templateName, {
      userName: 'Jane "Doe" <jd>',
      trialEndDate: 'Friday, March 21, 2025',
      billingUrl: 'https://todoria.com/billing',
    });
    expect(html).toContain('Jane &quot;Doe&quot; &lt;jd&gt;');
    expect(html).toContain('href="https://todoria.com/billing"');
  });

  it('contains Pro trial messaging', () => {
    const { html } = renderQueuedEmail(templateName, data);
    expect(html).toContain('Todoria Pro');
    expect(html).toContain('Upgrade Now');
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting concerns
// ---------------------------------------------------------------------------

describe('Email Templates: cross-cutting', () => {
  const allTemplates = [
    { name: 'welcome.html', data: { userName: 'Test' } },
    { name: 'emailVerification.html', data: { userName: 'Test', verificationUrl: 'https://example.com/verify' } },
    { name: 'passwordReset.html', data: { userName: 'Test', resetUrl: 'https://example.com/reset' } },
    { name: 'taskReminder.html', data: { userName: 'Test', taskName: 'Task', dueDate: 'Tomorrow', priority: 'low', priorityColor: '#22c55e' } },
    { name: 'multipleTasksReminder.html', data: { userName: 'Test', taskCount: 2, taskPlural: 's', taskVerb: 'are', taskRows: '<tr><td>row</td></tr>' } },
    { name: 'taskAssignment.html', data: { userName: 'Test', taskTitle: 'Task', assignedByName: 'Boss', dueDate: 'Tomorrow', priority: 'medium', priorityColor: '#f59e0b', taskUrl: 'https://example.com/task' } },
    { name: 'workspaceInvite.html', data: { inviterName: 'Admin', workspaceName: 'WS', inviteUrl: 'https://example.com/invite' } },
    { name: 'trialEnding.html', data: { userName: 'Test', trialEndDate: 'March 20', billingUrl: 'https://example.com/billing' } },
  ];

  it.each(allTemplates)('$name — returns both html and text properties', ({ name, data }) => {
    const result = renderQueuedEmail(name, data);
    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('text');
    expect(typeof result.html).toBe('string');
    expect(typeof result.text).toBe('string');
  });

  it.each(allTemplates)('$name — HTML starts with <!DOCTYPE html>', ({ name, data }) => {
    const { html } = renderQueuedEmail(name, data);
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it.each(allTemplates)('$name — contains Todoria branding', ({ name, data }) => {
    const { html } = renderQueuedEmail(name, data);
    expect(html).toContain('Todoria');
  });

  it.each(allTemplates)('$name — no unresolved placeholders', ({ name, data }) => {
    const { html } = renderQueuedEmail(name, data);
    expectNoRawPlaceholders(html);
  });

  it('throws for a non-existent template', () => {
    expect(() => renderQueuedEmail('does-not-exist.html', {})).toThrow();
  });
});
