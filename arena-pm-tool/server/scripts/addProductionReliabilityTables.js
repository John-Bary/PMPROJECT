// Script to add Phase 3 production reliability tables (email_queue, reminder_log)
// Run: node server/scripts/addProductionReliabilityTables.js

const { pool } = require('../config/database');

const SQL = `
-- Email Queue Table
CREATE TABLE IF NOT EXISTS email_queue (
    id SERIAL PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    template VARCHAR(100) NOT NULL,
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed')),
    last_error TEXT,
    last_attempted_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_pending
    ON email_queue (status, created_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_created
    ON email_queue (created_at DESC);

-- Reminder Log Table
CREATE TABLE IF NOT EXISTS reminder_log (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminded_on DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_reminder_per_task_user_day
        UNIQUE (task_id, user_id, reminded_on)
);

CREATE INDEX IF NOT EXISTS idx_reminder_log_lookup
    ON reminder_log (task_id, user_id, reminded_on);

CREATE INDEX IF NOT EXISTS idx_reminder_log_date
    ON reminder_log (reminded_on);
`;

async function run() {
  try {
    console.log('Creating production reliability tables...');
    await pool.query(SQL);
    console.log('Done. Tables created: email_queue, reminder_log');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
