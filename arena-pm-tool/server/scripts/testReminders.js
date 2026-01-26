/**
 * Manual tester for reminder logic.
 *
 * Usage:
 *   node scripts/testReminders.js             // Dry run using default lookahead
 *   node scripts/testReminders.js --days 3    // Dry run with custom lookahead
 *   node scripts/testReminders.js --send      // Actually send emails (needs EMAIL_* env)
 */

require('dotenv').config();
const args = process.argv.slice(2);
const { pool } = require('../config/database');
const { findTasksNeedingReminders, sendReminderEmails } = require('../utils/reminderService');

const getArgValue = (flag) => {
  const withEquals = args.find(arg => arg.startsWith(`${flag}=`));
  if (withEquals) {
    return withEquals.split('=')[1];
  }

  const flagIndex = args.indexOf(flag);
  if (flagIndex !== -1) {
    const next = args[flagIndex + 1];
    if (next && !next.startsWith('--')) {
      return next;
    }
  }

  return undefined;
};

const resolveLookaheadDays = () => {
  const cliValue = getArgValue('--days');
  const parsedCli = cliValue !== undefined ? parseInt(cliValue, 10) : NaN;
  if (!Number.isNaN(parsedCli)) {
    return parsedCli;
  }

  const envValue = process.env.REMINDER_LOOKAHEAD_DAYS;
  const parsedEnv = envValue ? parseInt(envValue, 10) : NaN;
  if (!Number.isNaN(parsedEnv)) {
    return parsedEnv;
  }

  return undefined; // fall back to service default
};

const lookaheadDays = resolveLookaheadDays();
const dryRun = !args.includes('--send');

(async () => {
  try {
    console.log('\n📅 Reminder logic test');
    console.log('---------------------');
    if (lookaheadDays !== undefined) {
      console.log(`Checking for tasks due within ${lookaheadDays} day(s)...`);
    } else {
      console.log('Checking for tasks with default lookahead window...');
    }

    const tasks = await findTasksNeedingReminders(
      lookaheadDays !== undefined ? { lookaheadDays } : undefined
    );

    console.log(`Found ${tasks.length} task(s) that require reminders.`);
    if (tasks.length) {
      console.table(
        tasks.map(task => ({
          id: task.id,
          title: task.title,
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null,
          assignee: `${task.assigneeName || 'Unknown'} <${task.assigneeEmail}>`,
          priority: task.priority
        }))
      );
    }

    const summary = await sendReminderEmails({ lookaheadDays, dryRun });
    console.log('\nSummary:', summary);

    if (dryRun) {
      console.log('\nDry run only. Pass --send to actually send emails.');
    }
  } catch (error) {
    console.error('\n❌ Reminder test failed:', error.message);
  } finally {
    await pool.end().catch(() => {});
  }
})();
