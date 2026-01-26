const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../categoryController');

// Mock dependencies
jest.mock('../../config/database');

const { query } = require('../../config/database');

describe('Category Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    req.user = { id: 1 };
    jest.clearAllMocks();
  });

  describe('getAllCategories', () => {
    it('should return all categories with task counts', async () => {
      const mockCategories = [
        {
          id: 1, name: 'Category 1', color: '#3B82F6', position: 0,
          created_by: 1, created_by_name: 'Test User', task_count: '5',
          created_at: new Date(), updated_at: new Date()
        },
        {
          id: 2, name: 'Category 2', color: '#10B981', position: 1,
          created_by: 1, created_by_name: 'Test User', task_count: '3',
          created_at: new Date(), updated_at: new Date()
        }
      ];
      query.mockResolvedValue({ rows: mockCategories });

      await getAllCategories(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          categories: [
            expect.objectContaining({ id: 1, name: 'Category 1', taskCount: 5 }),
            expect.objectContaining({ id: 2, name: 'Category 2', taskCount: 3 })
          ]
        }
      });
    });

    it('should return empty array when no categories', async () => {
      query.mockResolvedValue({ rows: [] });

      await getAllCategories(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { categories: [] }
      });
    });

    it('should handle database errors', async () => {
      query.mockRejectedValue(new Error('Database error'));

      await getAllCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error fetching categories',
        error: 'Database error'
      });
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
        created_by: 1, created_by_name: 'Test User',
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
    it('should return 400 if name is missing', async () => {
      req.body = {};

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Category name is required'
      });
    });

    it('should return 400 for invalid color format', async () => {
      req.body = { name: 'Test Category', color: 'invalid' };

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid color format. Must be hex color (e.g., #3B82F6)'
      });
    });

    it('should return 400 for invalid hex color (wrong length)', async () => {
      req.body = { name: 'Test Category', color: '#FFF' };

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid color format. Must be hex color (e.g., #3B82F6)'
      });
    });

    it('should return 400 if category name already exists', async () => {
      req.body = { name: 'Existing Category' };
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Existing category

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Category with this name already exists'
      });
    });

    it('should create category with default color', async () => {
      req.body = { name: 'New Category' };
      query.mockResolvedValueOnce({ rows: [] }); // No existing
      query.mockResolvedValueOnce({ rows: [{ next_position: 0 }] }); // Position
      query.mockResolvedValueOnce({ rows: [{
        id: 1, name: 'New Category', color: '#3B82F6', position: 0,
        created_by: 1, created_at: new Date(), updated_at: new Date()
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
      req.body = { name: 'New Category', color: '#FF5733' };
      query.mockResolvedValueOnce({ rows: [] }); // No existing
      query.mockResolvedValueOnce({ rows: [{ next_position: 2 }] }); // Position
      query.mockResolvedValueOnce({ rows: [{
        id: 1, name: 'New Category', color: '#FF5733', position: 2,
        created_by: 1, created_at: new Date(), updated_at: new Date()
      }] }); // Insert

      await createCategory(req, res);

      expect(query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('INSERT INTO categories'),
        ['New Category', '#FF5733', 2, 1]
      );
    });

    it('should assign correct position', async () => {
      req.body = { name: 'New Category' };
      query.mockResolvedValueOnce({ rows: [] }); // No existing
      query.mockResolvedValueOnce({ rows: [{ next_position: 5 }] }); // Position
      query.mockResolvedValueOnce({ rows: [{
        id: 1, name: 'New Category', color: '#3B82F6', position: 5,
        created_by: 1, created_at: new Date(), updated_at: new Date()
      }] }); // Insert

      await createCategory(req, res);

      expect(query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('INSERT INTO categories'),
        expect.arrayContaining([5])
      );
    });
  });

  describe('updateCategory', () => {
    const existingCategory = {
      id: 1, name: 'Existing', color: '#3B82F6', position: 0
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

      expect(query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('name = $1'),
        ['Updated Name', '1']
      );
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

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('color = $1'),
        ['#10B981', '1']
      );
    });

    it('should update position', async () => {
      req.params = { id: '1' };
      req.body = { position: 5 };
      query.mockResolvedValueOnce({ rows: [existingCategory] }); // Check exists
      query.mockResolvedValueOnce({ rows: [{
        ...existingCategory, position: 5, updated_at: new Date()
      }] }); // Update

      await updateCategory(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('position = $1'),
        [5, '1']
      );
    });
  });

  describe('deleteCategory', () => {
    const existingCategory = {
      id: 1, name: 'Category', color: '#3B82F6', position: 2
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
        [2]
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Category deleted successfully'
      });
    });
  });
});
