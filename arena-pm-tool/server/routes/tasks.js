// Task Routes
// Defines all task-related API endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const withErrorHandling = require('../lib/withErrorHandling');
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskPosition,
  deleteTask,
  getSubtasks
} = require('../controllers/taskController');
const {
  getCommentsByTaskId,
  createComment
} = require('../controllers/commentController');

// All task routes require authentication
router.use(authMiddleware);

// Task CRUD routes
router.get('/', withErrorHandling(getAllTasks));              // GET /api/tasks (with optional filters)
router.get('/:id', withErrorHandling(getTaskById));           // GET /api/tasks/:id
router.get('/:id/subtasks', withErrorHandling(getSubtasks));  // GET /api/tasks/:id/subtasks
router.post('/', withErrorHandling(createTask));              // POST /api/tasks
router.put('/:id', withErrorHandling(updateTask));            // PUT /api/tasks/:id
router.patch('/:id/position', withErrorHandling(updateTaskPosition)); // PATCH /api/tasks/:id/position
router.delete('/:id', withErrorHandling(deleteTask));         // DELETE /api/tasks/:id

// Task comments routes
router.get('/:taskId/comments', withErrorHandling(getCommentsByTaskId)); // GET /api/tasks/:taskId/comments
router.post('/:taskId/comments', withErrorHandling(createComment));      // POST /api/tasks/:taskId/comments

module.exports = router;
