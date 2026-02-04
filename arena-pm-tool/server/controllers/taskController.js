// Task Controller
// Handles all task-related operations

const { query } = require('../config/database');
const { sendTaskAssignmentNotification } = require('../utils/emailService');
const { verifyWorkspaceAccess, canUserEdit } = require('../middleware/workspaceAuth');

// Helper: sanitize error for response (hide internals in production)
const safeError = (error) => process.env.NODE_ENV === 'production' ? undefined : error.message;

// Helper function to format date for client - just return YYYY-MM-DD string
const formatDueDateForClient = (dbDate) => {
  if (!dbDate) return null;
  // Return as simple YYYY-MM-DD string
  if (typeof dbDate === 'string') {
    return dbDate.split('T')[0];
  }
  const d = new Date(dbDate);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get all tasks with filters
const getAllTasks = async (req, res) => {
  try {
    const {
      category_id,
      assignee_ids, // Changed from assignee_id to support multiple
      status,
      priority,
      search,
      workspace_id
    } = req.query;

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

    // Build dynamic query with JSON aggregation for assignees
    let queryText = `
      SELECT
        t.id, t.title, t.description, t.category_id,
        t.priority, t.status, t.due_date, t.completed_at, t.position,
        t.parent_task_id, t.workspace_id,
        t.created_by, t.created_at, t.updated_at,
        c.name as category_name, c.color as category_color,
        creator.name as created_by_name,
        (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id AND status = 'completed') as completed_subtask_count,
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
           FROM task_assignments ta
           JOIN users u ON ta.user_id = u.id
           WHERE ta.task_id = t.id),
          '[]'::json
        ) as assignees
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // Filter by workspace_id (required for multi-workspace support)
    if (workspace_id) {
      queryText += ` AND t.workspace_id = $${paramCount}`;
      params.push(workspace_id);
      paramCount++;
    }

    // Add filters
    if (category_id) {
      queryText += ` AND t.category_id = $${paramCount}`;
      params.push(category_id);
      paramCount++;
    }

    // Filter by multiple assignees (OR logic - matches any of the selected assignees)
    if (assignee_ids) {
      const assigneeArray = Array.isArray(assignee_ids)
        ? assignee_ids.map(id => parseInt(id))
        : assignee_ids.split(',').map(id => parseInt(id.trim()));

      queryText += ` AND EXISTS (
        SELECT 1 FROM task_assignments ta
        WHERE ta.task_id = t.id AND ta.user_id = ANY($${paramCount}::int[])
      )`;
      params.push(assigneeArray);
      paramCount++;
    }

    if (status) {
      queryText += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (priority) {
      queryText += ` AND t.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (search) {
      queryText += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Order by category position, then task position
    queryText += ' ORDER BY c.position ASC, t.position ASC';

    const result = await query(queryText, params);

    res.json({
      status: 'success',
      data: {
        tasks: result.rows.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          categoryId: task.category_id,
          categoryName: task.category_name,
          categoryColor: task.category_color,
          assignees: task.assignees || [],
          priority: task.priority,
          status: task.status,
          dueDate: formatDueDateForClient(task.due_date),
          completedAt: task.completed_at,
          position: task.position,
          parentTaskId: task.parent_task_id,
          workspaceId: task.workspace_id,
          subtaskCount: parseInt(task.subtask_count || 0),
          completedSubtaskCount: parseInt(task.completed_subtask_count || 0),
          createdBy: task.created_by,
          createdByName: task.created_by_name,
          createdAt: task.created_at,
          updatedAt: task.updated_at
        })),
        count: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching tasks',
      error: safeError(error)
    });
  }
};

