// Audit logging middleware - logs state-changing operations to audit_logs table
const { query } = require('../config/database');
const logger = require('../lib/logger');

/**
 * Creates middleware that logs an action to the audit_logs table after a successful response.
 * @param {string} action - e.g. 'task.created', 'member.invited'
 * @param {string} resourceType - e.g. 'task', 'category', 'member'
 */
function auditLog(action, resourceType) {
  return (req, res, next) => {
    res.on('finish', () => {
      // Only log successful state-changing responses
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const workspaceId = req.workspace?.id || req.params?.id || req.body?.workspace_id || null;
      const userId = req.user?.id || null;
      const resourceId = req.params?.id || req.params?.taskId || null;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent') || null;

      // Fire-and-forget - don't block the response
      query(
        `INSERT INTO audit_logs (workspace_id, user_id, action, resource_type, resource_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [workspaceId, userId, action, resourceType, resourceId, ipAddress, userAgent]
      ).catch((err) => {
        logger.error({ err, action, resourceType }, 'Failed to write audit log');
      });
    });

    next();
  };
}

module.exports = { auditLog };
