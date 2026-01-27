// Category Controller
// Handles all category-related operations

const { query } = require('../config/database');

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const { workspace_id } = req.query;

    let queryText = `
      SELECT
        c.id, c.name, c.color, c.position, c.created_by, c.created_at, c.updated_at, c.workspace_id,
        u.name as created_by_name,
        COUNT(t.id) as task_count
      FROM categories c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN tasks t ON c.id = t.category_id
    `;

    const params = [];

    // Filter by workspace_id if provided
    if (workspace_id) {
      queryText += ` WHERE c.workspace_id = $1`;
      params.push(workspace_id);
    }

    queryText += `
      GROUP BY c.id, u.name
      ORDER BY c.position ASC
    `;

    const result = await query(queryText, params);

    res.json({
      status: 'success',
      data: {
        categories: result.rows.map(cat => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          position: cat.position,
          workspaceId: cat.workspace_id,
          taskCount: parseInt(cat.task_count),
          createdBy: cat.created_by,
          createdByName: cat.created_by_name,
          createdAt: cat.created_at,
          updatedAt: cat.updated_at
        }))
      }
    });
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        c.id, c.name, c.color, c.position, c.created_by, c.created_at, c.updated_at,
        u.name as created_by_name
      FROM categories c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    const cat = result.rows[0];

    res.json({
      status: 'success',
      data: {
        category: {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          position: cat.position,
          createdBy: cat.created_by,
          createdByName: cat.created_by_name,
          createdAt: cat.created_at,
          updatedAt: cat.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching category',
      error: error.message
    });
  }
};

// Create new category
const createCategory = async (req, res) => {
  try {
    const { name, color = '#3B82F6', workspace_id } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Category name is required'
      });
    }

    // Validate color format (hex color)
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid color format. Must be hex color (e.g., #3B82F6)'
      });
    }

    // Check if category name already exists within the same workspace
    let existingCategoryQuery = 'SELECT id FROM categories WHERE LOWER(name) = LOWER($1)';
    const existingCategoryParams = [name];

    if (workspace_id) {
      existingCategoryQuery += ' AND workspace_id = $2';
      existingCategoryParams.push(workspace_id);
    }

    const existingCategory = await query(existingCategoryQuery, existingCategoryParams);

    if (existingCategory.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Category with this name already exists'
      });
    }

    // Get the next position (within workspace if specified)
    let posQuery = 'SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM categories';
    const posParams = [];

    if (workspace_id) {
      posQuery += ' WHERE workspace_id = $1';
      posParams.push(workspace_id);
    }

    const posResult = await query(posQuery, posParams);
    const position = posResult.rows[0].next_position;

    const result = await query(`
      INSERT INTO categories (name, color, position, created_by, workspace_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, color, position, req.user.id, workspace_id || null]);

    const newCategory = result.rows[0];

    res.status(201).json({
      status: 'success',
      message: 'Category created successfully',
      data: {
        category: {
          id: newCategory.id,
          name: newCategory.name,
          color: newCategory.color,
          position: newCategory.position,
          workspaceId: newCategory.workspace_id,
          createdBy: newCategory.created_by,
          createdAt: newCategory.created_at,
          updatedAt: newCategory.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating category',
      error: error.message
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, position } = req.body;

    // Check if category exists
    const checkResult = await query('SELECT * FROM categories WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    // Validate color format if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid color format. Must be hex color (e.g., #3B82F6)'
      });
    }

    // Check if new name conflicts with existing category
    if (name) {
      const existingCategory = await query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name, id]
      );

      if (existingCategory.rows.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Category with this name already exists'
        });
      }
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (color !== undefined) {
      updates.push(`color = $${paramCount}`);
      values.push(color);
      paramCount++;
    }
    if (position !== undefined) {
      updates.push(`position = $${paramCount}`);
      values.push(position);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No fields to update'
      });
    }

    values.push(id);
    const result = await query(`
      UPDATE categories
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    const updatedCategory = result.rows[0];

    res.json({
      status: 'success',
      message: 'Category updated successfully',
      data: {
        category: {
          id: updatedCategory.id,
          name: updatedCategory.name,
          color: updatedCategory.color,
          position: updatedCategory.position,
          createdBy: updatedCategory.created_by,
          createdAt: updatedCategory.created_at,
          updatedAt: updatedCategory.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating category',
      error: error.message
    });
  }
};

// Reorder categories
const reorderCategories = async (req, res) => {
  try {
    const { categoryIds } = req.body;

    // Validate input
    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'categoryIds array is required'
      });
    }

    // Verify all category IDs exist
    const existingCategories = await query(
      'SELECT id FROM categories WHERE id = ANY($1)',
      [categoryIds]
    );

    if (existingCategories.rows.length !== categoryIds.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Some category IDs are invalid'
      });
    }

    // Update positions for each category in a transaction
    // Using a simple loop since pg doesn't support native transactions without a pool
    for (let i = 0; i < categoryIds.length; i++) {
      await query(
        'UPDATE categories SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [i, categoryIds[i]]
      );
    }

    // Fetch and return updated categories
    const result = await query(`
      SELECT
        c.id, c.name, c.color, c.position, c.created_by, c.created_at, c.updated_at,
        u.name as created_by_name,
        COUNT(t.id) as task_count
      FROM categories c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN tasks t ON c.id = t.category_id
      GROUP BY c.id, u.name
      ORDER BY c.position ASC
    `);

    res.json({
      status: 'success',
      message: 'Categories reordered successfully',
      data: {
        categories: result.rows.map(cat => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          position: cat.position,
          taskCount: parseInt(cat.task_count),
          createdBy: cat.created_by,
          createdByName: cat.created_by_name,
          createdAt: cat.created_at,
          updatedAt: cat.updated_at
        }))
      }
    });
  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error reordering categories',
      error: error.message
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const checkResult = await query('SELECT * FROM categories WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    const category = checkResult.rows[0];

    // Check if category has tasks
    const tasksResult = await query(
      'SELECT COUNT(*) as count FROM tasks WHERE category_id = $1',
      [id]
    );

    const taskCount = parseInt(tasksResult.rows[0].count);

    if (taskCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete category with ${taskCount} task(s). Please move or delete the tasks first.`
      });
    }

    // Delete the category
    await query('DELETE FROM categories WHERE id = $1', [id]);

    // Reorder remaining categories
    await query(`
      UPDATE categories
      SET position = position - 1
      WHERE position > $1
    `, [category.position]);

    res.json({
      status: 'success',
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting category',
      error: error.message
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
};
