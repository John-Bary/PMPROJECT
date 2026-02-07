/**
 * Initial migration - captures existing schema baseline.
 * This migration documents the existing database state.
 * If running against an existing database, these tables already exist.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Enable UUID extension
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Users table
  pgm.createTable('users', {
    id: 'id',
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password: { type: 'varchar(255)', notNull: true },
    name: { type: 'varchar(100)' },
    first_name: { type: 'varchar(60)', notNull: true, default: '' },
    last_name: { type: 'varchar(60)', notNull: true, default: '' },
    avatar_url: { type: 'varchar(500)' },
    avatar_color: { type: 'varchar(7)', default: "'#6366f1'" },
    role: { type: 'varchar(20)', default: "'member'", check: "role IN ('admin', 'member')" },
    language: { type: 'varchar(10)', default: "'en'" },
    timezone: { type: 'varchar(50)', default: "'UTC'" },
    email_notifications_enabled: { type: 'boolean', default: true },
    email_digest_mode: { type: 'varchar(20)', default: "'immediate'", check: "email_digest_mode IN ('immediate', 'daily', 'weekly', 'none')" },
    created_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });

  // Workspaces table
  pgm.createTable('workspaces', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(100)', notNull: true },
    owner_id: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });

  // Workspace members table
  pgm.createTable('workspace_members', {
    id: 'id',
    workspace_id: { type: 'uuid', notNull: true, references: 'workspaces(id)', onDelete: 'CASCADE' },
    user_id: { type: 'integer', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    role: { type: 'varchar(20)', notNull: true, default: "'member'", check: "role IN ('admin', 'member', 'viewer')" },
    joined_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
    onboarding_completed_at: { type: 'timestamptz' },
  }, {
    ifNotExists: true,
    constraints: {
      unique: [['workspace_id', 'user_id']],
    },
  });

  // Workspace invitations table
  pgm.createTable('workspace_invitations', {
    id: 'id',
    workspace_id: { type: 'uuid', notNull: true, references: 'workspaces(id)', onDelete: 'CASCADE' },
    email: { type: 'varchar(255)', notNull: true },
    role: { type: 'varchar(20)', notNull: true, default: "'member'", check: "role IN ('admin', 'member', 'viewer')" },
    invited_by: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
    token: { type: 'varchar(64)', notNull: true, unique: true },
    expires_at: { type: 'timestamptz', default: pgm.func("CURRENT_TIMESTAMP + INTERVAL '7 days'") },
    accepted_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });

  // Workspace onboarding progress table
  pgm.createTable('workspace_onboarding_progress', {
    id: 'id',
    workspace_id: { type: 'uuid', notNull: true, references: 'workspaces(id)', onDelete: 'CASCADE' },
    user_id: { type: 'integer', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    current_step: { type: 'integer', default: 1 },
    steps_completed: { type: 'jsonb', default: "'[]'::jsonb" },
    profile_updated: { type: 'boolean', default: false },
    skipped_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  }, {
    ifNotExists: true,
    constraints: {
      unique: [['workspace_id', 'user_id']],
    },
  });

  // Categories table
  pgm.createTable('categories', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true },
    color: { type: 'varchar(7)', default: "'#6366f1'" },
    position: { type: 'integer', default: 0 },
    created_by: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
    workspace_id: { type: 'uuid', references: 'workspaces(id)', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  }, {
    ifNotExists: true,
    constraints: {
      unique: [['name', 'created_by', 'workspace_id']],
    },
  });

  // Tasks table
  pgm.createTable('tasks', {
    id: 'id',
    title: { type: 'varchar(500)', notNull: true },
    description: { type: 'text' },
    category_id: { type: 'integer', references: 'categories(id)', onDelete: 'CASCADE' },
    priority: { type: 'varchar(10)', default: "'medium'", check: "priority IN ('low', 'medium', 'high', 'urgent')" },
    status: { type: 'varchar(20)', default: "'todo'", check: "status IN ('todo', 'in_progress', 'completed')" },
    due_date: { type: 'date' },
    completed_at: { type: 'timestamptz' },
    position: { type: 'integer', default: 0 },
    parent_task_id: { type: 'integer', references: 'tasks(id)', onDelete: 'CASCADE' },
    assignee_id: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
    created_by: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
    workspace_id: { type: 'uuid', references: 'workspaces(id)', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });

  // Task assignments table
  pgm.createTable('task_assignments', {
    task_id: { type: 'integer', notNull: true, references: 'tasks(id)', onDelete: 'CASCADE' },
    user_id: { type: 'integer', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    assigned_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  }, {
    ifNotExists: true,
    constraints: {
      primaryKey: ['task_id', 'user_id'],
    },
  });

  // Comments table
  pgm.createTable('comments', {
    id: 'id',
    task_id: { type: 'integer', notNull: true, references: 'tasks(id)', onDelete: 'CASCADE' },
    author_id: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
    content: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });
};

exports.down = (pgm) => {
  // Drop in reverse order of creation
  pgm.dropTable('comments', { ifExists: true, cascade: true });
  pgm.dropTable('task_assignments', { ifExists: true, cascade: true });
  pgm.dropTable('tasks', { ifExists: true, cascade: true });
  pgm.dropTable('categories', { ifExists: true, cascade: true });
  pgm.dropTable('workspace_onboarding_progress', { ifExists: true, cascade: true });
  pgm.dropTable('workspace_invitations', { ifExists: true, cascade: true });
  pgm.dropTable('workspace_members', { ifExists: true, cascade: true });
  pgm.dropTable('workspaces', { ifExists: true, cascade: true });
  pgm.dropTable('users', { ifExists: true, cascade: true });
};
