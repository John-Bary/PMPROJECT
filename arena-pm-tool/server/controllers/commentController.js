// Comment Controller
// Handles all comment-related operations
// AUTHZ-04/05: workspace scope checks added to all endpoints
// DATA-06: author_email removed from responses

const { query } = require('../config/database');
const { verifyWorkspaceAccess } = require('../middleware/workspaceAuth');

// Helper: verify user has access to the task's workspace
const verifyTaskWorkspaceAccess = async (taskId, userId) => {
  const taskResult = await query(
    'SELECT workspace_id FROM tasks WHERE id = $1',
    [taskId]
  );
  if (taskResult.rows.length === 0) {
    return { exists: false };
  }
  const task = taskResult.rows[0];
  if (task.workspace_id) {
    const membership = await verifyWorkspaceAccess(userId, task.workspace_id);
    if (!membership) {
      return { exists: true, authorized: false };
    }
    return { exists: true, authorized: true, membership };
  }
  return { exists: true, authorized: true };
};

// Get comments for a task (AUTHZ-04: workspace scope added, paginated)
const getCommentsByTaskId = async (req, res) => {
  const { taskId } = req.params;
  const { cursor, limit: limitParam } = req.query;

  // Pagination defaults (20 per page for comments)
  const limit = Math.min(Math.max(parseInt(limitParam) || 20, 1), 100);

  // Verify user has access to the task's workspace
  const access = await verifyTaskWorkspaceAccess(taskId, req.user.id);
  if (!access.exists) {
    return res.status(404).json({
      status: 'error',
      message: 'Task not found'
    });
  }
  if (!access.authorized) {
    return res.status(403).json({
      status: 'error',
      message: 'You do not have access to this workspace'
    });
  }

  const params = [taskId];
  let paramCount = 2;

  let queryText = `
    SELECT
      c.id, c.task_id, c.author_id, c.content,
      c.created_at, c.updated_at,
      u.name as author_name
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.task_id = $1
  `;

  if (cursor) {
    queryText += ` AND c.id > $${paramCount}`;
    params.push(parseInt(cursor));
    paramCount++;
  }

  queryText += ` ORDER BY c.created_at ASC, c.id ASC LIMIT $${paramCount}`;
  params.push(limit + 1);

  const result = await query(queryText, params);

  const hasMore = result.rows.length > limit;
  const comments = hasMore ? result.rows.slice(0, limit) : result.rows;
  const nextCursor = hasMore ? comments[comments.length - 1].id : null;

  res.json({
    status: 'success',
    data: {
      comments: comments.map(comment => ({
        id: comment.id,
        taskId: comment.task_id,
        authorId: comment.author_id,
        authorName: comment.author_name,
        content: comment.content,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      })),
      count: comments.length,
      nextCursor,
      hasMore,
    }
  });
};

// Create a new comment (AUTHZ-04: workspace scope added, INJ-05: length validation)
const createComment = async (req, res) => {
  const { taskId } = req.params;
  const { content } = req.body;
  const authorId = req.user.id;

  // Validate required fields
  if (!content || !content.trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'Comment content is required'
    });
  }

  // Validate content length (INJ-05)
  if (content.length > 5000) {
    return res.status(400).json({
      status: 'error',
      message: 'Comment content must be 5,000 characters or less'
    });
  }

  // Verify user has access to the task's workspace
  const access = await verifyTaskWorkspaceAccess(taskId, req.user.id);
  if (!access.exists) {
    return res.status(404).json({
      status: 'error',
      message: 'Task not found'
    });
  }
  if (!access.authorized) {
    return res.status(403).json({
      status: 'error',
      message: 'You do not have access to this workspace'
    });
  }

  // Insert the comment
  const result = await query(`
    INSERT INTO comments (task_id, author_id, content)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [taskId, authorId, content.trim()]);

  const newComment = result.rows[0];

  // Fetch with author details
  const fullResult = await query(`
    SELECT
      c.id, c.task_id, c.author_id, c.content,
      c.created_at, c.updated_at,
      u.name as author_name
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.id = $1
  `, [newComment.id]);

  const fullComment = fullResult.rows[0];

  res.status(201).json({
    status: 'success',
    message: 'Comment created successfully',
    data: {
      comment: {
        id: fullComment.id,
        taskId: fullComment.task_id,
        authorId: fullComment.author_id,
        authorName: fullComment.author_name,
        content: fullComment.content,
        createdAt: fullComment.created_at,
        updatedAt: fullComment.updated_at
      }
    }
  });
};

// Update a comment (AUTHZ-05: workspace verification added)
const updateComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  // Validate content
  if (!content || !content.trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'Comment content is required'
    });
  }

  // Validate content length (INJ-05)
  if (content.length > 5000) {
    return res.status(400).json({
      status: 'error',
      message: 'Comment content must be 5,000 characters or less'
    });
  }

  // Check if comment exists and belongs to user
  const checkResult = await query('SELECT * FROM comments WHERE id = $1', [id]);
  if (checkResult.rows.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'Comment not found'
    });
  }

  const comment = checkResult.rows[0];

  // Verify workspace access via the comment's task
  const access = await verifyTaskWorkspaceAccess(comment.task_id, userId);
  if (!access.authorized) {
    return res.status(403).json({
      status: 'error',
      message: 'You do not have access to this workspace'
    });
  }

  if (comment.author_id !== userId) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only edit your own comments'
    });
  }

  // Update the comment
  await query(`
    UPDATE comments
    SET content = $1
    WHERE id = $2
  `, [content.trim(), id]);

  // Fetch updated comment with author details
  const fullResult = await query(`
    SELECT
      c.id, c.task_id, c.author_id, c.content,
      c.created_at, c.updated_at,
      u.name as author_name
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.id = $1
  `, [id]);

  const updatedComment = fullResult.rows[0];

  res.json({
    status: 'success',
    message: 'Comment updated successfully',
    data: {
      comment: {
        id: updatedComment.id,
        taskId: updatedComment.task_id,
        authorId: updatedComment.author_id,
        authorName: updatedComment.author_name,
        content: updatedComment.content,
        createdAt: updatedComment.created_at,
        updatedAt: updatedComment.updated_at
      }
    }
  });
};

// Delete a comment (AUTHZ-05: workspace verification added)
const deleteComment = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Check if comment exists and belongs to user
  const checkResult = await query('SELECT * FROM comments WHERE id = $1', [id]);
  if (checkResult.rows.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'Comment not found'
    });
  }

  const comment = checkResult.rows[0];

  // Verify workspace access via the comment's task
  const access = await verifyTaskWorkspaceAccess(comment.task_id, userId);
  if (!access.authorized) {
    return res.status(403).json({
      status: 'error',
      message: 'You do not have access to this workspace'
    });
  }

  if (comment.author_id !== userId) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only delete your own comments'
    });
  }

  // Delete the comment
  await query('DELETE FROM comments WHERE id = $1', [id]);

  res.json({
    status: 'success',
    message: 'Comment deleted successfully'
  });
};

module.exports = {
  getCommentsByTaskId,
  createComment,
  updateComment,
  deleteComment
};
