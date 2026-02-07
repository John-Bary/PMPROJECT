/**
 * Migration: Add billing tables for SaaS infrastructure
 * Creates plans, subscriptions, and invoices tables.
 * Also adds composite indexes from Phase 1.4.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // PLANS TABLE - Defines pricing tiers
  // ============================================================================
  pgm.createTable('plans', {
    id: { type: 'varchar(50)', primaryKey: true },
    name: { type: 'varchar(100)', notNull: true },
    price_per_seat_cents: { type: 'integer', notNull: true },
    max_members: { type: 'integer' },           // NULL = unlimited
    max_tasks_per_workspace: { type: 'integer' }, // NULL = unlimited
    features: { type: 'jsonb', default: "'{}'::jsonb" },
    active: { type: 'boolean', default: true },
    created_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  });

  // ============================================================================
  // SUBSCRIPTIONS TABLE - Each workspace has a subscription
  // ============================================================================
  pgm.createTable('subscriptions', {
    id: 'id',
    workspace_id: {
      type: 'uuid',
      notNull: true,
      references: 'workspaces(id)',
      onDelete: 'CASCADE',
      unique: true,
    },
    plan_id: {
      type: 'varchar(50)',
      notNull: true,
      references: 'plans(id)',
    },
    stripe_customer_id: { type: 'varchar(255)' },
    stripe_subscription_id: { type: 'varchar(255)' },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: "'active'",
      check: "status IN ('active', 'past_due', 'canceled', 'trialing')",
    },
    trial_ends_at: { type: 'timestamptz' },
    current_period_start: { type: 'timestamptz' },
    current_period_end: { type: 'timestamptz' },
    seat_count: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  });

  // ============================================================================
  // INVOICES TABLE - Record-keeping for billing history
  // ============================================================================
  pgm.createTable('invoices', {
    id: 'id',
    workspace_id: {
      type: 'uuid',
      notNull: true,
      references: 'workspaces(id)',
    },
    stripe_invoice_id: { type: 'varchar(255)' },
    amount_cents: { type: 'integer', notNull: true },
    status: { type: 'varchar(20)', notNull: true },
    period_start: { type: 'timestamptz' },
    period_end: { type: 'timestamptz' },
    pdf_url: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  });

  // ============================================================================
  // INDEXES for billing tables
  // ============================================================================
  pgm.createIndex('subscriptions', 'workspace_id', { name: 'idx_subscriptions_workspace_id' });
  pgm.createIndex('subscriptions', 'stripe_customer_id', { name: 'idx_subscriptions_stripe_customer_id' });
  pgm.createIndex('subscriptions', 'stripe_subscription_id', { name: 'idx_subscriptions_stripe_subscription_id' });
  pgm.createIndex('subscriptions', 'status', { name: 'idx_subscriptions_status' });
  pgm.createIndex('invoices', 'workspace_id', { name: 'idx_invoices_workspace_id' });
  pgm.createIndex('invoices', 'stripe_invoice_id', { name: 'idx_invoices_stripe_invoice_id' });

  // ============================================================================
  // COMPOSITE INDEXES (Phase 1.4 - performance optimization)
  // ============================================================================
  pgm.createIndex('tasks', ['workspace_id', 'due_date'], {
    name: 'idx_tasks_workspace_due',
    ifNotExists: true,
  });
  pgm.createIndex('tasks', ['workspace_id', 'status'], {
    name: 'idx_tasks_workspace_status',
    ifNotExists: true,
  });
  pgm.createIndex('tasks', ['workspace_id', 'category_id'], {
    name: 'idx_tasks_workspace_category',
    ifNotExists: true,
  });
  pgm.createIndex('workspace_members', ['workspace_id', 'role'], {
    name: 'idx_workspace_members_role',
    ifNotExists: true,
  });
  pgm.createIndex('workspace_invitations', ['workspace_id', 'email'], {
    name: 'idx_invitations_workspace_email',
    where: 'accepted_at IS NULL',
    ifNotExists: true,
  });

  // ============================================================================
  // AUTO-UPDATE trigger for subscriptions.updated_at
  // ============================================================================
  pgm.sql(`
    CREATE TRIGGER update_subscriptions_updated_at
      BEFORE UPDATE ON subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions');

  // Drop composite indexes
  pgm.dropIndex('workspace_invitations', ['workspace_id', 'email'], { name: 'idx_invitations_workspace_email', ifExists: true });
  pgm.dropIndex('workspace_members', ['workspace_id', 'role'], { name: 'idx_workspace_members_role', ifExists: true });
  pgm.dropIndex('tasks', ['workspace_id', 'category_id'], { name: 'idx_tasks_workspace_category', ifExists: true });
  pgm.dropIndex('tasks', ['workspace_id', 'status'], { name: 'idx_tasks_workspace_status', ifExists: true });
  pgm.dropIndex('tasks', ['workspace_id', 'due_date'], { name: 'idx_tasks_workspace_due', ifExists: true });

  // Drop billing tables
  pgm.dropTable('invoices', { ifExists: true, cascade: true });
  pgm.dropTable('subscriptions', { ifExists: true, cascade: true });
  pgm.dropTable('plans', { ifExists: true, cascade: true });
};
