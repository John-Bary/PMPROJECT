// Data retention job - cleans up expired data for compliance
const cron = require('node-cron');
const { query } = require('../config/database');
const logger = require('../lib/logger');

async function runRetentionCleanup() {
  logger.info({ component: 'retention' }, 'Starting retention cleanup');

  try {
    // Delete expired invitations older than 30 days
    const inviteResult = await query(
      "DELETE FROM workspace_invitations WHERE expires_at < NOW() - INTERVAL '30 days'"
    );
    const deletedInvites = inviteResult.rowCount || 0;

    // Anonymize audit logs older than 2 years
    const auditResult = await query(
      `UPDATE audit_logs SET user_id = NULL, ip_address = NULL, user_agent = NULL
       WHERE created_at < NOW() - INTERVAL '2 years' AND (user_id IS NOT NULL OR ip_address IS NOT NULL)`
    );
    const anonymizedLogs = auditResult.rowCount || 0;

    logger.info({
      component: 'retention',
      deletedInvites,
      anonymizedLogs,
    }, 'Retention cleanup complete');

    return { deletedInvites, anonymizedLogs };
  } catch (error) {
    logger.error({ err: error, component: 'retention' }, 'Retention cleanup failed');
    throw error;
  }
}

function startRetentionScheduler() {
  // Run daily at 3 AM
  const schedule = process.env.RETENTION_SCHEDULE || '0 3 * * *';
  const enabled = process.env.RETENTION_ENABLED !== 'false';

  if (!enabled) {
    logger.info({ component: 'retention' }, 'Retention scheduler disabled');
    return;
  }

  cron.schedule(schedule, async () => {
    try {
      await runRetentionCleanup();
    } catch (error) {
      logger.error({ err: error, component: 'retention' }, 'Scheduled retention cleanup failed');
    }
  });

  logger.info({ component: 'retention', schedule }, 'Retention scheduler started');
}

module.exports = { runRetentionCleanup, startRetentionScheduler };
