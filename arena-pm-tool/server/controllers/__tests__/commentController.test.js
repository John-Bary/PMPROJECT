const {
  getCommentsByTaskId,
  createComment,
  updateComment,
  deleteComment
} = require('../commentController');

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../middleware/workspaceAuth', () => ({
  verifyWorkspaceAccess: jest.fn(),
}));

const { query } = require('../../config/database');
const { verifyWorkspaceAccess } = require('../../middleware/workspaceAuth');

describe('Comment Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    req.user = { id: 1 };
    jest.clearAllMocks();
    // Default: workspace access granted
    verifyWorkspaceAccess.mockResolvedValue({ role: 'member' });
  });

  // Helper: mock the verifyTaskWorkspaceAccess flow (task lookup + workspace check)
  const mockTaskExists = (workspaceId = 'ws-uuid-123') => {
    // First query in verifyTaskWorkspaceAccess: SELECT workspace_id FROM tasks
    query.mockResolvedValueOnce({ rows: [{ workspace_id: workspaceId }] });
  };

  const mockTaskNotFound = () => {
    query.mockResolvedValueOnce({ rows: [] });
  };

  describe('getCommentsByTaskId', () => {
    it('should return comments with author data', async () => {
      req.params = { taskId: '1' };
      mockTaskExists();
      const mockComments = [
        {
          id: 1, task_id: 1, author_id: 1, content: 'First comment',
          author_name: 'User 1', created_at: new Date(), updated_at: new Date()
        },
        {
          id: 2, task_id: 1, author_id: 2, content: 'Second comment',
          author_name: 'User 2', created_at: new Date(), updated_at: new Date()
        }
      ];
      query.mockResolvedValue({ rows: mockComments });

      await getCommentsByTaskId(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          comments: expect.arrayContaining([
            expect.objectContaining({ id: 1, taskId: 1, content: 'First comment', authorName: 'User 1' }),
            expect.objectContaining({ id: 2, taskId: 1, content: 'Second comment', authorName: 'User 2' })
          ]),
          count: 2
        })
      }));
    });

    it('should return 404 when task not found', async () => {
      req.params = { taskId: '999' };
      mockTaskNotFound();

      await getCommentsByTaskId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task not found'
      });
    });

    it('should return 403 when user lacks workspace access', async () => {
      req.params = { taskId: '1' };
      // Task exists but user has no workspace access
      query.mockResolvedValueOnce({ rows: [{ workspace_id: 'ws-uuid-123' }] });
      verifyWorkspaceAccess.mockResolvedValue(null);

      await getCommentsByTaskId(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
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
      mockTaskNotFound();

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
      mockTaskExists();
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert
      query.mockResolvedValueOnce({ rows: [{
        id: 1, task_id: 1, author_id: 5, content: 'Test comment',
        author_name: 'Test User', created_at: new Date(), updated_at: new Date()
      }] }); // Full comment fetch

      await createComment(req, res);

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
      mockTaskExists();
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert
      query.mockResolvedValueOnce({ rows: [{
        id: 1, task_id: 1, author_id: 1, content: 'Test comment with spaces',
        author_name: 'Test User', created_at: new Date(), updated_at: new Date()
      }] }); // Full comment

      await createComment(req, res);

      // Check that the INSERT was called with trimmed content
      const insertCall = query.mock.calls.find(call =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO comments')
      );
      expect(insertCall[1]).toContain('Test comment with spaces');
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
      // Comment found
      query.mockResolvedValueOnce({ rows: [{ id: 1, author_id: 1, task_id: 10, content: 'Original' }] });
      // verifyTaskWorkspaceAccess: task lookup
      query.mockResolvedValueOnce({ rows: [{ workspace_id: 'ws-uuid-123' }] });

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
      // Comment found
      query.mockResolvedValueOnce({ rows: [{ id: 1, author_id: 1, task_id: 10, content: 'Original' }] });
      // verifyTaskWorkspaceAccess: task lookup
      query.mockResolvedValueOnce({ rows: [{ workspace_id: 'ws-uuid-123' }] });
      // Update query
      query.mockResolvedValueOnce({ rows: [] });
      // Full comment fetch
      query.mockResolvedValueOnce({ rows: [{
        id: 1, task_id: 10, author_id: 1, content: 'Updated content',
        author_name: 'Test User', created_at: new Date(), updated_at: new Date()
      }] });

      await updateComment(req, res);

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
      // Comment found
      query.mockResolvedValueOnce({ rows: [{ id: 1, author_id: 1, task_id: 10 }] });
      // verifyTaskWorkspaceAccess: task lookup
      query.mockResolvedValueOnce({ rows: [{ workspace_id: 'ws-uuid-123' }] });

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
      // Comment found
      query.mockResolvedValueOnce({ rows: [{ id: 1, author_id: 1, task_id: 10 }] });
      // verifyTaskWorkspaceAccess: task lookup
      query.mockResolvedValueOnce({ rows: [{ workspace_id: 'ws-uuid-123' }] });
      // Delete query
      query.mockResolvedValueOnce({ rows: [] });

      await deleteComment(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Comment deleted successfully'
      });
    });
  });
});
