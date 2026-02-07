// Category Routes
// Defines all category-related API endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const withErrorHandling = require('../lib/withErrorHandling');
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

// Category CRUD routes
router.get('/', withErrorHandling(getAllCategories));         // GET /api/categories
router.post('/', withErrorHandling(createCategory));          // POST /api/categories
router.patch('/reorder', withErrorHandling(reorderCategories)); // PATCH /api/categories/reorder (must be before /:id)
router.get('/:id', withErrorHandling(getCategoryById));       // GET /api/categories/:id
router.put('/:id', withErrorHandling(updateCategory));        // PUT /api/categories/:id
router.delete('/:id', withErrorHandling(deleteCategory));     // DELETE /api/categories/:id

module.exports = router;
