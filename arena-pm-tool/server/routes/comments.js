// Comments Routes
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const withErrorHandling = require('../lib/withErrorHandling');
const validate = require('../middleware/validate');
const { updateCommentSchema } = require('../middleware/schemas');
const commentController = require('../controllers/commentController');

// All comment routes require authentication
router.use(authMiddleware);

// Update a comment
router.put('/:id', validate(updateCommentSchema), withErrorHandling(commentController.updateComment));

// Delete a comment
router.delete('/:id', withErrorHandling(commentController.deleteComment));

module.exports = router;
