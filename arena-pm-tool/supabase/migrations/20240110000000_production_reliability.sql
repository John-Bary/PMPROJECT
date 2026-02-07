-- Phase 3: Production Reliability
-- Adds email_queue and reminder_log tables for reliable email delivery
-- and idempotent reminder processing.

-- ============================================================================
-- Email Queue Table
-- Stores emails for asynchronous delivery with retry support.
-- Processed by the email queue cron job every 30 seconds.
-- ============================================================================

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

-- Index for the queue processor to efficiently find pending emails
CREATE INDEX idx_email_queue_pending
    ON email_queue (status, created_at)
    WHERE status = 'pending';

-- Index for health check queries (last 24 hours stats)
CREATE INDEX idx_email_queue_created
    ON email_queue (created_at DESC);


-- ============================================================================
-- Reminder Log Table
-- Tracks sent reminders to prevent duplicate notifications.
-- The unique constraint on (task_id, user_id, reminded_on) serves as the
-- idempotency key — if a reminder was already sent for a task+user today,
-- the task is excluded from the next reminder run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS reminder_log (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminded_on DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_reminder_per_task_user_day
        UNIQUE (task_id, user_id, reminded_on)
);

-- Index for the reminder query to efficiently check existing reminders
CREATE INDEX idx_reminder_log_lookup
    ON reminder_log (task_id, user_id, reminded_on);

-- Index for cleanup job (auto-delete old entries)
CREATE INDEX idx_reminder_log_date
    ON reminder_log (reminded_on);
