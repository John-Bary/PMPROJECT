/**
 * Migration: Add compliance fields for GDPR, ToS tracking, and audit logging.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // User compliance columns
  pgm.addColumns('users', {
    tos_accepted_at: { type: 'timestamptz', default: null },
    privacy_accepted_at: { type: 'timestamptz', default: null },
    deleted_at: { type: 'timestamptz', default: null },
  }, { ifNotExists: true });

  // Audit logs table
  pgm.createTable('audit_logs', {
    id: { type: 'bigserial', primaryKey: true },
    workspace_id: { type: 'uuid', references: 'workspaces(id)', onDelete: 'SET NULL' },
    user_id: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
    action: { type: 'varchar(50)', notNull: true },
    resource_type: { type: 'varchar(30)' },
    resource_id: { type: 'varchar(50)' },
    details: { type: 'jsonb' },
    ip_address: { type: 'inet' },
    user_agent: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.createIndex('audit_logs', ['workspace_id', { name: 'created_at', sort: 'DESC' }], {
    name: 'idx_audit_workspace',
  });
  pgm.createIndex('audit_logs', ['user_id', { name: 'created_at', sort: 'DESC' }], {
    name: 'idx_audit_user',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('audit_logs', [], { name: 'idx_audit_user', ifExists: true });
  pgm.dropIndex('audit_logs', [], { name: 'idx_audit_workspace', ifExists: true });
  pgm.dropTable('audit_logs', { ifExists: true });
  pgm.dropColumns('users', ['tos_accepted_at', 'privacy_accepted_at', 'deleted_at'], {
    ifExists: true,
  });
};
