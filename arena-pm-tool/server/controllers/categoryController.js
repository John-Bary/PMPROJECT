// Category Controller
// Handles all category-related operations

const { query, getClient } = require('../config/database');
const { verifyWorkspaceAccess } = require('../middleware/workspaceAuth');

// Helper: sanitize error for response (hide internals in production)
const safeError = (error) => process.env.NODE_ENV === 'production' ? undefined : error.message;

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const { workspace_id, cursor, limit: limitParam } = req.query;

    // Pagination defaults
    const limit = Math.min(Math.max(parseInt(limitParam) || 50, 1), 200);

    // Require workspace_id
    if (!workspace_id) {
      return res.status(400).json({
        status: 'error',
        message: 'workspace_id is required'
      });
    }

    // Verify user has access to this workspace
    const membership = await verifyWorkspaceAccess(req.user.id, workspace_id);
    if (!membership) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    }

    const params = [workspace_id];
    let paramCount = 2;

    let queryText = `
      SELECT
        c.id, c.name, c.color, c.position, c.created_by, c.created_at, c.updated_at, c.workspace_id,
        u.name as created_by_name,
        COUNT(t.id) as task_count
      FROM categories c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN tasks t ON c.id = t.category_id
      WHERE c.workspace_id = $1
    `;

    if (cursor) {
      queryText += ` AND c.id > $${paramCount}`;
      params.push(parseInt(cursor));
      paramCount++;
    }

    queryText += `
      GROUP BY c.id, u.name
      ORDER BY c.position ASC, c.id ASC
      LIMIT $${paramCount}
    `;
    params.push(limit + 1);

    const result = await query(queryText, params);

    const hasMore = result.rows.length > limit;
    const categories = hasMore ? result.rows.slice(0, limit) : result.rows;
    const nextCursor = hasMore ? categories[categories.length - 1].id : null;

    res.json({
      status: 'success',
      data: {
        categories: categories.map(cat => ({
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
        })),
        nextCursor,
        hasMore,
      }
    });
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching categories',
      error: safeError(error)
    });
  }
};

// Get single category by ID (AUTHZ-01: workspace authorization added)
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        c.id, c.name, c.color, c.position, c.created_by, c.created_at, c.updated_at, c.workspace_id,
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

    // Verify user has access to this category's workspace
    if (cat.workspace_id) {
      const membership = await verifyWorkspaceAccess(req.user.id, cat.workspace_id);
      if (!membership) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have access to this workspace'
        });
      }
    }

    res.json({
      status: 'success',
      data: {
        category: {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          position: cat.position,
          workspaceId: cat.workspace_id,
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
      error: safeError(error)
    });
  }
};

// Create new category
const createCategory = async (req, res) => {
  try {
    const { name, color = '#3B82F6', workspace_id } = req.body;

    // Require workspace_id
    if (!workspace_id) {
      return res.status(400).json({
        status: 'error',
        message: 'workspace_id is required'
      });
    }

    // Verify user has write access to this workspace
    const membership = await verifyWorkspaceAccess(req.user.id, workspace_id);
    if (!membership) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    }

    // Check if user is a viewer (read-only)
    if (membership.role === 'viewer') {
      return res.status(403).json({
        status: 'error',
        message: 'Viewers cannot create categories. Contact an admin to request edit permissions.'
      });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Category name is required'
      });
    }

    // Validate name length (INJ-05)
    if (name.length > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Category name must be 100 characters or less'
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
    const existingCategoryQuery = 'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND workspace_id = $2';
    const existingCategoryParams = [name, workspace_id];

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
      error: safeError(error)
    });
  }
};

// Update category (AUTHZ-07: name collision check now workspace-scoped)
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

    const category = checkResult.rows[0];

    // Verify user has write access to category's workspace
    if (category.workspace_id) {
      const membership = await verifyWorkspaceAccess(req.user.id, category.workspace_id);
      if (!membership) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have access to this workspace'
        });
      }
      if (membership.role === 'viewer') {
        return res.status(403).json({
          status: 'error',
          message: 'Viewers cannot edit categories. Contact an admin to request edit permissions.'
        });
      }
    }

    // Validate color format if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid color format. Must be hex color (e.g., #3B82F6)'
      });
    }

    // Validate name length (INJ-05)
    if (name && name.length > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Category name must be 100 characters or less'
      });
    }

    // Check if new name conflicts with existing category (AUTHZ-07: workspace-scoped)
    if (name) {
      const nameCheckQuery = category.workspace_id
        ? 'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2 AND workspace_id = $3'
        : 'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2';
      const nameCheckParams = category.workspace_id
        ? [name, id, category.workspace_id]
        : [name, id];

      const existingCategory = await query(nameCheckQuery, nameCheckParams);

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
      error: safeError(error)
    });
  }
};

// Reorder categories (AUTHZ-06: workspace verification added)
const reorderCategories = async (req, res) => {
  try {
    const { categoryIds, workspace_id } = req.body;

    // Validate input
    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'categoryIds array is required'
      });
    }

    // Verify all category IDs exist and belong to the same workspace
    const existingCategories = await query(
      'SELECT id, workspace_id FROM categories WHERE id = ANY($1)',
      [categoryIds]
    );

    if (existingCategories.rows.length !== categoryIds.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Some category IDs are invalid'
      });
    }

    // Verify all categories belong to the same workspace
    const workspaceIds = [...new Set(existingCategories.rows.map(c => c.workspace_id).filter(Boolean))];
    if (workspaceIds.length > 1) {
      return res.status(400).json({
        status: 'error',
        message: 'All categories must belong to the same workspace'
      });
    }

    // Verify user has access to the workspace
    const targetWorkspaceId = workspace_id || workspaceIds[0];
    if (targetWorkspaceId) {
      const membership = await verifyWorkspaceAccess(req.user.id, targetWorkspaceId);
      if (!membership) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have access to this workspace'
        });
      }
      if (membership.role === 'viewer') {
        return res.status(403).json({
          status: 'error',
          message: 'Viewers cannot reorder categories'
        });
      }
    }

    // Update positions for each category in a transaction
    const client = await getClient();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < categoryIds.length; i++) {
        await client.query(
          'UPDATE categories SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [i, categoryIds[i]]
        );
      }
      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    // Fetch and return updated categories (scoped to workspace)
    let fetchQuery = `
      SELECT
        c.id, c.name, c.color, c.position, c.created_by, c.created_at, c.updated_at,
        u.name as created_by_name,
        COUNT(t.id) as task_count
      FROM categories c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN tasks t ON c.id = t.category_id
    `;
    const fetchParams = [];

    if (targetWorkspaceId) {
      fetchQuery += ' WHERE c.workspace_id = $1';
      fetchParams.push(targetWorkspaceId);
    }

    fetchQuery += `
      GROUP BY c.id, u.name
      ORDER BY c.position ASC
    `;

    const result = await query(fetchQuery, fetchParams);

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
      error: safeError(error)
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

    // Verify user has write access to category's workspace
    if (category.workspace_id) {
      const membership = await verifyWorkspaceAccess(req.user.id, category.workspace_id);
      if (!membership) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have access to this workspace'
        });
      }
      if (membership.role === 'viewer') {
        return res.status(403).json({
          status: 'error',
          message: 'Viewers cannot delete categories. Contact an admin to request edit permissions.'
        });
      }
    }

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

    // Reorder remaining categories (scoped to workspace)
    await query(`
      UPDATE categories
      SET position = position - 1
      WHERE position > $1 AND workspace_id = $2
    `, [category.position, category.workspace_id]);

    res.json({
      status: 'success',
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting category',
      error: safeError(error)
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
