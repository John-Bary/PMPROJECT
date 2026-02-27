/**
 * Task CRUD Full Flow Integration Tests
 * Tests task operations end-to-end through the controller:
 * - Create task with all fields
 * - Update task fields individually
 * - Update task position (drag & drop)
 * - Add/remove assignees (transaction flow)
 * - Create subtask under parent
 * - Get subtasks for parent
 * - Delete task (with cascade verification)
 * - Filter tasks by category, status, priority, assignee
 * - Search tasks by keyword
 * - Cursor pagination
 */

jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../middleware/workspaceAuth', () => ({
  verifyWorkspaceAccess: jest.fn(),
  canUserEdit: jest.fn(),
}));

jest.mock('../utils/emailQueue', () => ({
  queueTaskAssignmentNotification: jest.fn().mockResolvedValue(true),
}));

jest.mock('../lib/activityLog', () => ({
  logActivity: jest.fn(),
}));

jest.mock('../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { query, getClient } = require('../config/database');
const { verifyWorkspaceAccess } = require('../middleware/workspaceAuth');
const { logActivity } = require('../lib/activityLog');
const {
  createTask,
  updateTask,
  updateTaskPosition,
  deleteTask,
  getSubtasks,
  getAllTasks,
} = require('../controllers/taskController');

describe('Task CRUD Flow Integration', () => {
  let req, res;
  const WORKSPACE_ID = 'ws-uuid-task-crud';

  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  // Helper to build a full task response row
  const buildTaskRow = (overrides = {}) => ({
    id: 1,
    title: 'Test Task',
    description: 'Test description',
    category_id: 10,
    category_name: 'To Do',
    category_color: '#3B82F6',
    priority: 'medium',
    status: 'todo',
    due_date: '2026-03-15',
    completed_at: null,
    position: 0,
    parent_task_id: null,
    workspace_id: WORKSPACE_ID,
    subtask_count: '0',
    completed_subtask_count: '0',
    created_by: 1,
    created_by_name: 'Test User',
    created_at: new Date('2026-02-01'),
    updated_at: new Date('2026-02-01'),
    assignees: [],
    ...overrides,
  });

  beforeEach(() => {
    req = createMockReq({ user: { id: 1 } });
    res = createMockRes();
    jest.clearAllMocks();
    getClient.mockResolvedValue(mockClient);
    verifyWorkspaceAccess.mockResolvedValue({ role: 'member' });
  });

  // ------------------------------------------------------------------
  // Create task with all fields
  // ------------------------------------------------------------------
  describe('Create task with all fields', () => {
    it('creates a task with title, description, priority, status, category, due_date, and assignees', async () => {
      req.body = {
        workspace_id: WORKSPACE_ID,
        title: 'Full-featured Task',
        description: 'A detailed description of the task',
        priority: 'high',
        status: 'in_progress',
        category_id: 10,
        due_date: '2026-04-01',
        assignee_ids: [2, 3],
      };

      const fullTask = buildTaskRow({
        title: 'Full-featured Task',
        description: 'A detailed description of the task',
        priority: 'high',
        status: 'in_progress',
        due_date: '2026-04-01',
        category_id: 10,
        assignees: [
          { id: 2, name: 'User Two', email: 'user2@example.com' },
          { id: 3, name: 'User Three', email: 'user3@example.com' },
        ],
      });

      // Position query (for category_id)
      query.mockResolvedValueOnce({ rows: [{ next_position: 3 }] });
      // INSERT task
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      // INSERT assignees
      query.mockResolvedValueOnce({ rows: [] });
      // Full task fetch
      query.mockResolvedValueOnce({ rows: [fullTask] });
      // Assignee prefs
      query.mockResolvedValueOnce({
        rows: [
          { id: 2, email: 'user2@example.com', name: 'User Two', email_notifications_enabled: true },
          { id: 3, email: 'user3@example.com', name: 'User Three', email_notifications_enabled: true },
        ],
      });

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          task: expect.objectContaining({
            title: 'Full-featured Task',
            description: 'A detailed description of the task',
            priority: 'high',
            status: 'in_progress',
            categoryId: 10,
            dueDate: '2026-04-01',
            assignees: expect.arrayContaining([
              expect.objectContaining({ id: 2 }),
              expect.objectContaining({ id: 3 }),
            ]),
          }),
        }),
      }));
      expect(logActivity).toHaveBeenCalledWith(
        WORKSPACE_ID, 1, 'created', 'task', 1, expect.any(Object),
      );
    });
  });

  // ------------------------------------------------------------------
  // Update task fields individually
  // ------------------------------------------------------------------
  describe('Update task fields individually', () => {
    const existingTask = {
      id: 1,
      title: 'Original Title',
      status: 'todo',
      completed_at: null,
      category_id: 10,
      position: 0,
      workspace_id: WORKSPACE_ID,
    };

    it('updates only the title field', async () => {
      req.params = { id: '1' };
      req.body = { title: 'Updated Title' };

      const fullTask = buildTaskRow({ title: 'Updated Title' });

      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // UPDATE
      query.mockResolvedValueOnce({ rows: [fullTask] }); // Full task fetch

      await updateTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('title = $1'),
        expect.arrayContaining(['Updated Title']),
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          task: expect.objectContaining({ title: 'Updated Title' }),
        }),
      }));
    });

    it('updates only the priority field', async () => {
      req.params = { id: '1' };
      req.body = { priority: 'urgent' };

      const fullTask = buildTaskRow({ priority: 'urgent' });

      query.mockResolvedValueOnce({ rows: [existingTask] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [fullTask] });

      await updateTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('priority = $1'),
        expect.arrayContaining(['urgent']),
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          task: expect.objectContaining({ priority: 'urgent' }),
        }),
      }));
    });

    it('updates status to completed and sets completed_at', async () => {
      req.params = { id: '1' };
      req.body = { status: 'completed' };

      const fullTask = buildTaskRow({ status: 'completed', completed_at: new Date() });

      query.mockResolvedValueOnce({ rows: [existingTask] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [fullTask] });

      await updateTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining(['completed', expect.any(Date)]),
      );
    });
  });

  // ------------------------------------------------------------------
  // Update task position (drag & drop)
  // ------------------------------------------------------------------
  describe('Update task position (drag & drop)', () => {
    it('moves task to new position within same category using transaction', async () => {
      req.params = { id: '1' };
      req.body = { position: 0 };

      const existingTask = {
        id: 1, title: 'Task', category_id: 10, position: 2, workspace_id: WORKSPACE_ID,
      };

      // Task check
      query.mockResolvedValueOnce({ rows: [existingTask] });
      // Transaction
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({}); // UPDATE task position
      mockClient.query.mockResolvedValueOnce({}); // Reorder category
      mockClient.query.mockResolvedValueOnce({}); // COMMIT
      // Get updated task
      query.mockResolvedValueOnce({ rows: [{ ...existingTask, position: 0 }] });

      await updateTaskPosition(req, res);

      expect(getClient).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        [10, 0, '1'],
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          task: expect.objectContaining({ position: 0 }),
        }),
      }));
    });

    it('moves task to a different category and reorders old category', async () => {
      req.params = { id: '1' };
      req.body = { category_id: 20, position: 1 };

      const existingTask = {
        id: 1, title: 'Task', category_id: 10, position: 2, workspace_id: WORKSPACE_ID,
      };

      query.mockResolvedValueOnce({ rows: [existingTask] });
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({}); // UPDATE task category + position
      mockClient.query.mockResolvedValueOnce({}); // Reorder new category
      mockClient.query.mockResolvedValueOnce({}); // Reorder OLD category
      mockClient.query.mockResolvedValueOnce({}); // COMMIT
      query.mockResolvedValueOnce({ rows: [{ ...existingTask, category_id: 20, position: 1 }] });

      await updateTaskPosition(req, res);

      // Verify old category reorder was called
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('position = position - 1'),
        [10, 2],
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          task: expect.objectContaining({ categoryId: 20, position: 1 }),
        }),
      }));
    });
  });

  // ------------------------------------------------------------------
  // Add/remove assignees (transaction flow)
  // ------------------------------------------------------------------
  describe('Add/remove assignees (transaction flow)', () => {
    it('replaces assignees via transaction: DELETE old, INSERT new', async () => {
      req.params = { id: '1' };
      req.body = { assignee_ids: [4, 5] };

      const existingTask = {
        id: 1, title: 'Task', status: 'todo', completed_at: null,
        category_id: 10, position: 0, workspace_id: WORKSPACE_ID,
      };
      const fullTask = buildTaskRow({
        assignees: [
          { id: 4, name: 'User 4', email: 'u4@test.com' },
          { id: 5, name: 'User 5', email: 'u5@test.com' },
        ],
      });

      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      // Transaction
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] }); // Current assignees
      mockClient.query.mockResolvedValueOnce({}); // DELETE
      mockClient.query.mockResolvedValueOnce({}); // INSERT
      mockClient.query.mockResolvedValueOnce({}); // COMMIT
      // Full task fetch
      query.mockResolvedValueOnce({ rows: [fullTask] });
      // Updater name (for email notification to newly added assignees)
      query.mockResolvedValueOnce({ rows: [{ name: 'Test User' }] });
      // Assignee prefs (newly added: 4 and 5, existing was 2)
      query.mockResolvedValueOnce({
        rows: [
          { id: 4, email: 'u4@test.com', name: 'User 4', email_notifications_enabled: true },
          { id: 5, email: 'u5@test.com', name: 'User 5', email_notifications_enabled: true },
        ],
      });

      await updateTask(req, res);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM task_assignments WHERE task_id = $1',
        ['1'],
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO task_assignments'),
        ['1', 4, 5],
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('clears all assignees when assignee_ids is empty array', async () => {
      req.params = { id: '1' };
      req.body = { assignee_ids: [] };

      const existingTask = {
        id: 1, title: 'Task', status: 'todo', completed_at: null,
        category_id: 10, position: 0, workspace_id: WORKSPACE_ID,
      };
      const fullTask = buildTaskRow({ assignees: [] });

      query.mockResolvedValueOnce({ rows: [existingTask] });
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] }); // Current
      mockClient.query.mockResolvedValueOnce({}); // DELETE
      // No INSERT since array is empty
      mockClient.query.mockResolvedValueOnce({}); // COMMIT
      query.mockResolvedValueOnce({ rows: [fullTask] });

      await updateTask(req, res);

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM task_assignments WHERE task_id = $1',
        ['1'],
      );
      // INSERT should not have been called since there are no new assignees
      const insertCalls = mockClient.query.mock.calls.filter(
        c => typeof c[0] === 'string' && c[0].includes('INSERT INTO task_assignments'),
      );
      expect(insertCalls).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------------
  // Create subtask under parent
  // ------------------------------------------------------------------
  describe('Create subtask under parent', () => {
    it('creates a subtask linked to parent_task_id', async () => {
      req.body = {
        workspace_id: WORKSPACE_ID,
        title: 'Subtask 1',
        parent_task_id: 100,
        priority: 'low',
      };

      const fullTask = buildTaskRow({
        id: 201,
        title: 'Subtask 1',
        parent_task_id: 100,
        priority: 'low',
      });

      // INSERT (no category = no position query)
      query.mockResolvedValueOnce({ rows: [{ id: 201 }] });
      // Full task fetch
      query.mockResolvedValueOnce({ rows: [fullTask] });

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tasks'),
        expect.arrayContaining([100]), // parent_task_id
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          task: expect.objectContaining({
            parentTaskId: 100,
          }),
        }),
      }));
    });
  });

  // ------------------------------------------------------------------
  // Get subtasks for parent
  // ------------------------------------------------------------------
  describe('Get subtasks for parent', () => {
    it('returns subtasks for a given parent task', async () => {
      req.params = { id: '100' };

      const subtaskRows = [
        buildTaskRow({ id: 201, title: 'Subtask A', parent_task_id: 100, position: 0 }),
        buildTaskRow({ id: 202, title: 'Subtask B', parent_task_id: 100, position: 1 }),
      ];

      // Parent task check
      query.mockResolvedValueOnce({ rows: [{ workspace_id: WORKSPACE_ID }] });
      // Subtasks query
      query.mockResolvedValueOnce({ rows: subtaskRows });

      await getSubtasks(req, res);

      expect(verifyWorkspaceAccess).toHaveBeenCalledWith(1, WORKSPACE_ID);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          subtasks: expect.arrayContaining([
            expect.objectContaining({ id: 201, parentTaskId: 100 }),
            expect.objectContaining({ id: 202, parentTaskId: 100 }),
          ]),
          count: 2,
        }),
      }));
    });
  });

  // ------------------------------------------------------------------
  // Delete task
  // ------------------------------------------------------------------
  describe('Delete task', () => {
    it('deletes task and reorders remaining tasks in category', async () => {
      req.params = { id: '1' };

      const task = {
        id: 1, title: 'Task to Delete', category_id: 10, position: 2,
        workspace_id: WORKSPACE_ID,
      };

      query.mockResolvedValueOnce({ rows: [task] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // DELETE
      query.mockResolvedValueOnce({ rows: [] }); // Reorder

      await deleteTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        'DELETE FROM tasks WHERE id = $1',
        ['1'],
      );
      expect(query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('position = position - 1'),
        [10, 2],
      );
      expect(logActivity).toHaveBeenCalledWith(
        WORKSPACE_ID, 1, 'deleted', 'task', '1', expect.any(Object),
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Task deleted successfully',
      }));
    });

    it('blocks viewer from deleting tasks', async () => {
      req.params = { id: '1' };
      verifyWorkspaceAccess.mockResolvedValue({ role: 'viewer' });

      query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Task', workspace_id: WORKSPACE_ID }],
      });

      await deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Viewers cannot delete'),
      }));
    });
  });

  // ------------------------------------------------------------------
  // Filter tasks
  // ------------------------------------------------------------------
  describe('Filter tasks', () => {
    it('filters by category_id', async () => {
      req.query = { workspace_id: WORKSPACE_ID, category_id: '10' };
      query.mockResolvedValueOnce({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.category_id = $2'),
        [WORKSPACE_ID, '10', 51],
      );
    });

    it('filters by status', async () => {
      req.query = { workspace_id: WORKSPACE_ID, status: 'completed' };
      query.mockResolvedValueOnce({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.status = $2'),
        [WORKSPACE_ID, 'completed', 51],
      );
    });

    it('filters by priority', async () => {
      req.query = { workspace_id: WORKSPACE_ID, priority: 'urgent' };
      query.mockResolvedValueOnce({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.priority = $2'),
        [WORKSPACE_ID, 'urgent', 51],
      );
    });

    it('filters by assignee_ids', async () => {
      req.query = { workspace_id: WORKSPACE_ID, assignee_ids: '2,3' };
      query.mockResolvedValueOnce({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ta.user_id = ANY($2::int[])'),
        [WORKSPACE_ID, [2, 3], 51],
      );
    });
  });

  // ------------------------------------------------------------------
  // Search tasks by keyword
  // ------------------------------------------------------------------
  describe('Search tasks by keyword', () => {
    it('searches by keyword using ILIKE on title and description', async () => {
      req.query = { workspace_id: WORKSPACE_ID, search: 'deploy' };
      query.mockResolvedValueOnce({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        [WORKSPACE_ID, '%deploy%', 51],
      );
    });
  });

  // ------------------------------------------------------------------
  // Cursor pagination
  // ------------------------------------------------------------------
  describe('Cursor pagination', () => {
    it('returns hasMore=true and nextCursor when more results exist', async () => {
      req.query = { workspace_id: WORKSPACE_ID, limit: '2' };

      // Return 3 rows (limit + 1) to indicate hasMore
      const rows = [
        buildTaskRow({ id: 1, title: 'Task 1' }),
        buildTaskRow({ id: 2, title: 'Task 2' }),
        buildTaskRow({ id: 3, title: 'Task 3' }), // extra
      ];
      query.mockResolvedValueOnce({ rows });

      await getAllTasks(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tasks: expect.arrayContaining([
            expect.objectContaining({ id: 1 }),
            expect.objectContaining({ id: 2 }),
          ]),
          count: 2,
          hasMore: true,
          nextCursor: 2,
        }),
      }));
    });

    it('passes cursor as filter parameter', async () => {
      req.query = { workspace_id: WORKSPACE_ID, cursor: '5' };
      query.mockResolvedValueOnce({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.id > $2'),
        [WORKSPACE_ID, 5, 51],
      );
    });

    it('returns hasMore=false when no more results', async () => {
      req.query = { workspace_id: WORKSPACE_ID, limit: '10' };
      const rows = [
        buildTaskRow({ id: 1, title: 'Only Task' }),
      ];
      query.mockResolvedValueOnce({ rows });

      await getAllTasks(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          count: 1,
          hasMore: false,
          nextCursor: null,
        }),
      }));
    });
  });
});
