/**
 * Migration: Add email queue and reminder log tables for production reliability.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Email Queue Table
  pgm.createTable('email_queue', {
    id: { type: 'serial', primaryKey: true },
    to_email: { type: 'varchar(255)', notNull: true },
    subject: { type: 'varchar(500)', notNull: true },
    template: { type: 'varchar(100)', notNull: true },
    template_data: { type: 'jsonb', notNull: true, default: "'{}'::jsonb" },
    attempts: { type: 'integer', notNull: true, default: 0 },
    max_attempts: { type: 'integer', notNull: true, default: 3 },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: "'pending'",
      check: "status IN ('pending', 'sent', 'failed')",
    },
    last_error: { type: 'text' },
    last_attempted_at: { type: 'timestamptz' },
    sent_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  }, { ifNotExists: true });

  pgm.createIndex('email_queue', ['status', 'created_at'], {
    name: 'idx_email_queue_pending',
    where: "status = 'pending'",
    ifNotExists: true,
  });

  pgm.createIndex('email_queue', [{ name: 'created_at', sort: 'DESC' }], {
    name: 'idx_email_queue_created',
    ifNotExists: true,
  });

  // Reminder Log Table
  pgm.createTable('reminder_log', {
    id: { type: 'serial', primaryKey: true },
    task_id: { type: 'integer', notNull: true, references: 'tasks(id)', onDelete: 'CASCADE' },
    user_id: { type: 'integer', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    reminded_on: { type: 'date', notNull: true, default: pgm.func('CURRENT_DATE') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  }, { ifNotExists: true });

  pgm.addConstraint('reminder_log', 'unique_reminder_per_task_user_day', {
    unique: ['task_id', 'user_id', 'reminded_on'],
  });

  pgm.createIndex('reminder_log', ['task_id', 'user_id', 'reminded_on'], {
    name: 'idx_reminder_log_lookup',
    ifNotExists: true,
  });

  pgm.createIndex('reminder_log', ['reminded_on'], {
    name: 'idx_reminder_log_date',
    ifNotExists: true,
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('reminder_log', [], { name: 'idx_reminder_log_date', ifExists: true });
  pgm.dropIndex('reminder_log', [], { name: 'idx_reminder_log_lookup', ifExists: true });
  pgm.dropTable('reminder_log', { ifExists: true });
  pgm.dropIndex('email_queue', [], { name: 'idx_email_queue_created', ifExists: true });
  pgm.dropIndex('email_queue', [], { name: 'idx_email_queue_pending', ifExists: true });
  pgm.dropTable('email_queue', { ifExists: true });
};
