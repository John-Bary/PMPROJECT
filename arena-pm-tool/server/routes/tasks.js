// Task Routes
// Defines all task-related API endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
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
router.get('/', getAllTasks);              // GET /api/tasks (with optional filters)
router.get('/:id', getTaskById);           // GET /api/tasks/:id
router.get('/:id/subtasks', getSubtasks);  // GET /api/tasks/:id/subtasks
router.post('/', createTask);              // POST /api/tasks
router.put('/:id', updateTask);            // PUT /api/tasks/:id
router.patch('/:id/position', updateTaskPosition); // PATCH /api/tasks/:id/position
router.delete('/:id', deleteTask);         // DELETE /api/tasks/:id

// Task comments routes
router.get('/:taskId/comments', getCommentsByTaskId); // GET /api/tasks/:taskId/comments
router.post('/:taskId/comments', createComment);      // POST /api/tasks/:taskId/comments

module.exports = router;
