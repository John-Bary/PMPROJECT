// Comment Controller
// Handles all comment-related operations

const { query } = require('../config/database');

// Get comments for a task
const getCommentsByTaskId = async (req, res) => {
  try {
    const { taskId } = req.params;

    const result = await query(`
      SELECT
        c.id, c.task_id, c.author_id, c.content,
        c.created_at, c.updated_at,
        u.name as author_name, u.email as author_email
      FROM comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC
    `, [taskId]);

    res.json({
      status: 'success',
      data: {
        comments: result.rows.map(comment => ({
          id: comment.id,
          taskId: comment.task_id,
          authorId: comment.author_id,
          authorName: comment.author_name,
          authorEmail: comment.author_email,
          content: comment.content,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at
        })),
        count: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching comments',
      error: error.message
    });
  }
};

// Create a new comment
const createComment = async (req, res) => {
  try {
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

    // Check if task exists
    const taskCheck = await query('SELECT id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
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
        u.name as author_name, u.email as author_email
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
          authorEmail: fullComment.author_email,
          content: fullComment.content,
          createdAt: fullComment.created_at,
          updatedAt: fullComment.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating comment',
      error: error.message
    });
  }
};

// Update a comment
const updateComment = async (req, res) => {
  try {
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

    // Check if comment exists and belongs to user
    const checkResult = await query('SELECT * FROM comments WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
    }

    const comment = checkResult.rows[0];
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
        u.name as author_name, u.email as author_email
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
          authorEmail: updatedComment.author_email,
          content: updatedComment.content,
          createdAt: updatedComment.created_at,
          updatedAt: updatedComment.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating comment',
      error: error.message
    });
  }
};

// Delete a comment
const deleteComment = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting comment',
      error: error.message
    });
  }
};

module.exports = {
  getCommentsByTaskId,
  createComment,
  updateComment,
  deleteComment
};
