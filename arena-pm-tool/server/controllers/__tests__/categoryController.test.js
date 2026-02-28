const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} = require('../categoryController');

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../middleware/workspaceAuth', () => ({
  verifyWorkspaceAccess: jest.fn(),
}));

const { query, getClient } = require('../../config/database');
const { verifyWorkspaceAccess } = require('../../middleware/workspaceAuth');

describe('Category Controller', () => {
  let req, res;
  const workspaceId = 'ws-uuid-123';

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    req.user = { id: 1 };
    jest.clearAllMocks();
    // Default: user has member access
    verifyWorkspaceAccess.mockResolvedValue({ role: 'member' });
  });

  describe('getAllCategories', () => {
    it('should return all categories with task counts', async () => {
      req.query = { workspace_id: workspaceId };
      const mockCategories = [
        {
          id: 1, name: 'Category 1', color: '#3B82F6', position: 0,
          workspace_id: workspaceId, created_by: 1, created_by_name: 'Test User',
          task_count: '5', created_at: new Date(), updated_at: new Date()
        },
        {
          id: 2, name: 'Category 2', color: '#10B981', position: 1,
          workspace_id: workspaceId, created_by: 1, created_by_name: 'Test User',
          task_count: '3', created_at: new Date(), updated_at: new Date()
        }
      ];
      query.mockResolvedValue({ rows: mockCategories });

      await getAllCategories(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          categories: expect.arrayContaining([
            expect.objectContaining({ id: 1, name: 'Category 1', taskCount: 5 }),
            expect.objectContaining({ id: 2, name: 'Category 2', taskCount: 3 })
          ])
        })
      }));
    });

    it('should return empty array when no categories', async () => {
      req.query = { workspace_id: workspaceId };
      query.mockResolvedValue({ rows: [] });

      await getAllCategories(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({ categories: [] })
      }));
    });

    it('should return 400 when workspace_id is missing', async () => {
      req.query = {};

      await getAllCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'workspace_id is required'
      });
    });

    it('should return 403 when user lacks workspace access', async () => {
      req.query = { workspace_id: workspaceId };
      verifyWorkspaceAccess.mockResolvedValue(null);

      await getAllCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getCategoryById', () => {
    it('should return 404 if category not found', async () => {
      req.params = { id: '999' };
      query.mockResolvedValue({ rows: [] });

      await getCategoryById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Category not found'
      });
    });

    it('should return category with all data', async () => {
      req.params = { id: '1' };
      const mockCategory = {
        id: 1, name: 'Category 1', color: '#3B82F6', position: 0,
        workspace_id: workspaceId, created_by: 1, created_by_name: 'Test User',
        created_at: new Date(), updated_at: new Date()
      };
      query.mockResolvedValue({ rows: [mockCategory] });

      await getCategoryById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          category: expect.objectContaining({
            id: 1,
            name: 'Category 1',
            color: '#3B82F6'
          })
        }
      });
    });
  });

  describe('createCategory', () => {
    it('should return 400 if workspace_id is missing', async () => {
      req.body = { name: 'Test' };

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'workspace_id is required'
      });
    });

    it('should return 400 if name is missing', async () => {
      req.body = { workspace_id: workspaceId };

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Category name is required'
      });
    });

    it('should return 400 for invalid color format', async () => {
      req.body = { name: 'Test Category', color: 'invalid', workspace_id: workspaceId };

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid color format. Must be hex color (e.g., #3B82F6)'
      });
    });

    it('should return 400 for invalid hex color (wrong length)', async () => {
      req.body = { name: 'Test Category', color: '#FFF', workspace_id: workspaceId };

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid color format. Must be hex color (e.g., #3B82F6)'
      });
    });

    it('should return 400 if category name already exists', async () => {
      req.body = { name: 'Existing Category', workspace_id: workspaceId };
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Existing category

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Category with this name already exists'
      });
    });

    it('should create category with default color', async () => {
      req.body = { name: 'New Category', workspace_id: workspaceId };
      query.mockResolvedValueOnce({ rows: [] }); // No existing
      query.mockResolvedValueOnce({ rows: [{ next_position: 0 }] }); // Position
      query.mockResolvedValueOnce({ rows: [{
        id: 1, name: 'New Category', color: '#3B82F6', position: 0,
        workspace_id: workspaceId, created_by: 1, created_at: new Date(), updated_at: new Date()
      }] }); // Insert

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Category created successfully',
        data: {
          category: expect.objectContaining({
            name: 'New Category',
            color: '#3B82F6'
          })
        }
      });
    });

    it('should create category with custom color', async () => {
      req.body = { name: 'New Category', color: '#FF5733', workspace_id: workspaceId };
      query.mockResolvedValueOnce({ rows: [] }); // No existing
      query.mockResolvedValueOnce({ rows: [{ next_position: 2 }] }); // Position
      query.mockResolvedValueOnce({ rows: [{
        id: 1, name: 'New Category', color: '#FF5733', position: 2,
        workspace_id: workspaceId, created_by: 1, created_at: new Date(), updated_at: new Date()
      }] }); // Insert

      await createCategory(req, res);

      expect(query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('INSERT INTO categories'),
        ['New Category', '#FF5733', 2, 1, workspaceId]
      );
    });

    it('should return 403 for viewer role', async () => {
      req.body = { name: 'New Category', workspace_id: workspaceId };
      verifyWorkspaceAccess.mockResolvedValue({ role: 'viewer' });

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateCategory', () => {
    const existingCategory = {
      id: 1, name: 'Existing', color: '#3B82F6', position: 0, workspace_id: workspaceId
    };

    it('should return 404 if category not found', async () => {
      req.params = { id: '999' };
      req.body = { name: 'Updated' };
      query.mockResolvedValue({ rows: [] });

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Category not found'
      });
    });

    it('should return 400 for invalid color format', async () => {
      req.params = { id: '1' };
      req.body = { color: 'invalid' };
      query.mockResolvedValue({ rows: [existingCategory] });

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid color format. Must be hex color (e.g., #3B82F6)'
      });
    });

    it('should return 400 if new name conflicts with existing', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Conflicting Name' };
      query.mockResolvedValueOnce({ rows: [existingCategory] }); // Check exists
      query.mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Name conflict

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Category with this name already exists'
      });
    });

    it('should return 400 if no fields to update', async () => {
      req.params = { id: '1' };
      req.body = {};
      query.mockResolvedValue({ rows: [existingCategory] });

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No fields to update'
      });
    });

    it('should update only provided fields (name)', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Updated Name' };
      query.mockResolvedValueOnce({ rows: [existingCategory] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // No name conflict
      query.mockResolvedValueOnce({ rows: [{
        ...existingCategory, name: 'Updated Name', updated_at: new Date()
      }] }); // Update

      await updateCategory(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Category updated successfully'
      }));
    });

    it('should update color', async () => {
      req.params = { id: '1' };
      req.body = { color: '#10B981' };
      query.mockResolvedValueOnce({ rows: [existingCategory] }); // Check exists
      query.mockResolvedValueOnce({ rows: [{
        ...existingCategory, color: '#10B981', updated_at: new Date()
      }] }); // Update

      await updateCategory(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
      }));
    });
  });

  describe('deleteCategory', () => {
    const existingCategory = {
      id: 1, name: 'Category', color: '#3B82F6', position: 2, workspace_id: workspaceId
    };

    it('should return 404 if category not found', async () => {
      req.params = { id: '999' };
      query.mockResolvedValue({ rows: [] });

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Category not found'
      });
    });

    it('should return 400 if category has tasks', async () => {
      req.params = { id: '1' };
      query.mockResolvedValueOnce({ rows: [existingCategory] }); // Check exists
      query.mockResolvedValueOnce({ rows: [{ count: '3' }] }); // Task count

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Cannot delete category with 3 task(s). Please move or delete the tasks first.'
      });
    });

    it('should delete category and reorder remaining', async () => {
      req.params = { id: '1' };
      query.mockResolvedValueOnce({ rows: [existingCategory] }); // Check exists
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] }); // No tasks
      query.mockResolvedValueOnce({ rows: [] }); // Delete
      query.mockResolvedValueOnce({ rows: [] }); // Reorder

      await deleteCategory(req, res);

      expect(query).toHaveBeenNthCalledWith(3,
        'DELETE FROM categories WHERE id = $1',
        ['1']
      );
      expect(query).toHaveBeenNthCalledWith(4,
        expect.stringContaining('position = position - 1'),
        [2, workspaceId]
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Category deleted successfully'
      });
    });
  });

  // -----------------------------------------------------------------
  // reorderCategories
  // -----------------------------------------------------------------
  describe('reorderCategories', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);
    });

    it('should return 400 when categoryIds is missing', async () => {
      req.body = {};

      await reorderCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'categoryIds array is required'
      });
    });

    it('should return 400 when categoryIds is not an array', async () => {
      req.body = { categoryIds: 'not-an-array' };

      await reorderCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'categoryIds array is required'
      });
    });

    it('should return 400 when categoryIds is empty', async () => {
      req.body = { categoryIds: [] };

      await reorderCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'categoryIds array is required'
      });
    });

    it('should return 400 when some category IDs are invalid (not found)', async () => {
      req.body = { categoryIds: [1, 2, 999] };
      // Only 2 rows returned instead of 3
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, workspace_id: workspaceId },
          { id: 2, workspace_id: workspaceId }
        ]
      });

      await reorderCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Some category IDs are invalid'
      });
    });

    it('should return 400 when categories belong to different workspaces', async () => {
      req.body = { categoryIds: [1, 2] };
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, workspace_id: 'ws-aaa' },
          { id: 2, workspace_id: 'ws-bbb' }
        ]
      });

      await reorderCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'All categories must belong to the same workspace'
      });
    });

    it('should return 403 when user lacks workspace access', async () => {
      req.body = { categoryIds: [1, 2] };
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, workspace_id: workspaceId },
          { id: 2, workspace_id: workspaceId }
        ]
      });
      verifyWorkspaceAccess.mockResolvedValueOnce(null);

      await reorderCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    });

    it('should return 403 when user is a viewer', async () => {
      req.body = { categoryIds: [1, 2] };
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, workspace_id: workspaceId },
          { id: 2, workspace_id: workspaceId }
        ]
      });
      verifyWorkspaceAccess.mockResolvedValueOnce({ role: 'viewer' });

      await reorderCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Viewers cannot reorder categories'
      });
    });

    it('should reorder categories in a transaction', async () => {
      const categoryIds = [3, 1, 2];
      req.body = { categoryIds };
      // Verify categories exist
      query.mockResolvedValueOnce({
        rows: [
          { id: 3, workspace_id: workspaceId },
          { id: 1, workspace_id: workspaceId },
          { id: 2, workspace_id: workspaceId }
        ]
      });
      // Fetch updated categories after reorder
      query.mockResolvedValueOnce({
        rows: [
          { id: 3, name: 'Cat 3', color: '#3B82F6', position: 0, created_by: 1, created_by_name: 'Test User', task_count: '0', created_at: new Date(), updated_at: new Date() },
          { id: 1, name: 'Cat 1', color: '#10B981', position: 1, created_by: 1, created_by_name: 'Test User', task_count: '2', created_at: new Date(), updated_at: new Date() },
          { id: 2, name: 'Cat 2', color: '#EF4444', position: 2, created_by: 1, created_by_name: 'Test User', task_count: '1', created_at: new Date(), updated_at: new Date() }
        ]
      });

      await reorderCategories(req, res);

      // Verify transaction lifecycle
      expect(getClient).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE categories SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND workspace_id = $3',
        [0, 3, workspaceId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE categories SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND workspace_id = $3',
        [1, 1, workspaceId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE categories SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND workspace_id = $3',
        [2, 2, workspaceId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      // Verify success response
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Categories reordered successfully'
      }));
    });

    it('should rollback transaction on error', async () => {
      const categoryIds = [1, 2];
      req.body = { categoryIds };
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, workspace_id: workspaceId },
          { id: 2, workspace_id: workspaceId }
        ]
      });

      // Make the second UPDATE call throw inside the transaction
      const txError = new Error('DB write failed');
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })  // BEGIN
        .mockResolvedValueOnce({ rows: [] })  // First UPDATE
        .mockRejectedValueOnce(txError)        // Second UPDATE throws
        .mockResolvedValueOnce({ rows: [] });  // ROLLBACK

      await expect(reorderCategories(req, res)).rejects.toThrow('DB write failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should use workspace_id from body when provided', async () => {
      const bodyWorkspaceId = 'ws-from-body-456';
      req.body = { categoryIds: [1, 2], workspace_id: bodyWorkspaceId };
      // Categories found (their workspace_id differs from body, but only 1 unique)
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, workspace_id: workspaceId },
          { id: 2, workspace_id: workspaceId }
        ]
      });
      // Fetch updated categories
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Cat 1', color: '#3B82F6', position: 0, created_by: 1, created_by_name: 'Test User', task_count: '0', created_at: new Date(), updated_at: new Date() },
          { id: 2, name: 'Cat 2', color: '#10B981', position: 1, created_by: 1, created_by_name: 'Test User', task_count: '1', created_at: new Date(), updated_at: new Date() }
        ]
      });

      await reorderCategories(req, res);

      // Verify workspace access was checked with the body workspace_id
      expect(verifyWorkspaceAccess).toHaveBeenCalledWith(1, bodyWorkspaceId);

      // Verify the transaction UPDATE calls use bodyWorkspaceId
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE categories SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND workspace_id = $3',
        [0, 1, bodyWorkspaceId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE categories SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND workspace_id = $3',
        [1, 2, bodyWorkspaceId]
      );

      // Verify fetch query uses bodyWorkspaceId
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.workspace_id = $1'),
        [bodyWorkspaceId]
      );

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Categories reordered successfully'
      }));
    });
  });

  // -----------------------------------------------------------------
  // Additional error-case tests for database failures
  // -----------------------------------------------------------------
  describe('getAllCategories - error handling', () => {
    it('should handle database errors', async () => {
      req.query = { workspace_id: workspaceId };
      query.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(getAllCategories(req, res)).rejects.toThrow('Connection refused');
    });
  });

  describe('getCategoryById - error handling', () => {
    it('should handle database errors', async () => {
      req.params = { id: '1' };
      query.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(getCategoryById(req, res)).rejects.toThrow('Connection refused');
    });
  });

  // -----------------------------------------------------------------
  // Additional tests targeting uncovered lines
  // -----------------------------------------------------------------

  describe('getAllCategories - cursor pagination (lines 46-48)', () => {
    it('should apply cursor-based pagination when cursor is provided', async () => {
      req.query = { workspace_id: workspaceId, cursor: '5' };
      query.mockResolvedValue({
        rows: [
          {
            id: 6, name: 'Category 6', color: '#3B82F6', position: 5,
            workspace_id: workspaceId, created_by: 1, created_by_name: 'Test User',
            task_count: '2', created_at: new Date(), updated_at: new Date()
          }
        ]
      });

      await getAllCategories(req, res);

      // Verify the query was called with cursor param (parsed as int)
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND c.id > $2'),
        [workspaceId, 5, expect.any(Number)]
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          categories: expect.arrayContaining([
            expect.objectContaining({ id: 6 })
          ]),
          hasMore: false,
          nextCursor: null
        })
      }));
    });
  });

  describe('getCategoryById - workspace access denied (line 111)', () => {
    it('should return 403 when user lacks access to the category workspace', async () => {
      req.params = { id: '1' };
      const mockCategory = {
        id: 1, name: 'Category 1', color: '#3B82F6', position: 0,
        workspace_id: workspaceId, created_by: 1, created_by_name: 'Test User',
        created_at: new Date(), updated_at: new Date()
      };
      query.mockResolvedValue({ rows: [mockCategory] });
      verifyWorkspaceAccess.mockResolvedValue(null);

      await getCategoryById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    });
  });

  describe('createCategory - workspace access denied (line 151)', () => {
    it('should return 403 when user lacks workspace access for creating category', async () => {
      req.body = { name: 'New Category', workspace_id: workspaceId };
      verifyWorkspaceAccess.mockResolvedValue(null);

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    });
  });

  describe('createCategory - name length validation (line 175)', () => {
    it('should return 400 when category name exceeds 100 characters', async () => {
      const longName = 'A'.repeat(101);
      req.body = { name: longName, workspace_id: workspaceId };

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Category name must be 100 characters or less'
      });
    });
  });

  describe('updateCategory - workspace access denied (line 260)', () => {
    it('should return 403 when user lacks workspace access for updating category', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Updated Name' };
      const existingCategory = {
        id: 1, name: 'Existing', color: '#3B82F6', position: 0, workspace_id: workspaceId
      };
      query.mockResolvedValue({ rows: [existingCategory] });
      verifyWorkspaceAccess.mockResolvedValue(null);

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    });
  });

  describe('updateCategory - viewer role denied (line 266)', () => {
    it('should return 403 when viewer tries to update category', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Updated Name' };
      const existingCategory = {
        id: 1, name: 'Existing', color: '#3B82F6', position: 0, workspace_id: workspaceId
      };
      query.mockResolvedValue({ rows: [existingCategory] });
      verifyWorkspaceAccess.mockResolvedValue({ role: 'viewer' });

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Viewers cannot edit categories. Contact an admin to request edit permissions.'
      });
    });
  });

  describe('updateCategory - name length validation (line 283)', () => {
    it('should return 400 when updated name exceeds 100 characters', async () => {
      req.params = { id: '1' };
      const longName = 'B'.repeat(101);
      req.body = { name: longName };
      const existingCategory = {
        id: 1, name: 'Existing', color: '#3B82F6', position: 0, workspace_id: workspaceId
      };
      query.mockResolvedValue({ rows: [existingCategory] });

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Category name must be 100 characters or less'
      });
    });
  });

  describe('updateCategory - position update (lines 324-326)', () => {
    it('should update position field when provided', async () => {
      req.params = { id: '1' };
      req.body = { position: 3 };
      const existingCategory = {
        id: 1, name: 'Existing', color: '#3B82F6', position: 0, workspace_id: workspaceId
      };
      query.mockResolvedValueOnce({ rows: [existingCategory] }); // Check exists
      query.mockResolvedValueOnce({ rows: [{
        ...existingCategory, position: 3, updated_at: new Date()
      }] }); // Update

      await updateCategory(req, res);

      // Verify the UPDATE query includes position
      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('position = $1'),
        [3, '1']
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Category updated successfully'
      }));
    });
  });

  describe('deleteCategory - workspace access denied (line 495)', () => {
    it('should return 403 when user lacks workspace access for deleting category', async () => {
      req.params = { id: '1' };
      const existingCategory = {
        id: 1, name: 'Category', color: '#3B82F6', position: 2, workspace_id: workspaceId
      };
      query.mockResolvedValue({ rows: [existingCategory] });
      verifyWorkspaceAccess.mockResolvedValue(null);

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    });
  });

  describe('deleteCategory - viewer role denied (line 501)', () => {
    it('should return 403 when viewer tries to delete category', async () => {
      req.params = { id: '1' };
      const existingCategory = {
        id: 1, name: 'Category', color: '#3B82F6', position: 2, workspace_id: workspaceId
      };
      query.mockResolvedValue({ rows: [existingCategory] });
      verifyWorkspaceAccess.mockResolvedValue({ role: 'viewer' });

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Viewers cannot delete categories. Contact an admin to request edit permissions.'
      });
    });
  });

  // -----------------------------------------------------------------
  // Branch coverage: hasMore pagination, null workspace_id paths
  // -----------------------------------------------------------------

  describe('getAllCategories - hasMore pagination (lines 61-62)', () => {
    it('should return hasMore=true and nextCursor when more results exist', async () => {
      req.query = { workspace_id: workspaceId, limit: '2' };
      // Return 3 rows (limit+1) to trigger hasMore
      const mockCategories = [
        {
          id: 1, name: 'Cat 1', color: '#3B82F6', position: 0,
          workspace_id: workspaceId, created_by: 1, created_by_name: 'Test User',
          task_count: '1', created_at: new Date(), updated_at: new Date()
        },
        {
          id: 2, name: 'Cat 2', color: '#10B981', position: 1,
          workspace_id: workspaceId, created_by: 1, created_by_name: 'Test User',
          task_count: '2', created_at: new Date(), updated_at: new Date()
        },
        {
          id: 3, name: 'Cat 3', color: '#EF4444', position: 2,
          workspace_id: workspaceId, created_by: 1, created_by_name: 'Test User',
          task_count: '0', created_at: new Date(), updated_at: new Date()
        }
      ];
      query.mockResolvedValue({ rows: mockCategories });

      await getAllCategories(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          categories: expect.arrayContaining([
            expect.objectContaining({ id: 1 }),
            expect.objectContaining({ id: 2 })
          ]),
          hasMore: true,
          nextCursor: 2
        })
      }));
      // Should only return 2 categories, not 3
      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData.categories).toHaveLength(2);
    });
  });

  describe('getCategoryById - null workspace_id (line 108 else branch)', () => {
    it('should return category without workspace access check when workspace_id is null', async () => {
      req.params = { id: '1' };
      const mockCategory = {
        id: 1, name: 'Legacy Category', color: '#3B82F6', position: 0,
        workspace_id: null, created_by: 1, created_by_name: 'Test User',
        created_at: new Date(), updated_at: new Date()
      };
      query.mockResolvedValue({ rows: [mockCategory] });

      await getCategoryById(req, res);

      expect(verifyWorkspaceAccess).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          category: expect.objectContaining({ id: 1, workspaceId: null })
        })
      }));
    });
  });

  describe('updateCategory - null workspace_id branches (lines 257, 291-294)', () => {
    it('should skip workspace access check and use simple name query when workspace_id is null', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Updated Name' };
      const categoryNoWorkspace = {
        id: 1, name: 'Existing', color: '#3B82F6', position: 0, workspace_id: null
      };
      query.mockResolvedValueOnce({ rows: [categoryNoWorkspace] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // No name conflict
      query.mockResolvedValueOnce({ rows: [{
        ...categoryNoWorkspace, name: 'Updated Name', updated_at: new Date()
      }] }); // Update

      await updateCategory(req, res);

      // Workspace access should not be checked
      expect(verifyWorkspaceAccess).not.toHaveBeenCalled();
      // Name conflict query should NOT include workspace_id
      expect(query).toHaveBeenNthCalledWith(2,
        'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
        ['Updated Name', '1']
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Category updated successfully'
      }));
    });
  });

  describe('deleteCategory - null workspace_id (line 492 else branch)', () => {
    it('should skip workspace access check when category has no workspace_id', async () => {
      req.params = { id: '1' };
      const categoryNoWorkspace = {
        id: 1, name: 'Category', color: '#3B82F6', position: 2, workspace_id: null
      };
      query.mockResolvedValueOnce({ rows: [categoryNoWorkspace] }); // Check exists
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] }); // No tasks
      query.mockResolvedValueOnce({ rows: [] }); // Delete
      query.mockResolvedValueOnce({ rows: [] }); // Reorder

      await deleteCategory(req, res);

      expect(verifyWorkspaceAccess).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Category deleted successfully'
      });
    });
  });

  describe('reorderCategories - no workspace context (lines 399, 445)', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);
    });

    it('should handle categories with no workspace_id (null targetWorkspaceId)', async () => {
      req.body = { categoryIds: [1, 2] };
      // Categories have no workspace_id
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, workspace_id: null },
          { id: 2, workspace_id: null }
        ]
      });
      // Fetch updated categories (no WHERE clause for workspace)
      query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Cat 1', color: '#3B82F6', position: 0, created_by: 1, created_by_name: 'Test User', task_count: '0', created_at: new Date(), updated_at: new Date() },
          { id: 2, name: 'Cat 2', color: '#10B981', position: 1, created_by: 1, created_by_name: 'Test User', task_count: '1', created_at: new Date(), updated_at: new Date() }
        ]
      });

      await reorderCategories(req, res);

      // Workspace access should not be checked when targetWorkspaceId is falsy
      expect(verifyWorkspaceAccess).not.toHaveBeenCalled();
      // Fetch query should not include WHERE clause for workspace
      expect(query).toHaveBeenNthCalledWith(2,
        expect.not.stringContaining('WHERE c.workspace_id'),
        []
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Categories reordered successfully'
      }));
    });
  });
});
