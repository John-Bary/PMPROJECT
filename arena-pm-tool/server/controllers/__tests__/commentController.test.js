const {
  getCommentsByTaskId,
  createComment,
  updateComment,
  deleteComment
} = require('../commentController');

// Mock dependencies
jest.mock('../../config/database');

const { query } = require('../../config/database');

describe('Comment Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    req.user = { id: 1 };
    jest.clearAllMocks();
  });

  describe('getCommentsByTaskId', () => {
    it('should return comments with author data', async () => {
      req.params = { taskId: '1' };
      const mockComments = [
        {
          id: 1, task_id: 1, author_id: 1, content: 'First comment',
          author_name: 'User 1', author_email: 'user1@test.com',
          created_at: new Date(), updated_at: new Date()
        },
        {
          id: 2, task_id: 1, author_id: 2, content: 'Second comment',
          author_name: 'User 2', author_email: 'user2@test.com',
          created_at: new Date(), updated_at: new Date()
        }
      ];
      query.mockResolvedValue({ rows: mockComments });

      await getCommentsByTaskId(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          comments: [
            expect.objectContaining({ id: 1, taskId: 1, content: 'First comment', authorName: 'User 1' }),
            expect.objectContaining({ id: 2, taskId: 1, content: 'Second comment', authorName: 'User 2' })
          ],
          count: 2
        }
      });
    });

    it('should return empty array when no comments', async () => {
      req.params = { taskId: '1' };
      query.mockResolvedValue({ rows: [] });

      await getCommentsByTaskId(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { comments: [], count: 0 }
      });
    });

    it('should handle database errors', async () => {
      req.params = { taskId: '1' };
      query.mockRejectedValue(new Error('Database error'));

      await getCommentsByTaskId(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error fetching comments',
        error: 'Database error'
      });
    });
  });

  describe('createComment', () => {
    it('should return 400 if content is missing', async () => {
      req.params = { taskId: '1' };
      req.body = {};

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Comment content is required'
      });
    });

    it('should return 400 if content is empty whitespace', async () => {
      req.params = { taskId: '1' };
      req.body = { content: '   ' };

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Comment content is required'
      });
    });

    it('should return 404 if task not found', async () => {
      req.params = { taskId: '999' };
      req.body = { content: 'Test comment' };
      query.mockResolvedValue({ rows: [] });

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task not found'
      });
    });

    it('should create comment with author_id from req.user', async () => {
      req.params = { taskId: '1' };
      req.body = { content: 'Test comment' };
      req.user = { id: 5 };
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Task exists
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert
      query.mockResolvedValueOnce({ rows: [{
        id: 1, task_id: 1, author_id: 5, content: 'Test comment',
        author_name: 'Test User', author_email: 'test@test.com',
        created_at: new Date(), updated_at: new Date()
      }] }); // Full comment

      await createComment(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO comments'),
        ['1', 5, 'Test comment']
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Comment created successfully',
        data: {
          comment: expect.objectContaining({
            id: 1,
            taskId: 1,
            authorId: 5,
            content: 'Test comment'
          })
        }
      });
    });

    it('should trim whitespace from content', async () => {
      req.params = { taskId: '1' };
      req.body = { content: '  Test comment with spaces  ' };
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Task exists
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert
      query.mockResolvedValueOnce({ rows: [{
        id: 1, task_id: 1, author_id: 1, content: 'Test comment with spaces',
        author_name: 'Test User', author_email: 'test@test.com',
        created_at: new Date(), updated_at: new Date()
      }] }); // Full comment

      await createComment(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO comments'),
        ['1', 1, 'Test comment with spaces']
      );
    });
  });

  describe('updateComment', () => {
    it('should return 400 if content is empty', async () => {
      req.params = { id: '1' };
      req.body = { content: '' };

      await updateComment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Comment content is required'
      });
    });

    it('should return 404 if comment not found', async () => {
      req.params = { id: '999' };
      req.body = { content: 'Updated content' };
      query.mockResolvedValue({ rows: [] });

      await updateComment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Comment not found'
      });
    });

    it('should return 403 if not comment author', async () => {
      req.params = { id: '1' };
      req.body = { content: 'Updated content' };
      req.user = { id: 2 };
      query.mockResolvedValue({ rows: [{ id: 1, author_id: 1, content: 'Original' }] });

      await updateComment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You can only edit your own comments'
      });
    });

    it('should update comment when user is author', async () => {
      req.params = { id: '1' };
      req.body = { content: 'Updated content' };
      req.user = { id: 1 };
      query.mockResolvedValueOnce({ rows: [{ id: 1, author_id: 1, content: 'Original' }] }); // Check
      query.mockResolvedValueOnce({ rows: [] }); // Update
      query.mockResolvedValueOnce({ rows: [{
        id: 1, task_id: 1, author_id: 1, content: 'Updated content',
        author_name: 'Test User', author_email: 'test@test.com',
        created_at: new Date(), updated_at: new Date()
      }] }); // Full comment

      await updateComment(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE comments'),
        ['Updated content', '1']
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Comment updated successfully',
        data: {
          comment: expect.objectContaining({
            content: 'Updated content'
          })
        }
      });
    });
  });

  describe('deleteComment', () => {
    it('should return 404 if comment not found', async () => {
      req.params = { id: '999' };
      query.mockResolvedValue({ rows: [] });

      await deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Comment not found'
      });
    });

    it('should return 403 if not comment author', async () => {
      req.params = { id: '1' };
      req.user = { id: 2 };
      query.mockResolvedValue({ rows: [{ id: 1, author_id: 1 }] });

      await deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You can only delete your own comments'
      });
    });

    it('should delete comment when user is author', async () => {
      req.params = { id: '1' };
      req.user = { id: 1 };
      query.mockResolvedValueOnce({ rows: [{ id: 1, author_id: 1 }] }); // Check
      query.mockResolvedValueOnce({ rows: [] }); // Delete

      await deleteComment(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        'DELETE FROM comments WHERE id = $1',
        ['1']
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Comment deleted successfully'
      });
    });
  });
});
