const cron = require('node-cron');
const dotenv = require('dotenv');
const { sendReminderEmails } = require('../utils/reminderService');

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

  console.log(
    `📨 [Reminders] ${context} summary: recipients sent=${summary.sent}, failed=${summary.failed}, totalTasks=${summary.totalTasks}, lookahead=${summary.lookaheadDays} day(s)${dryRun ? ' (dry run)' : ''}`
  );

  if (Array.isArray(summary.results) && summary.results.length) {
    const modeLabel = dryRun ? ' (dry run)' : '';
    summary.results.forEach((result) => {
      const status = result.success ? '✅' : '⚠️';
      console.log(
        `${status} [Reminders] ${result.email} - ${result.count} task(s)${modeLabel}${result.error ? ` | Error: ${result.error}` : ''}`
      );
    });
  }
};

const runReminderJob = async (context = 'manual') => {
  const dryRun = isDryRun();
  const startedAt = new Date();

  console.log(`\n⏰ [Reminders] ${context} run started at ${startedAt.toISOString()}${dryRun ? ' (dry run)' : ''}`);

  try {
    const summary = await sendReminderEmails({ dryRun });
    logSummary(summary, dryRun, context);
    return summary;
  } catch (error) {
    console.error(`❌ [Reminders] ${context} run failed:`, error.message || error);
    return null;
  } finally {
    console.log(`⏹️ [Reminders] ${context} run finished in ${Date.now() - startedAt.getTime()}ms\n`);
  }
};

const startReminderScheduler = () => {
  if (!isSchedulerEnabled()) {
    console.log('⏸️ [Reminders] Scheduler disabled via REMINDER_JOB_ENABLED=false');
    return null;
  }

  const schedule = getCronSchedule();

  if (!cron.validate(schedule)) {
    console.error(`❌ [Reminders] Invalid cron expression "${schedule}". Scheduler not started.`);
    return null;
  }

  const timezone = getTimezone();
  const cronOptions = timezone ? { timezone } : undefined;

  console.log(
    `🗓️ [Reminders] Scheduling job with cron "${schedule}"${timezone ? ` (${timezone})` : ''}`
  );

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
