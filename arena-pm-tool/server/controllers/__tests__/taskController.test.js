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
const { queueTaskAssignmentNotification } = require('../../utils/emailQueue');
const logger = require('../../lib/logger');

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

    it('should handle assignee_ids passed as an array', async () => {
      req.query = { workspace_id: WORKSPACE_ID, assignee_ids: ['1', '2'] };
      query.mockResolvedValue({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ta.user_id = ANY($2::int[])'),
        [WORKSPACE_ID, [1, 2], 51]
      );
    });

    it('should format Date object due_date as YYYY-MM-DD string', async () => {
      req.query = { workspace_id: WORKSPACE_ID };
      const dateObj = new Date('2024-06-15T12:00:00Z');
      const taskWithDateObj = {
        id: 2,
        title: 'Date Task',
        description: null,
        category_id: 1,
        category_name: 'Category 1',
        category_color: '#3b82f6',
        priority: 'medium',
        status: 'todo',
        due_date: dateObj,
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
      query.mockResolvedValue({ rows: [taskWithDateObj] });

      await getAllTasks(req, res);

      const responseData = res.json.mock.calls[0][0];
      const returnedTask = responseData.data.tasks[0];
      // formatDueDateForClient should produce YYYY-MM-DD from a Date object
      expect(returnedTask.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle cursor-based pagination', async () => {
      req.query = { workspace_id: WORKSPACE_ID, cursor: '10' };
      query.mockResolvedValue({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.id > $2'),
        [WORKSPACE_ID, 10, 51]
      );
    });

    it('should set hasMore and nextCursor when more results exist', async () => {
      req.query = { workspace_id: WORKSPACE_ID, limit: '2' };
      // Return 3 rows (limit+1) to indicate there are more
      const tasks = [
        { id: 1, title: 'T1', description: null, category_id: null, category_name: null, category_color: null, priority: 'medium', status: 'todo', due_date: null, completed_at: null, position: 0, parent_task_id: null, workspace_id: WORKSPACE_ID, subtask_count: '0', completed_subtask_count: '0', created_by: 1, created_by_name: 'Test', created_at: new Date(), updated_at: new Date(), assignees: [] },
        { id: 2, title: 'T2', description: null, category_id: null, category_name: null, category_color: null, priority: 'medium', status: 'todo', due_date: null, completed_at: null, position: 1, parent_task_id: null, workspace_id: WORKSPACE_ID, subtask_count: '0', completed_subtask_count: '0', created_by: 1, created_by_name: 'Test', created_at: new Date(), updated_at: new Date(), assignees: [] },
        { id: 3, title: 'T3', description: null, category_id: null, category_name: null, category_color: null, priority: 'medium', status: 'todo', due_date: null, completed_at: null, position: 2, parent_task_id: null, workspace_id: WORKSPACE_ID, subtask_count: '0', completed_subtask_count: '0', created_by: 1, created_by_name: 'Test', created_at: new Date(), updated_at: new Date(), assignees: [] },
      ];
      query.mockResolvedValue({ rows: tasks });

      await getAllTasks(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.hasMore).toBe(true);
      expect(responseData.data.nextCursor).toBe(2);
      expect(responseData.data.tasks).toHaveLength(2);
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

    it('should return 403 when user has no workspace access', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'Test Task' };
      verifyWorkspaceAccess.mockResolvedValue(null);

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    });

    it('should return 400 when title exceeds 500 characters', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'A'.repeat(501) };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task title must be 500 characters or less'
      });
    });

    it('should return 400 when description exceeds 10000 characters', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'Test Task', description: 'D'.repeat(10001) };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task description must be 10,000 characters or less'
      });
    });

    it('should handle notification failure gracefully', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'Test Task', assignee_ids: [2] };

      const fullTask = {
        id: 1, title: 'Test Task', description: null, category_id: null,
        category_name: null, category_color: null, priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: null, workspace_id: WORKSPACE_ID,
        subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(),
        assignees: [{ id: 2, name: 'User 2', email: 'user2@test.com' }]
      };

      // Make queueTaskAssignmentNotification return a rejected promise
      queueTaskAssignmentNotification.mockRejectedValue(new Error('Email failed'));

      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert task
      query.mockResolvedValueOnce({ rows: [] }); // Insert assignees
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch
      query.mockResolvedValueOnce({ rows: [{ id: 2, email: 'user2@test.com', name: 'User 2', email_notifications_enabled: true }] }); // Assignee prefs

      await createTask(req, res);

      // Should still return 201 despite notification failure
      expect(res.status).toHaveBeenCalledWith(201);
      expect(queueTaskAssignmentNotification).toHaveBeenCalled();
    });

    it('should skip notification for assignees with notifications disabled', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'Test Task', assignee_ids: [2] };

      const fullTask = {
        id: 1, title: 'Test Task', description: null, category_id: null,
        category_name: null, category_color: null, priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: null, workspace_id: WORKSPACE_ID,
        subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(),
        assignees: [{ id: 2, name: 'User 2', email: 'user2@test.com' }]
      };

      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert task
      query.mockResolvedValueOnce({ rows: [] }); // Insert assignees
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch
      query.mockResolvedValueOnce({ rows: [{ id: 2, email: 'user2@test.com', name: 'User 2', email_notifications_enabled: false }] }); // Assignee prefs - disabled

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(queueTaskAssignmentNotification).not.toHaveBeenCalled();
    });

    it('should process due_date by stripping time portion', async () => {
      req.body = { workspace_id: WORKSPACE_ID, title: 'Test Task', due_date: '2024-06-15T12:30:00Z' };

      const fullTask = {
        id: 1, title: 'Test Task', description: null, category_id: null,
        category_name: null, category_color: null, priority: 'medium',
        status: 'todo', due_date: '2024-06-15', completed_at: null, position: 0,
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
        expect.arrayContaining(['2024-06-15'])
      );
      expect(res.status).toHaveBeenCalledWith(201);
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

    it('should return 403 when user has no workspace access', async () => {
      req.params = { id: '1' };
      req.body = { title: 'Updated' };
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      verifyWorkspaceAccess.mockResolvedValue(null);

      await updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    });

    it('should return 403 for viewer role', async () => {
      req.params = { id: '1' };
      req.body = { title: 'Updated' };
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      verifyWorkspaceAccess.mockResolvedValue({ role: 'viewer' });

      await updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Viewers cannot edit tasks. Contact an admin to request edit permissions.'
      });
    });

    it('should return 400 when title exceeds 500 characters', async () => {
      req.params = { id: '1' };
      req.body = { title: 'A'.repeat(501) };
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists

      await updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task title must be 500 characters or less'
      });
    });

    it('should return 400 when description exceeds 10000 characters', async () => {
      req.params = { id: '1' };
      req.body = { description: 'D'.repeat(10001) };
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists

      await updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task description must be 10,000 characters or less'
      });
    });

    it('should update description field', async () => {
      req.params = { id: '1' };
      req.body = { description: 'New description text' };

      const fullTask = {
        id: 1, title: 'Existing Task', description: 'New description text', category_id: 1,
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
        expect.stringContaining('description = $1'),
        expect.arrayContaining(['New description text'])
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
      }));
    });

    it('should update category_id field', async () => {
      req.params = { id: '1' };
      req.body = { category_id: 5 };

      const fullTask = {
        id: 1, title: 'Existing Task', description: null, category_id: 5,
        category_name: 'New Category', category_color: '#abc', priority: 'medium',
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
        expect.stringContaining('category_id = $1'),
        expect.arrayContaining([5])
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
      }));
    });

    it('should update priority field', async () => {
      req.params = { id: '1' };
      req.body = { priority: 'urgent' };

      const fullTask = {
        id: 1, title: 'Existing Task', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'urgent',
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
        expect.stringContaining('priority = $1'),
        expect.arrayContaining(['urgent'])
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
      }));
    });

    it('should update due_date field', async () => {
      req.params = { id: '1' };
      req.body = { due_date: '2024-12-25T00:00:00Z' };

      const fullTask = {
        id: 1, title: 'Existing Task', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: '2024-12-25', completed_at: null, position: 0,
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
        expect.stringContaining('due_date = $1'),
        expect.arrayContaining(['2024-12-25'])
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
      }));
    });

    it('should clear due_date when set to null', async () => {
      req.params = { id: '1' };
      req.body = { due_date: null };

      const fullTask = {
        id: 1, title: 'Existing Task', description: null, category_id: 1,
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
        expect.stringContaining('due_date = $1'),
        expect.arrayContaining([null])
      );
    });

    it('should rollback transaction on assignee update failure', async () => {
      req.params = { id: '1' };
      req.body = { assignee_ids: [2, 3] };

      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      // Transaction via mockClient
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] }); // Get current assignees
      mockClient.query.mockRejectedValueOnce(new Error('Transaction failed')); // DELETE fails

      await expect(updateTask(req, res)).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should send notifications to newly added assignees on update', async () => {
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
        assignees: [{ id: 2, name: 'User 2', email: 'user2@test.com' }, { id: 3, name: 'User 3', email: 'user3@test.com' }]
      };

      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      // Transaction via mockClient
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] }); // Get current assignees (user 1 was there)
      mockClient.query.mockResolvedValueOnce({}); // DELETE
      mockClient.query.mockResolvedValueOnce({}); // INSERT
      mockClient.query.mockResolvedValueOnce({}); // COMMIT
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch
      query.mockResolvedValueOnce({ rows: [{ name: 'Updater' }] }); // Updater name
      query.mockResolvedValueOnce({ rows: [
        { id: 2, email: 'user2@test.com', name: 'User 2', email_notifications_enabled: true },
        { id: 3, email: 'user3@test.com', name: 'User 3', email_notifications_enabled: true },
      ] }); // New assignee prefs

      await updateTask(req, res);

      // Both user 2 and 3 are newly added (user 1 was previous)
      expect(queueTaskAssignmentNotification).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
      }));
    });

    it('should handle notification failure on update gracefully', async () => {
      req.params = { id: '1' };
      req.body = { assignee_ids: [2] };

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

      queueTaskAssignmentNotification.mockRejectedValue(new Error('Email failed'));

      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Get current assignees (empty => user 2 is new)
      mockClient.query.mockResolvedValueOnce({}); // DELETE
      mockClient.query.mockResolvedValueOnce({}); // INSERT
      mockClient.query.mockResolvedValueOnce({}); // COMMIT
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch
      query.mockResolvedValueOnce({ rows: [{ name: 'Updater' }] }); // Updater name
      query.mockResolvedValueOnce({ rows: [
        { id: 2, email: 'user2@test.com', name: 'User 2', email_notifications_enabled: true },
      ] }); // New assignee prefs

      await updateTask(req, res);

      // Should still return success despite notification failure
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
      }));
      expect(queueTaskAssignmentNotification).toHaveBeenCalled();
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

    it('should rollback transaction on position update failure', async () => {
      req.params = { id: '1' };
      req.body = { position: 0 };

      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('Position update failed')); // UPDATE fails

      await expect(updateTaskPosition(req, res)).rejects.toThrow('Position update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reorder old category when category changes', async () => {
      req.params = { id: '1' };
      req.body = { category_id: 5, position: 0 };

      const taskInCategory1 = { ...existingTask, category_id: 1, position: 2 };
      query.mockResolvedValueOnce({ rows: [taskInCategory1] }); // Check exists
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({}); // UPDATE task position + category
      mockClient.query.mockResolvedValueOnce({}); // Reorder new category
      mockClient.query.mockResolvedValueOnce({}); // Reorder old category
      mockClient.query.mockResolvedValueOnce({}); // COMMIT
      query.mockResolvedValueOnce({ rows: [{ ...taskInCategory1, category_id: 5, position: 0 }] }); // Updated task

      await updateTaskPosition(req, res);

      // Should have 5 mockClient.query calls: BEGIN, UPDATE, reorder new, reorder old, COMMIT
      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('position = position - 1'),
        [1, 2]
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
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

    it('should return 403 when user has no workspace access', async () => {
      req.params = { id: '1' };
      const task = { id: 1, title: 'Test Task', category_id: 1, position: 2, workspace_id: WORKSPACE_ID };
      query.mockResolvedValueOnce({ rows: [task] }); // Check exists
      verifyWorkspaceAccess.mockResolvedValue(null);

      await deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace'
      });
    });

    it('should return 403 for viewer role', async () => {
      req.params = { id: '1' };
      const task = { id: 1, title: 'Test Task', category_id: 1, position: 2, workspace_id: WORKSPACE_ID };
      query.mockResolvedValueOnce({ rows: [task] }); // Check exists
      verifyWorkspaceAccess.mockResolvedValue({ role: 'viewer' });

      await deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Viewers cannot delete tasks. Contact an admin to request edit permissions.'
      });
    });

    it('should skip reorder when task has no category', async () => {
      req.params = { id: '1' };
      const task = { id: 1, title: 'Test Task', category_id: null, position: 0, workspace_id: WORKSPACE_ID };
      query.mockResolvedValueOnce({ rows: [task] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Delete

      await deleteTask(req, res);

      // Only 2 queries: check exists + delete. No reorder query.
      expect(query).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Task deleted successfully'
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

    it('should return 403 when user has no workspace access', async () => {
      req.params = { id: '1' };
      query.mockResolvedValueOnce({ rows: [{ workspace_id: WORKSPACE_ID }] }); // Parent task check
      verifyWorkspaceAccess.mockResolvedValue(null);

      await getSubtasks(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'You do not have access to this workspace'
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
