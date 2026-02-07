// Email Queue Job
// Processes the email_queue table on a schedule (every 30 seconds by default).

const cron = require('node-cron');
const { processEmailQueue, getQueueStats } = require('./emailQueueProcessor');
const logger = require('../lib/logger');

const DEFAULT_SCHEDULE = '*/30 * * * * *'; // Every 30 seconds
const EMAIL_QUEUE_ENABLED = () => process.env.EMAIL_QUEUE_ENABLED !== 'false';

let lastStats = null;

const runEmailQueueJob = async (context = 'manual') => {
  try {
    const result = await processEmailQueue();

    if (result.skipped) {
      return result;
    }

    if (result.processed > 0) {
      logger.info({
        component: 'emailQueue',
        context,
        processed: result.processed,
        sent: result.sent,
        failed: result.failed,
        retried: result.retried,
      }, 'Email queue batch processed');
    }

    return result;
  } catch (error) {
    logger.error({ component: 'emailQueue', context, err: error }, 'Email queue processing error');
    return null;
  }
};

const startEmailQueueScheduler = () => {
  if (!EMAIL_QUEUE_ENABLED()) {
    logger.info({ component: 'emailQueue' }, 'Scheduler disabled via EMAIL_QUEUE_ENABLED=false');
    return null;
  }

  const schedule = process.env.EMAIL_QUEUE_SCHEDULE || DEFAULT_SCHEDULE;

  if (!cron.validate(schedule)) {
    logger.error({ component: 'emailQueue', schedule }, 'Invalid cron expression. Scheduler not started.');
    return null;
  }

  logger.info({ component: 'emailQueue', schedule }, 'Scheduling email queue processor');

  const task = cron.schedule(schedule, () => runEmailQueueJob('scheduled'));
  return task;
};

const getEmailQueueHealth = async () => {
  try {
    lastStats = await getQueueStats();
    return {
      status: 'OK',
      enabled: EMAIL_QUEUE_ENABLED(),
      stats: lastStats,
    };
  } catch (error) {
    return {
      status: 'ERROR',
      enabled: EMAIL_QUEUE_ENABLED(),
      error: error.message,
    };
  }
};

module.exports = {
  startEmailQueueScheduler,
  runEmailQueueJob,
  getEmailQueueHealth,
};
