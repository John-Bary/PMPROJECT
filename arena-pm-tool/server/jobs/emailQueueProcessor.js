// Email Queue Processor
// Processes pending emails from the email_queue table with retry and exponential backoff.
// Designed to run as a cron job every 30 seconds.

const { query, getClient } = require('../config/database');
const { sendEmail } = require('../utils/emailService');
const { renderQueuedEmail } = require('../utils/emailTemplates');
const logger = require('../lib/logger');

const BATCH_SIZE = 10;
const LOCK_ID = 294837; // Arbitrary advisory lock ID for email queue

/**
 * Process pending emails from the queue.
 * Uses a PostgreSQL advisory lock to prevent concurrent processing.
 */
const processEmailQueue = async () => {
  const client = await getClient();

  try {
    // Acquire advisory lock — if another process holds it, skip this run
    const lockResult = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [LOCK_ID]);
    if (!lockResult.rows[0].acquired) {
      client.release();
      return { skipped: true, reason: 'Another processor holds the lock' };
    }

    await client.query('BEGIN');

    // Fetch pending emails that are ready for retry (with exponential backoff)
    const pendingResult = await client.query(`
      SELECT id, to_email, subject, template, template_data, attempts, max_attempts
      FROM email_queue
      WHERE status = 'pending'
        AND attempts < max_attempts
        AND (
          last_attempted_at IS NULL
          OR last_attempted_at < NOW() - (POWER(2, attempts) || ' seconds')::interval
        )
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    `, [BATCH_SIZE]);

    const emails = pendingResult.rows;
    let sent = 0;
    let failed = 0;
    let retried = 0;

    for (const email of emails) {
      try {
        // Render the email HTML from template
        const { html, text } = renderQueuedEmail(email.template, email.template_data);

        const result = await sendEmail({
          to: email.to_email,
          subject: email.subject,
          html,
          text,
        });

        if (result.success) {
          await client.query(`
            UPDATE email_queue
            SET status = 'sent', sent_at = NOW(), attempts = attempts + 1, last_attempted_at = NOW()
            WHERE id = $1
          `, [email.id]);
          sent++;
        } else {
          const newAttempts = email.attempts + 1;
          const newStatus = newAttempts >= email.max_attempts ? 'failed' : 'pending';
          await client.query(`
            UPDATE email_queue
            SET status = $1, attempts = $2, last_error = $3, last_attempted_at = NOW()
            WHERE id = $4
          `, [newStatus, newAttempts, result.error || 'Unknown send error', email.id]);

          if (newStatus === 'failed') {
            failed++;
          } else {
            retried++;
          }
        }
      } catch (err) {
        const newAttempts = email.attempts + 1;
        const newStatus = newAttempts >= email.max_attempts ? 'failed' : 'pending';
        await client.query(`
          UPDATE email_queue
          SET status = $1, attempts = $2, last_error = $3, last_attempted_at = NOW()
          WHERE id = $4
        `, [newStatus, newAttempts, err.message, email.id]);

        if (newStatus === 'failed') {
          failed++;
        } else {
          retried++;
        }
      }
    }

    await client.query('COMMIT');

    // Release advisory lock
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);

    return { processed: emails.length, sent, failed, retried };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
    } catch (_) {
      // Lock release failed — will auto-release on disconnect
    }
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get email queue statistics for health checks.
 */
const getQueueStats = async () => {
  const result = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'sent') AS sent,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed,
      COUNT(*) FILTER (WHERE status = 'pending' AND attempts > 0) AS retrying
    FROM email_queue
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `);
  return result.rows[0];
};

module.exports = {
  processEmailQueue,
  getQueueStats,
};