// Get single task by ID (AUTHZ-02: workspace authorization added)
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        t.id, t.title, t.description, t.category_id,
        t.priority, t.status, t.due_date, t.completed_at, t.position,
        t.parent_task_id, t.workspace_id,
        t.created_by, t.created_at, t.updated_at,
        c.name as category_name, c.color as category_color,
        creator.name as created_by_name,
        (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id AND status = 'completed') as completed_subtask_count,
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
           FROM task_assignments ta
           JOIN users u ON ta.user_id = u.id
           WHERE ta.task_id = t.id),
          '[]'::json
        ) as assignees
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    const task = result.rows[0];

    // Verify user has access to this task's workspace
    if (task.workspace_id) {
      const membership = await verifyWorkspaceAccess(req.user.id, task.workspace_id);
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
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          categoryId: task.category_id,
          categoryName: task.category_name,
          categoryColor: task.category_color,
          assignees: task.assignees || [],
          priority: task.priority,
          status: task.status,
          dueDate: formatDueDateForClient(task.due_date),
          completedAt: task.completed_at,
          position: task.position,
          parentTaskId: task.parent_task_id,
          workspaceId: task.workspace_id,
          subtaskCount: parseInt(task.subtask_count || 0),
          completedSubtaskCount: parseInt(task.completed_subtask_count || 0),
          createdBy: task.created_by,
          createdByName: task.created_by_name,
          createdAt: task.created_at,
          updatedAt: task.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching task',
      error: safeError(error)
    });
  }
};

