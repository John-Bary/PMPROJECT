// Comments Routes
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const withErrorHandling = require('../lib/withErrorHandling');
const commentController = require('../controllers/commentController');

// All comment routes require authentication
router.use(authMiddleware);

// Update a comment
router.put('/:id', withErrorHandling(commentController.updateComment));

// Delete a comment
router.delete('/:id', withErrorHandling(commentController.deleteComment));

module.exports = router;
