// Category Routes
// Defines all category-related API endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireActiveSubscription } = require('../middleware/billingGuard');
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} = require('../controllers/categoryController');

// All category routes require authentication
router.use(authMiddleware);

// Category CRUD routes (paginated)
router.get('/', getAllCategories);         // GET /api/categories
router.post('/', requireActiveSubscription, createCategory);          // POST /api/categories
router.patch('/reorder', requireActiveSubscription, reorderCategories); // PATCH /api/categories/reorder (must be before /:id)
router.get('/:id', getCategoryById);       // GET /api/categories/:id
router.put('/:id', requireActiveSubscription, updateCategory);        // PUT /api/categories/:id
router.delete('/:id', requireActiveSubscription, deleteCategory);     // DELETE /api/categories/:id

module.exports = router;
