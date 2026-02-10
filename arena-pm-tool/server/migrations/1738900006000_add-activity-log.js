exports.up = (pgm) => {
  pgm.createTable('activity_log', {
    id: { type: 'serial', primaryKey: true },
    workspace_id: { type: 'uuid', notNull: true, references: 'workspaces(id)', onDelete: 'CASCADE' },
    user_id: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
    action: { type: 'varchar(50)', notNull: true },
    entity_type: { type: 'varchar(30)', notNull: true },
    entity_id: { type: 'varchar(50)' },
    metadata: { type: 'jsonb', default: pgm.func("'{}'::jsonb") },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.createIndex('activity_log', 'workspace_id');
  pgm.createIndex('activity_log', ['created_at'], { method: 'btree', order: 'DESC' });
  pgm.createIndex('activity_log', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('activity_log');
};
