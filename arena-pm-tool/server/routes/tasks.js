// Task Routes
// Defines all task-related API endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/billingGuard');
const { checkTaskLimit } = require('../middleware/planLimits');
const { auditLog } = require('../middleware/auditLog');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema, createCommentSchema } = require('../middleware/schemas');
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
router.get('/', getAllTasks);              // GET /api/tasks (with optional filters + pagination)
router.get('/:id', getTaskById);           // GET /api/tasks/:id
router.get('/:id/subtasks', getSubtasks);  // GET /api/tasks/:id/subtasks
router.post('/', requireActiveSubscription, checkTaskLimit, validate(createTaskSchema), auditLog('create', 'task'), createTask); // POST /api/tasks
router.put('/:id', requireActiveSubscription, validate(updateTaskSchema), auditLog('update', 'task'), updateTask);              // PUT /api/tasks/:id
router.patch('/:id/position', requireActiveSubscription, auditLog('reorder', 'task'), updateTaskPosition); // PATCH /api/tasks/:id/position
router.delete('/:id', requireActiveSubscription, auditLog('delete', 'task'), deleteTask);           // DELETE /api/tasks/:id

// Task comments routes
router.get('/:taskId/comments', getCommentsByTaskId); // GET /api/tasks/:taskId/comments
router.post('/:taskId/comments', requireActiveSubscription, validate(createCommentSchema), createComment); // POST /api/tasks/:taskId/comments

module.exports = router;
