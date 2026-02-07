// Activity Log - Lightweight workspace activity tracker
// Usage: await logActivity(workspaceId, userId, 'created', 'task', taskId, { title })

const { query } = require('../config/database');

async function logActivity(workspaceId, userId, action, entityType, entityId, metadata = {}) {
  try {
    await query(
      `INSERT INTO activity_log (workspace_id, user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workspaceId, userId, action, entityType, String(entityId), JSON.stringify(metadata)]
    );
  } catch (error) {
    // Log but don't throw — activity logging should never break the main flow
    console.error('Activity log error:', error.message);
  }
}

module.exports = { logActivity };
