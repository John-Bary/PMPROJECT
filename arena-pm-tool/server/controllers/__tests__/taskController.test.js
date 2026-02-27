const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskPosition,
  deleteTask,
  getSubtasks
} = require('../taskController');

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../middleware/workspaceAuth', () => ({
  verifyWorkspaceAccess: jest.fn(),
  canUserEdit: jest.fn(),
}));
jest.mock('../../utils/emailQueue', () => ({
  queueTaskAssignmentNotification: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../lib/activityLog', () => ({
  logActivity: jest.fn(),
}));
jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { query, getClient } = require('../../config/database');
const { verifyWorkspaceAccess } = require('../../middleware/workspaceAuth');
const { logActivity } = require('../../lib/activityLog');

describe('Task Controller', () => {
  let req, res;
  let mockClient;

  const WORKSPACE_ID = 'ws-uuid-123';

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    req.user = { id: 1 };
    jest.clearAllMocks();

    verifyWorkspaceAccess.mockResolvedValue({ role: 'member' });

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    getClient.mockResolvedValue(mockClient);
  });

  // ---------------------------------------------------------------
  // getAllTasks
  // ---------------------------------------------------------------
  describe('getAllTasks', () => {
    const mockTask = {
      id: 1,
      title: 'Test Task',
      description: 'Description',
      category_id: 1,
      category_name: 'Category 1',
      category_color: '#3b82f6',
      priority: 'medium',
      status: 'todo',
      due_date: '2024-01-15',
      completed_at: null,
      position: 0,
      parent_task_id: null,
      workspace_id: WORKSPACE_ID,
      subtask_count: '2',
      completed_subtask_count: '1',
      created_by: 1,
      created_by_name: 'Test User',
      created_at: new Date(),
      updated_at: new Date(),
      assignees: [{ id: 1, name: 'Test User', email: 'test@example.com' }]
    };

    it('should return 400 when workspace_id is missing', async () => {
      req.query = {};

      await getAllTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'workspace_id is required'
      });
    });

    it('should return 403 when user lacks workspace access', async () => {
      req.query = { workspace_id: WORKSPACE_ID };
      verifyWorkspaceAccess.mockResolvedValue(null);

      await getAllTasks(req, res);

      expect(verifyWorkspaceAccess).toHaveBeenCalledWith(1, WORKSPACE_ID);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    });

    it('should return all tasks with joined data', async () => {
      req.query = { workspace_id: WORKSPACE_ID };
      query.mockResolvedValue({ rows: [mockTask] });

      await getAllTasks(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          tasks: [expect.objectContaining({
            id: 1,
            title: 'Test Task',
            categoryId: 1,
            categoryName: 'Category 1',
            workspaceId: WORKSPACE_ID,
            assignees: expect.any(Array),
            subtaskCount: 2,
            completedSubtaskCount: 1
          })],
          count: 1,
          nextCursor: null,
          hasMore: false,
        }
      });
    });

    it('should filter by category_id', async () => {
      req.query = { workspace_id: WORKSPACE_ID, category_id: '1' };
      query.mockResolvedValue({ rows: [mockTask] });

      await getAllTasks(req, res);

      // workspace_id is $1, category_id is $2, limit+1 is last param
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.category_id = $2'),
        [WORKSPACE_ID, '1', 51]
      );
    });

    it('should filter by multiple assignee_ids', async () => {
      req.query = { workspace_id: WORKSPACE_ID, assignee_ids: '1,2,3' };
      query.mockResolvedValue({ rows: [mockTask] });

      await getAllTasks(req, res);

      // workspace_id is $1, assignee_ids is $2, limit+1 is last
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ta.user_id = ANY($2::int[])'),
        [WORKSPACE_ID, [1, 2, 3], 51]
      );
    });

    it('should filter by status', async () => {
      req.query = { workspace_id: WORKSPACE_ID, status: 'completed' };
      query.mockResolvedValue({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.status = $2'),
        [WORKSPACE_ID, 'completed', 51]
      );
    });

    it('should filter by priority', async () => {
      req.query = { workspace_id: WORKSPACE_ID, priority: 'high' };
      query.mockResolvedValue({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.priority = $2'),
        [WORKSPACE_ID, 'high', 51]
      );
    });

    it('should filter by search term', async () => {
      req.query = { workspace_id: WORKSPACE_ID, search: 'test' };
      query.mockResolvedValue({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        [WORKSPACE_ID, '%test%', 51]
      );
    });

    it('should reject on database error', async () => {
      req.query = { workspace_id: WORKSPACE_ID };
      query.mockRejectedValue(new Error('Database error'));

      await expect(getAllTasks(req, res)).rejects.toThrow('Database error');
    });
  });

  // ---------------------------------------------------------------
  // getTaskById
  // ---------------------------------------------------------------
  describe('getTaskById', () => {
    it('should return 404 if task not found', async () => {
      req.params = { id: '999' };
      query.mockResolvedValue({ rows: [] });

      await getTaskById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task not found'
      });
    });

    it('should return task with all joined data', async () => {
      req.params = { id: '1' };
      const mockTask = {
        id: 1,
        title: 'Test Task',
        description: 'Description',
        category_id: 1,
        category_name: 'Category 1',
        category_color: '#3b82f6',
        priority: 'medium',
        status: 'todo',
        due_date: '2024-01-15',
        completed_at: null,
        position: 0,
        parent_task_id: null,
        workspace_id: WORKSPACE_ID,
        subtask_count: '0',
        completed_subtask_count: '0',
        created_by: 1,
        created_by_name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
        assignees: []
      };
      query.mockResolvedValue({ rows: [mockTask] });

      await getTaskById(req, res);

      expect(verifyWorkspaceAccess).toHaveBeenCalledWith(1, WORKSPACE_ID);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          task: expect.objectContaining({
            id: 1,
            title: 'Test Task',
            categoryId: 1,
            workspaceId: WORKSPACE_ID,
          })
        }
      });
    });

    it('should return 403 if user lacks workspace access', async () => {
      req.params = { id: '1' };
      const mockTask = {
        id: 1,
        title: 'Test Task',
        description: null,
        category_id: 1,
        category_name: 'Category 1',
        category_color: '#3b82f6',
        priority: 'medium',
        status: 'todo',
        due_date: null,
        completed_at: null,
        position: 0,
        parent_task_id: null,
        workspace_id: WORKSPACE_ID,
        subtask_count: '0',
        completed_subtask_count: '0',
        created_by: 1,
        created_by_name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
        assignees: []
      };
      query.mockResolvedValue({ rows: [mockTask] });
      verifyWorkspaceAccess.mockResolvedValue(null);

      await getTaskById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    });
  });

  // ---------------------------------------------------------------
  // createTask
  // ---------------------------------------------------------------
  describe('createTask', () => {
    it('should return 400 if workspace_id is missing', async () => {
      req.body = { title: 'Test Task' };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'workspace_id is required'
      });
    });

    it('should return 400 if title is missing', async () => {
      req.body = { workspace_id: WORKSPACE_ID, description: 'Test description' };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task title is required'
      });
    });

    it('should return 400 for invalid priority', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'Test Task', priority: 'invalid' };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid priority. Must be: low, medium, high, or urgent'
      });
    });

    it('should return 400 for invalid status', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'Test Task', status: 'invalid' };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid status. Must be: todo, in_progress, or completed'
      });
    });

    it('should return 403 for viewer role', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'Test Task' };
      verifyWorkspaceAccess.mockResolvedValue({ role: 'viewer' });

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Viewers cannot create tasks. Contact an admin to request edit permissions.'
      });
    });

    it('should calculate correct position for new task in category', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'Test Task', category_id: 1 };

      const fullTask = {
        id: 1, title: 'Test Task', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 5,
        parent_task_id: null, workspace_id: WORKSPACE_ID,
        subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      };

      query.mockResolvedValueOnce({ rows: [{ next_position: 5 }] }); // Position query
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch

      await createTask(req, res);

      expect(query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('COALESCE(MAX(position), -1) + 1'),
        [1]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(logActivity).toHaveBeenCalled();
    });

    it('should handle multiple assignees', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'Test Task', assignee_ids: [1, 2, 3] };

      const fullTask = {
        id: 1, title: 'Test Task', description: null, category_id: null,
        category_name: null, category_color: null, priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: null, workspace_id: WORKSPACE_ID,
        subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(),
        assignees: [{ id: 1, name: 'User 1', email: 'user1@test.com' }]
      };

      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert task (no category_id, no position query)
      query.mockResolvedValueOnce({ rows: [] }); // Insert assignees
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch
      query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'user1@test.com', name: 'User 1', email_notifications_enabled: true }] }); // Assignee prefs

      await createTask(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO task_assignments'),
        [1, 1, 2, 3]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            task: expect.objectContaining({
              workspaceId: WORKSPACE_ID,
            })
          })
        })
      );
    });

    it('should set completed_at when status is completed', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'Test Task', status: 'completed' };

      const fullTask = {
        id: 1, title: 'Test Task', description: null, category_id: null,
        category_name: null, category_color: null, priority: 'medium',
        status: 'completed', due_date: null, completed_at: new Date(), position: 0,
        parent_task_id: null, workspace_id: WORKSPACE_ID,
        subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      };

      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch

      await createTask(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tasks'),
        expect.arrayContaining(['completed', expect.any(Date)])
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ---------------------------------------------------------------
  // updateTask
  // ---------------------------------------------------------------
  describe('updateTask', () => {
    const existingTask = {
      id: 1,
      title: 'Existing Task',
      status: 'todo',
      completed_at: null,
      category_id: 1,
      position: 0,
      workspace_id: WORKSPACE_ID,
    };

    it('should return 404 if task not found', async () => {
      req.params = { id: '999' };
      req.body = { title: 'Updated' };
      query.mockResolvedValue({ rows: [] });

      await updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task not found'
      });
    });

    it('should return 400 for invalid priority', async () => {
      req.params = { id: '1' };
      req.body = { priority: 'invalid' };
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists

      await updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid priority. Must be: low, medium, high, or urgent'
      });
    });

    it('should return 400 for invalid status', async () => {
      req.params = { id: '1' };
      req.body = { status: 'invalid' };
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists

      await updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid status. Must be: todo, in_progress, or completed'
      });
    });

    it('should return 400 if no fields to update', async () => {
      req.params = { id: '1' };
      req.body = {};
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists

      await updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No fields to update'
      });
    });

    it('should set completed_at when status changes to completed', async () => {
      req.params = { id: '1' };
      req.body = { status: 'completed' };

      const fullTask = {
        id: 1, title: 'Existing Task', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'completed', due_date: null, completed_at: new Date(), position: 0,
        parent_task_id: null, workspace_id: WORKSPACE_ID,
        subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      };

      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Update
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch

      await updateTask(req, res);

      // The update query is the 2nd call: status + completed_at + id
      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining(['completed', expect.any(Date)])
      );
    });

    it('should clear completed_at when status changes from completed', async () => {
      req.params = { id: '1' };
      req.body = { status: 'todo' };
      const completedTask = { ...existingTask, status: 'completed', completed_at: new Date() };

      const fullTask = {
        id: 1, title: 'Existing Task', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: null, workspace_id: WORKSPACE_ID,
        subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      };

      query.mockResolvedValueOnce({ rows: [completedTask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Update
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch

      await updateTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining(['todo', null])
      );
    });

    it('should update assignees using getClient transaction', async () => {
      req.params = { id: '1' };
      req.body = { assignee_ids: [2, 3] };

      const fullTask = {
        id: 1, title: 'Existing Task', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: null, workspace_id: WORKSPACE_ID,
        subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(),
        assignees: [{ id: 2, name: 'User 2', email: 'user2@test.com' }]
      };

      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      // Transaction via mockClient
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] }); // Get current assignees
      mockClient.query.mockResolvedValueOnce({}); // DELETE
      mockClient.query.mockResolvedValueOnce({}); // INSERT
      mockClient.query.mockResolvedValueOnce({}); // COMMIT
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch

      await updateTask(req, res);

      expect(getClient).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT user_id FROM task_assignments WHERE task_id = $1',
        ['1']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM task_assignments WHERE task_id = $1',
        ['1']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO task_assignments'),
        ['1', 2, 3]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Task updated successfully'
      }));
    });

    it('should update partial fields', async () => {
      req.params = { id: '1' };
      req.body = { title: 'Updated Title' };

      const fullTask = {
        id: 1, title: 'Updated Title', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: null, workspace_id: WORKSPACE_ID,
        subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      };

      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Update
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch

      await updateTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('title = $1'),
        expect.arrayContaining(['Updated Title'])
      );
      expect(logActivity).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Task updated successfully'
      }));
    });
  });

  // ---------------------------------------------------------------
  // updateTaskPosition
  // ---------------------------------------------------------------
  describe('updateTaskPosition', () => {
    const existingTask = {
      id: 1,
      title: 'Test Task',
      category_id: 1,
      position: 2,
      workspace_id: WORKSPACE_ID,
    };

    it('should return 400 if position is missing', async () => {
      req.params = { id: '1' };
      req.body = {};

      await updateTaskPosition(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Position is required'
      });
    });

    it('should return 404 if task not found', async () => {
      req.params = { id: '999' };
      req.body = { position: 0 };
      query.mockResolvedValue({ rows: [] });

      await updateTaskPosition(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task not found'
      });
    });

    it('should update position using getClient transaction', async () => {
      req.params = { id: '1' };
      req.body = { position: 0 };

      // Task check via query()
      query.mockResolvedValueOnce({ rows: [existingTask] });
      // Transaction via mockClient
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({}); // UPDATE task position
      mockClient.query.mockResolvedValueOnce({}); // Reorder new category
      mockClient.query.mockResolvedValueOnce({}); // COMMIT
      // Get updated task via query()
      query.mockResolvedValueOnce({ rows: [{ ...existingTask, position: 0 }] });

      await updateTaskPosition(req, res);

      expect(getClient).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        [1, 0, '1']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Task position updated successfully'
      }));
    });
  });

  // ---------------------------------------------------------------
  // deleteTask
  // ---------------------------------------------------------------
  describe('deleteTask', () => {
    it('should return 404 if task not found', async () => {
      req.params = { id: '999' };
      query.mockResolvedValue({ rows: [] });

      await deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task not found'
      });
    });

    it('should delete task and reorder remaining', async () => {
      req.params = { id: '1' };
      const task = { id: 1, title: 'Test Task', category_id: 1, position: 2, workspace_id: WORKSPACE_ID };
      query.mockResolvedValueOnce({ rows: [task] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Delete
      query.mockResolvedValueOnce({ rows: [] }); // Reorder

      await deleteTask(req, res);

      expect(verifyWorkspaceAccess).toHaveBeenCalledWith(1, WORKSPACE_ID);
      expect(query).toHaveBeenNthCalledWith(2,
        'DELETE FROM tasks WHERE id = $1',
        ['1']
      );
      expect(query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('position = position - 1'),
        [1, 2]
      );
      expect(logActivity).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Task deleted successfully'
      });
    });
  });

  // ---------------------------------------------------------------
  // getSubtasks
  // ---------------------------------------------------------------
  describe('getSubtasks', () => {
    it('should return subtasks for a parent task', async () => {
      req.params = { id: '1' };

      const subtasks = [
        {
          id: 2, title: 'Subtask 1', description: null, category_id: 1,
          category_name: 'Category', category_color: '#fff', priority: 'low',
          status: 'todo', due_date: null, completed_at: null, position: 0,
          parent_task_id: 1, created_by: 1, created_by_name: 'Test',
          created_at: new Date(), updated_at: new Date(), assignees: []
        }
      ];

      // First query: parent task check
      query.mockResolvedValueOnce({ rows: [{ workspace_id: WORKSPACE_ID }] });
      // Second query: subtasks
      query.mockResolvedValueOnce({ rows: subtasks });

      await getSubtasks(req, res);

      expect(verifyWorkspaceAccess).toHaveBeenCalledWith(1, WORKSPACE_ID);
      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('WHERE t.parent_task_id = $1'),
        ['1']
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          subtasks: expect.arrayContaining([
            expect.objectContaining({ id: 2, parentTaskId: 1 })
          ]),
          count: 1
        }
      });
    });

    it('should return empty array when no subtasks', async () => {
      req.params = { id: '1' };

      // Parent task check
      query.mockResolvedValueOnce({ rows: [{ workspace_id: WORKSPACE_ID }] });
      // Subtasks query
      query.mockResolvedValueOnce({ rows: [] });

      await getSubtasks(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          subtasks: [],
          count: 0
        }
      });
    });

    it('should return 404 when parent task not found', async () => {
      req.params = { id: '999' };

      // Parent task check returns empty
      query.mockResolvedValueOnce({ rows: [] });

      await getSubtasks(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Parent task not found'
      });
    });
  });
});
