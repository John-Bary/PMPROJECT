const cron = require('node-cron');
const dotenv = require('dotenv');
const { sendReminderEmails } = require('../utils/reminderService');
const logger = require('../lib/logger');

dotenv.config();

const DEFAULT_CRON = '0 9 * * *'; // 9:00 AM every day
const toBool = (value) => String(value).toLowerCase() === 'true';
const hasFlag = (flag) => process.argv.includes(flag);
const getCronSchedule = () => process.env.REMINDER_CRON_SCHEDULE || DEFAULT_CRON;
const getTimezone = () => process.env.REMINDER_TIMEZONE || undefined;

const isSchedulerEnabled = () => process.env.REMINDER_JOB_ENABLED !== 'false';
const shouldRunOnStart = () => toBool(process.env.REMINDER_RUN_ON_START);
const isDryRun = () => toBool(process.env.REMINDER_DRY_RUN);

const logSummary = (summary, dryRun, context) => {
  if (!summary) return;

  logger.info({
    component: 'reminders',
    context,
    dryRun,
    sent: summary.sent,
    failed: summary.failed,
    totalTasks: summary.totalTasks,
    lookaheadDays: summary.lookaheadDays,
    skipped: summary.skipped || false,
  }, `Reminder ${context} run complete`);

  if (Array.isArray(summary.results) && summary.results.length) {
    summary.results.forEach((result) => {
      if (result.success) {
        logger.info({ component: 'reminders', email: result.email, taskCount: result.count, dryRun }, 'Reminder sent');
      } else {
        logger.warn({ component: 'reminders', email: result.email, taskCount: result.count, error: result.error }, 'Reminder send failed');
      }
    });
  }
};

const runReminderJob = async (context = 'manual') => {
  const dryRun = isDryRun();
  const startedAt = Date.now();

  logger.info({ component: 'reminders', context, dryRun }, 'Reminder run started');

  try {
    const summary = await sendReminderEmails({ dryRun });
    logSummary(summary, dryRun, context);
    return summary;
  } catch (error) {
    logger.error({ component: 'reminders', context, err: error }, 'Reminder run failed');
    return null;
  } finally {
    logger.info({ component: 'reminders', context, durationMs: Date.now() - startedAt }, 'Reminder run finished');
  }
};

const startReminderScheduler = () => {
  if (!isSchedulerEnabled()) {
    logger.info({ component: 'reminders' }, 'Scheduler disabled via REMINDER_JOB_ENABLED=false');
    return null;
  }

  const schedule = getCronSchedule();

  if (!cron.validate(schedule)) {
    logger.error({ component: 'reminders', schedule }, 'Invalid cron expression. Scheduler not started.');
    return null;
  }

  const timezone = getTimezone();
  const cronOptions = timezone ? { timezone } : undefined;

  logger.info({ component: 'reminders', schedule, timezone }, 'Scheduling reminder job');

  const task = cron.schedule(schedule, () => runReminderJob('scheduled'), cronOptions);

  if (shouldRunOnStart()) {
    runReminderJob('startup');
  }

  return task;
};

if (require.main === module) {
  const runOnce = hasFlag('--run-once') || hasFlag('--now');
  if (runOnce) {
    runReminderJob('manual').finally(() => process.exit(0));
  } else {
    startReminderScheduler();
  }
}

module.exports = {
  startReminderScheduler,
  runReminderJob
};
