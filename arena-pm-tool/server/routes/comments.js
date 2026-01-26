// Comments Routes
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const commentController = require('../controllers/commentController');

// All comment routes require authentication
router.use(authMiddleware);

// Update a comment
router.put('/:id', commentController.updateComment);

// Delete a comment
router.delete('/:id', commentController.deleteComment);

module.exports = router;