// Create new task (INJ-05: input length validation added)
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      category_id,
      assignee_ids = [],
      priority = 'medium',
      status = 'todo',
      due_date,
      parent_task_id,
      workspace_id
    } = req.body;

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
        message: 'Viewers cannot create tasks. Contact an admin to request edit permissions.'
      });
    }

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        status: 'error',
        message: 'Task title is required'
      });
    }

    // Validate input lengths (INJ-05)
    if (title.length > 500) {
      return res.status(400).json({
        status: 'error',
        message: 'Task title must be 500 characters or less'
      });
    }

    if (description && description.length > 10000) {
      return res.status(400).json({
        status: 'error',
        message: 'Task description must be 10,000 characters or less'
      });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid priority. Must be: low, medium, high, or urgent'
      });
    }

    // Validate status
    const validStatuses = ['todo', 'in_progress', 'completed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status. Must be: todo, in_progress, or completed'
      });
    }

    // Get the next position for this category
    let position = 0;
    if (category_id) {
      const posResult = await query(
        'SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM tasks WHERE category_id = $1',
        [category_id]
      );
      position = posResult.rows[0].next_position;
    }

    // Set completed_at if status is completed
    const completed_at = status === 'completed' ? new Date() : null;

    // Just use the date string directly (YYYY-MM-DD format)
    let processedDueDate = null;
    if (due_date) {
      processedDueDate = due_date.split('T')[0];
    }

    const result = await query(`
      INSERT INTO tasks (
        title, description, category_id,
        priority, status, due_date, completed_at, position, parent_task_id, created_by, workspace_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      title,
      description || null,
      category_id || null,
      priority,
      status,
      processedDueDate,
      completed_at,
      position,
      parent_task_id || null,
      req.user.id,
      workspace_id || null
    ]);

    const newTaskId = result.rows[0].id;

    // Insert assignees into task_assignments table
    const assigneeArray = Array.isArray(assignee_ids) ? assignee_ids : [];
    if (assigneeArray.length > 0) {
      const assigneeValues = assigneeArray.map((_, idx) => `($1, $${idx + 2})`).join(', ');
      await query(
        `INSERT INTO task_assignments (task_id, user_id) VALUES ${assigneeValues}`,
        [newTaskId, ...assigneeArray]
      );
    }

    // Fetch the complete task with joined data
    const fullTaskResult = await query(`
      SELECT
        t.id, t.title, t.description, t.category_id,
        t.priority, t.status, t.due_date, t.completed_at, t.position,
        t.parent_task_id, t.workspace_id,
        t.created_by, t.created_at, t.updated_at,
        c.name as category_name, c.color as category_color,
        creator.name as created_by_name,
        (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id AND status = 'completed') as completed_subtask_count,
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
           FROM task_assignments ta
           JOIN users u ON ta.user_id = u.id
           WHERE ta.task_id = t.id),
          '[]'::json
        ) as assignees
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = $1
    `, [newTaskId]);

    const newTask = fullTaskResult.rows[0];

    // Send email notifications to assignees (async, don't block response)
    if (assigneeArray.length > 0 && newTask.assignees && newTask.assignees.length > 0) {
      const assigneesWithPrefs = await query(`
        SELECT u.id, u.email, u.name, u.email_notifications_enabled
        FROM users u
        WHERE u.id = ANY($1::int[])
      `, [assigneeArray]);

      assigneesWithPrefs.rows.forEach(assignee => {
        if (assignee.email_notifications_enabled !== false) {
          sendTaskAssignmentNotification({
            to: assignee.email,
            userName: assignee.name,
            taskId: newTask.id,
            taskTitle: newTask.title,
            taskDescription: newTask.description,
            assignedByName: newTask.created_by_name,
            dueDate: newTask.due_date,
            priority: newTask.priority
          }).catch(err => {
            console.error(`Failed to send assignment notification to ${assignee.email}:`, err.message);
          });
        }
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Task created successfully',
      data: {
        task: {
          id: newTask.id,
          title: newTask.title,
          description: newTask.description,
          categoryId: newTask.category_id,
          categoryName: newTask.category_name,
          categoryColor: newTask.category_color,
          assignees: newTask.assignees || [],
          priority: newTask.priority,
          status: newTask.status,
          dueDate: formatDueDateForClient(newTask.due_date),
          completedAt: newTask.completed_at,
          position: newTask.position,
          parentTaskId: newTask.parent_task_id,
          workspaceId: newTask.workspace_id,
          subtaskCount: parseInt(newTask.subtask_count || 0),
          completedSubtaskCount: parseInt(newTask.completed_subtask_count || 0),
          createdBy: newTask.created_by,
          createdByName: newTask.created_by_name,
          createdAt: newTask.created_at,
          updatedAt: newTask.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating task',
      error: safeError(error)
    });
  }
};

// Update task (INJ-05: input length validation added)
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category_id,
      assignee_ids,
      priority,
      status,
      due_date
    } = req.body;

    // Check if task exists
    const checkResult = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    const currentTask = checkResult.rows[0];

    // Verify user has write access to task's workspace
    if (currentTask.workspace_id) {
      const membership = await verifyWorkspaceAccess(req.user.id, currentTask.workspace_id);
      if (!membership) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have access to this workspace'
        });
      }
      if (membership.role === 'viewer') {
        return res.status(403).json({
          status: 'error',
          message: 'Viewers cannot edit tasks. Contact an admin to request edit permissions.'
        });
      }
    }

    // Validate input lengths (INJ-05)
    if (title !== undefined && title && title.length > 500) {
      return res.status(400).json({
        status: 'error',
        message: 'Task title must be 500 characters or less'
      });
    }

    if (description !== undefined && description && description.length > 10000) {
      return res.status(400).json({
        status: 'error',
        message: 'Task description must be 10,000 characters or less'
      });
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid priority. Must be: low, medium, high, or urgent'
        });
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['todo', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid status. Must be: todo, in_progress, or completed'
        });
      }
    }

    // Handle completed_at timestamp
    let completed_at = currentTask.completed_at;
    if (status === 'completed' && currentTask.status !== 'completed') {
      completed_at = new Date();
    } else if (status && status !== 'completed') {
      completed_at = null;
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (category_id !== undefined) {
      updates.push(`category_id = $${paramCount}`);
      values.push(category_id);
      paramCount++;
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
      updates.push(`completed_at = $${paramCount}`);
      values.push(completed_at);
      paramCount++;
    }
    if (due_date !== undefined) {
      const processedDueDate = due_date ? due_date.split('T')[0] : null;
      updates.push(`due_date = $${paramCount}`);
      values.push(processedDueDate);
      paramCount++;
    }

    // Update task fields if any
    if (updates.length > 0) {
      values.push(id);
      await query(`
        UPDATE tasks
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
      `, values);
    }

    // Handle assignee updates via task_assignments table
    let newlyAddedAssigneeIds = [];
    if (assignee_ids !== undefined) {
      const currentAssigneesResult = await query(
        'SELECT user_id FROM task_assignments WHERE task_id = $1',
        [id]
      );
      const currentAssigneeIds = currentAssigneesResult.rows.map(row => row.user_id);

      await query('DELETE FROM task_assignments WHERE task_id = $1', [id]);

      const assigneeArray = Array.isArray(assignee_ids) ? assignee_ids : [];
      if (assigneeArray.length > 0) {
        const assigneeValues = assigneeArray.map((_, idx) => `($1, $${idx + 2})`).join(', ');
        await query(
          `INSERT INTO task_assignments (task_id, user_id) VALUES ${assigneeValues}`,
          [id, ...assigneeArray]
        );

        newlyAddedAssigneeIds = assigneeArray.filter(
          newId => !currentAssigneeIds.includes(newId)
        );
      }
    }

    if (updates.length === 0 && assignee_ids === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'No fields to update'
      });
    }

    // Fetch the updated task with all joined data
    const fullTaskResult = await query(`
      SELECT
        t.id, t.title, t.description, t.category_id,
        t.priority, t.status, t.due_date, t.completed_at, t.position,
        t.parent_task_id,
        t.created_by, t.created_at, t.updated_at,
        c.name as category_name, c.color as category_color,
        creator.name as created_by_name,
        (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id AND status = 'completed') as completed_subtask_count,
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
           FROM task_assignments ta
           JOIN users u ON ta.user_id = u.id
           WHERE ta.task_id = t.id),
          '[]'::json
        ) as assignees
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = $1
    `, [id]);

    const updatedTask = fullTaskResult.rows[0];

    // Send email notifications to newly added assignees
    if (newlyAddedAssigneeIds.length > 0) {
      const updaterResult = await query('SELECT name FROM users WHERE id = $1', [req.user.id]);
      const updaterName = updaterResult.rows[0]?.name || 'A team member';

      const newAssigneesWithPrefs = await query(`
        SELECT u.id, u.email, u.name, u.email_notifications_enabled
        FROM users u
        WHERE u.id = ANY($1::int[])
      `, [newlyAddedAssigneeIds]);

      newAssigneesWithPrefs.rows.forEach(assignee => {
        if (assignee.email_notifications_enabled !== false) {
          sendTaskAssignmentNotification({
            to: assignee.email,
            userName: assignee.name,
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            taskDescription: updatedTask.description,
            assignedByName: updaterName,
            dueDate: updatedTask.due_date,
            priority: updatedTask.priority
          }).catch(err => {
            console.error(`Failed to send assignment notification to ${assignee.email}:`, err.message);
          });
        }
      });
    }

    res.json({
      status: 'success',
      message: 'Task updated successfully',
      data: {
        task: {
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          categoryId: updatedTask.category_id,
          categoryName: updatedTask.category_name,
          categoryColor: updatedTask.category_color,
          assignees: updatedTask.assignees || [],
          priority: updatedTask.priority,
          status: updatedTask.status,
          dueDate: formatDueDateForClient(updatedTask.due_date),
          completedAt: updatedTask.completed_at,
          position: updatedTask.position,
          parentTaskId: updatedTask.parent_task_id,
          subtaskCount: parseInt(updatedTask.subtask_count || 0),
          completedSubtaskCount: parseInt(updatedTask.completed_subtask_count || 0),
          createdBy: updatedTask.created_by,
          createdByName: updatedTask.created_by_name,
          createdAt: updatedTask.created_at,
          updatedAt: updatedTask.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating task',
      error: safeError(error)
    });
  }
};

// Update task position (for drag & drop)
const updateTaskPosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, position } = req.body;

    if (position === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Position is required'
      });
    }

    // Check if task exists
    const checkResult = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    const currentTask = checkResult.rows[0];
    const oldCategoryId = currentTask.category_id;
    const newCategoryId = category_id !== undefined ? category_id : oldCategoryId;

    // Update the task's category and position
    await query(`
      UPDATE tasks
      SET category_id = $1, position = $2
      WHERE id = $3
    `, [newCategoryId, position, id]);

    // Reorder other tasks in the new category
    await query(`
      UPDATE tasks
      SET position = position + 1
      WHERE category_id = $1
        AND id != $2
        AND position >= $3
    `, [newCategoryId, id, position]);

    // If category changed, reorder old category
    if (oldCategoryId !== newCategoryId && oldCategoryId !== null) {
      await query(`
        UPDATE tasks
        SET position = position - 1
        WHERE category_id = $1
          AND position > $2
      `, [oldCategoryId, currentTask.position]);
    }

    // Get updated task
    const result = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    const updatedTask = result.rows[0];

    res.json({
      status: 'success',
      message: 'Task position updated successfully',
      data: {
        task: {
          id: updatedTask.id,
          title: updatedTask.title,
          categoryId: updatedTask.category_id,
          position: updatedTask.position
        }
      }
    });
  } catch (error) {
    console.error('Update task position error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating task position',
      error: safeError(error)
    });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if task exists
    const checkResult = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found'
      });
    }

    const task = checkResult.rows[0];

    // Verify user has write access to task's workspace
    if (task.workspace_id) {
      const membership = await verifyWorkspaceAccess(req.user.id, task.workspace_id);
      if (!membership) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have access to this workspace'
        });
      }
      if (membership.role === 'viewer') {
        return res.status(403).json({
          status: 'error',
          message: 'Viewers cannot delete tasks. Contact an admin to request edit permissions.'
        });
      }
    }

    // Delete the task
    await query('DELETE FROM tasks WHERE id = $1', [id]);

    // Reorder remaining tasks in the category
    if (task.category_id) {
      await query(`
        UPDATE tasks
        SET position = position - 1
        WHERE category_id = $1 AND position > $2
      `, [task.category_id, task.position]);
    }

    res.json({
      status: 'success',
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting task',
      error: safeError(error)
    });
  }
};

// Get subtasks for a specific task (AUTHZ-03: workspace authorization added)
const getSubtasks = async (req, res) => {
  try {
    const { id } = req.params;

    // First verify the parent task exists and check workspace access
    const parentTask = await query('SELECT workspace_id FROM tasks WHERE id = $1', [id]);
    if (parentTask.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Parent task not found'
      });
    }

    // Verify user has access to the parent task's workspace
    if (parentTask.rows[0].workspace_id) {
      const membership = await verifyWorkspaceAccess(req.user.id, parentTask.rows[0].workspace_id);
      if (!membership) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have access to this workspace'
        });
      }
    }

    const result = await query(`
      SELECT
        t.id, t.title, t.description, t.category_id,
        t.priority, t.status, t.due_date, t.completed_at, t.position,
        t.parent_task_id,
        t.created_by, t.created_at, t.updated_at,
        c.name as category_name, c.color as category_color,
        creator.name as created_by_name,
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email))
           FROM task_assignments ta
           JOIN users u ON ta.user_id = u.id
           WHERE ta.task_id = t.id),
          '[]'::json
        ) as assignees
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.parent_task_id = $1
      ORDER BY t.position ASC
    `, [id]);

    res.json({
      status: 'success',
      data: {
        subtasks: result.rows.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          categoryId: task.category_id,
          categoryName: task.category_name,
          categoryColor: task.category_color,
          assignees: task.assignees || [],
          priority: task.priority,
          status: task.status,
          dueDate: formatDueDateForClient(task.due_date),
          completedAt: task.completed_at,
          position: task.position,
          parentTaskId: task.parent_task_id,
          createdBy: task.created_by,
          createdByName: task.created_by_name,
          createdAt: task.created_at,
          updatedAt: task.updated_at
        })),
        count: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get subtasks error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching subtasks',
      error: safeError(error)
    });
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskPosition,
  deleteTask,
  getSubtasks
};
