// Category Routes
// Defines all category-related API endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
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
router.get('/', getAllCategories);         // GET /api/categories
router.post('/', createCategory);          // POST /api/categories
router.patch('/reorder', reorderCategories); // PATCH /api/categories/reorder (must be before /:id)
router.get('/:id', getCategoryById);       // GET /api/categories/:id
router.put('/:id', updateCategory);        // PUT /api/categories/:id
router.delete('/:id', deleteCategory);     // DELETE /api/categories/:id

module.exports = router;
