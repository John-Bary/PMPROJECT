// Automated database backup scheduler
const cron = require('node-cron');
const logger = require('../lib/logger');

function startBackupScheduler() {
  const enabled = process.env.BACKUP_ENABLED === 'true';
  const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM

  if (!enabled) {
    logger.info({ component: 'backup' }, 'Backup scheduler disabled (set BACKUP_ENABLED=true to enable)');
    return;
  }

  cron.schedule(schedule, async () => {
    logger.info({ component: 'backup' }, 'Starting scheduled database backup');
    try {
      const { execSync } = require('child_process');
      const backupDir = process.env.BACKUP_DIR || '/tmp/todoria-backups';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.sql`;

      execSync(`mkdir -p ${backupDir}`);
      execSync(`pg_dump "${process.env.DATABASE_URL}" > "${backupDir}/${filename}"`, {
        timeout: 300000, // 5 min timeout
      });

      logger.info({ component: 'backup', filename }, 'Database backup completed');
    } catch (error) {
      logger.error({ err: error, component: 'backup' }, 'Database backup failed');
    }
  });

  logger.info({ component: 'backup', schedule }, 'Backup scheduler started');
}

module.exports = { startBackupScheduler };
