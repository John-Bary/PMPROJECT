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

const { query } = require('../../config/database');

describe('Task Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    req.user = { id: 1 };
    jest.clearAllMocks();
  });

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
      subtask_count: '2',
      completed_subtask_count: '1',
      created_by: 1,
      created_by_name: 'Test User',
      created_at: new Date(),
      updated_at: new Date(),
      assignees: [{ id: 1, name: 'Test User', email: 'test@example.com' }]
    };

    it('should return all tasks with joined data', async () => {
      req.query = {};
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
            assignees: expect.any(Array),
            subtaskCount: 2,
            completedSubtaskCount: 1
          })],
          count: 1
        }
      });
    });

    it('should filter by category_id', async () => {
      req.query = { category_id: '1' };
      query.mockResolvedValue({ rows: [mockTask] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.category_id = $1'),
        ['1']
      );
    });

    it('should filter by multiple assignee_ids (comma-separated)', async () => {
      req.query = { assignee_ids: '1,2,3' };
      query.mockResolvedValue({ rows: [mockTask] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ta.user_id = ANY($1::int[])'),
        [[1, 2, 3]]
      );
    });

    it('should filter by status', async () => {
      req.query = { status: 'completed' };
      query.mockResolvedValue({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.status = $1'),
        ['completed']
      );
    });

    it('should filter by priority', async () => {
      req.query = { priority: 'high' };
      query.mockResolvedValue({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND t.priority = $1'),
        ['high']
      );
    });

    it('should filter by search term', async () => {
      req.query = { search: 'test' };
      query.mockResolvedValue({ rows: [] });

      await getAllTasks(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%test%']
      );
    });

    it('should handle database errors', async () => {
      req.query = {};
      query.mockRejectedValue(new Error('Database error'));

      await getAllTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error fetching tasks',
        error: 'Database error'
      });
    });
  });

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

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          task: expect.objectContaining({
            id: 1,
            title: 'Test Task',
            categoryId: 1
          })
        }
      });
    });
  });

  describe('createTask', () => {
    it('should return 400 if title is missing', async () => {
      req.body = { description: 'Test description' };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Task title is required'
      });
    });

    it('should return 400 for invalid priority', async () => {
      req.body = { title: 'Test Task', priority: 'invalid' };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid priority. Must be: low, medium, high, or urgent'
      });
    });

    it('should return 400 for invalid status', async () => {
      req.body = { title: 'Test Task', status: 'invalid' };

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid status. Must be: todo, in_progress, or completed'
      });
    });

    it('should calculate correct position for new task in category', async () => {
      req.body = { title: 'Test Task', category_id: 1 };
      query.mockResolvedValueOnce({ rows: [{ next_position: 5 }] }); // Position query
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert
      query.mockResolvedValueOnce({ rows: [{
        id: 1, title: 'Test Task', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 5,
        parent_task_id: null, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      }] }); // Full task query

      await createTask(req, res);

      expect(query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('COALESCE(MAX(position), -1) + 1'),
        [1]
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle multiple assignees', async () => {
      req.body = { title: 'Test Task', assignee_ids: [1, 2, 3] };
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert task
      query.mockResolvedValueOnce({ rows: [] }); // Insert assignees
      query.mockResolvedValueOnce({ rows: [{
        id: 1, title: 'Test Task', description: null, category_id: null,
        category_name: null, category_color: null, priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: null, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: [{ id: 1, name: 'User 1', email: 'user1@test.com' }]
      }] }); // Full task query

      await createTask(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO task_assignments'),
        [1, 1, 2, 3]
      );
    });

    it('should set completed_at when status is completed', async () => {
      req.body = { title: 'Test Task', status: 'completed' };
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert
      query.mockResolvedValueOnce({ rows: [{
        id: 1, title: 'Test Task', description: null, category_id: null,
        category_name: null, category_color: null, priority: 'medium',
        status: 'completed', due_date: null, completed_at: new Date(), position: 0,
        parent_task_id: null, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      }] }); // Full task query

      await createTask(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tasks'),
        expect.arrayContaining(['completed', expect.any(Date)])
      );
    });

    it('should format due_date correctly', async () => {
      req.body = { title: 'Test Task', due_date: '2024-01-15T00:00:00.000Z' };
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert
      query.mockResolvedValueOnce({ rows: [{
        id: 1, title: 'Test Task', description: null, category_id: null,
        category_name: null, category_color: null, priority: 'medium',
        status: 'todo', due_date: '2024-01-15', completed_at: null, position: 0,
        parent_task_id: null, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      }] }); // Full task query

      await createTask(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tasks'),
        expect.arrayContaining(['2024-01-15'])
      );
    });
  });

  describe('updateTask', () => {
    const existingTask = {
      id: 1,
      title: 'Existing Task',
      status: 'todo',
      completed_at: null,
      category_id: 1,
      position: 0
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
      query.mockResolvedValue({ rows: [existingTask] });

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
      query.mockResolvedValue({ rows: [existingTask] });

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
      query.mockResolvedValue({ rows: [existingTask] });

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
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Update
      query.mockResolvedValueOnce({ rows: [{
        id: 1, title: 'Existing Task', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'completed', due_date: null, completed_at: new Date(), position: 0,
        parent_task_id: null, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      }] }); // Full task

      await updateTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining(['completed', expect.any(Date)])
      );
    });

    it('should clear completed_at when status changes from completed', async () => {
      req.params = { id: '1' };
      req.body = { status: 'todo' };
      const completedTask = { ...existingTask, status: 'completed', completed_at: new Date() };
      query.mockResolvedValueOnce({ rows: [completedTask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Update
      query.mockResolvedValueOnce({ rows: [{
        id: 1, title: 'Existing Task', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: null, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      }] }); // Full task

      await updateTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining(['todo', null])
      );
    });

    it('should update assignees when assignee_ids provided', async () => {
      req.params = { id: '1' };
      req.body = { assignee_ids: [2, 3] };
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Delete old assignments
      query.mockResolvedValueOnce({ rows: [] }); // Insert new assignments
      query.mockResolvedValueOnce({ rows: [{
        id: 1, title: 'Existing Task', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: null, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: [{ id: 2, name: 'User 2', email: 'user2@test.com' }]
      }] }); // Full task

      await updateTask(req, res);

      expect(query).toHaveBeenCalledWith(
        'DELETE FROM task_assignments WHERE task_id = $1',
        ['1']
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO task_assignments'),
        ['1', 2, 3]
      );
    });

    it('should update partial fields', async () => {
      req.params = { id: '1' };
      req.body = { title: 'Updated Title' };
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Update
      query.mockResolvedValueOnce({ rows: [{
        id: 1, title: 'Updated Title', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: null, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      }] }); // Full task

      await updateTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('title = $1'),
        expect.arrayContaining(['Updated Title'])
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Task updated successfully'
      }));
    });
  });

  describe('updateTaskPosition', () => {
    const existingTask = {
      id: 1,
      title: 'Test Task',
      category_id: 1,
      position: 2
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

    it('should update position within same category', async () => {
      req.params = { id: '1' };
      req.body = { position: 0 };
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Update task
      query.mockResolvedValueOnce({ rows: [] }); // Reorder
      query.mockResolvedValueOnce({ rows: [{ ...existingTask, position: 0 }] }); // Get updated

      await updateTaskPosition(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE tasks'),
        [1, 0, '1']
      );
    });

    it('should handle cross-category move', async () => {
      req.params = { id: '1' };
      req.body = { category_id: 2, position: 0 };
      query.mockResolvedValueOnce({ rows: [existingTask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Update task
      query.mockResolvedValueOnce({ rows: [] }); // Reorder new category
      query.mockResolvedValueOnce({ rows: [] }); // Reorder old category
      query.mockResolvedValueOnce({ rows: [{ ...existingTask, category_id: 2, position: 0 }] }); // Get updated

      await updateTaskPosition(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE tasks'),
        [2, 0, '1']
      );
      // Should reorder old category
      expect(query).toHaveBeenNthCalledWith(4,
        expect.stringContaining('position = position - 1'),
        [1, 2]
      );
    });
  });

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
      const task = { id: 1, category_id: 1, position: 2 };
      query.mockResolvedValueOnce({ rows: [task] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Delete
      query.mockResolvedValueOnce({ rows: [] }); // Reorder

      await deleteTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        'DELETE FROM tasks WHERE id = $1',
        ['1']
      );
      expect(query).toHaveBeenNthCalledWith(3,
        expect.stringContaining('position = position - 1'),
        [1, 2]
      );
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Task deleted successfully'
      });
    });

    it('should not reorder if task has no category', async () => {
      req.params = { id: '1' };
      const task = { id: 1, category_id: null, position: 0 };
      query.mockResolvedValueOnce({ rows: [task] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Delete

      await deleteTask(req, res);

      expect(query).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Task deleted successfully'
      });
    });
  });

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
      query.mockResolvedValue({ rows: subtasks });

      await getSubtasks(req, res);

      expect(query).toHaveBeenCalledWith(
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
      query.mockResolvedValue({ rows: [] });

      await getSubtasks(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          subtasks: [],
          count: 0
        }
      });
    });

    it('should return subtasks with dueDate, priority, and assignees', async () => {
      req.params = { id: '1' };
      const subtasks = [
        {
          id: 2, title: 'Subtask with fields', description: 'A subtask', category_id: 1,
          category_name: 'Category', category_color: '#fff', priority: 'high',
          status: 'in_progress', due_date: '2024-02-15', completed_at: null, position: 0,
          parent_task_id: 1, created_by: 1, created_by_name: 'Test',
          created_at: new Date(), updated_at: new Date(),
          assignees: [{ id: 1, name: 'User 1', email: 'user1@test.com' }]
        }
      ];
      query.mockResolvedValue({ rows: subtasks });

      await getSubtasks(req, res);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          subtasks: expect.arrayContaining([
            expect.objectContaining({
              id: 2,
              parentTaskId: 1,
              priority: 'high',
              dueDate: '2024-02-15',
              assignees: expect.arrayContaining([
                expect.objectContaining({ id: 1, name: 'User 1' })
              ])
            })
          ]),
          count: 1
        }
      });
    });
  });

  describe('createTask (subtask)', () => {
    it('should create subtask with parent_task_id', async () => {
      req.body = {
        title: 'New Subtask',
        parent_task_id: 1,
        category_id: 1
      };
      query.mockResolvedValueOnce({ rows: [{ next_position: 0 }] }); // Position query
      query.mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Insert
      query.mockResolvedValueOnce({ rows: [{
        id: 2, title: 'New Subtask', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: 1, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      }] }); // Full task query

      await createTask(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tasks'),
        expect.arrayContaining([1]) // parent_task_id
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            task: expect.objectContaining({
              parentTaskId: 1
            })
          })
        })
      );
    });

    it('should create subtask with dueDate, priority, and assignees', async () => {
      req.body = {
        title: 'Subtask with fields',
        parent_task_id: 1,
        category_id: 1,
        priority: 'high',
        due_date: '2024-02-15',
        assignee_ids: [1, 2]
      };
      query.mockResolvedValueOnce({ rows: [{ next_position: 0 }] }); // Position query
      query.mockResolvedValueOnce({ rows: [{ id: 2 }] }); // Insert task
      query.mockResolvedValueOnce({ rows: [] }); // Insert assignees
      query.mockResolvedValueOnce({ rows: [{
        id: 2, title: 'Subtask with fields', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'high',
        status: 'todo', due_date: '2024-02-15', completed_at: null, position: 0,
        parent_task_id: 1, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(),
        assignees: [
          { id: 1, name: 'User 1', email: 'user1@test.com' },
          { id: 2, name: 'User 2', email: 'user2@test.com' }
        ]
      }] }); // Full task query

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            task: expect.objectContaining({
              parentTaskId: 1,
              priority: 'high',
              dueDate: '2024-02-15',
              assignees: expect.arrayContaining([
                expect.objectContaining({ id: 1 }),
                expect.objectContaining({ id: 2 })
              ])
            })
          })
        })
      );
    });
  });

  describe('updateTask (subtask)', () => {
    it('should update subtask priority', async () => {
      req.params = { id: '2' };
      req.body = { priority: 'urgent' };
      const existingSubtask = {
        id: 2, title: 'Existing Subtask', status: 'todo',
        completed_at: null, category_id: 1, position: 0,
        parent_task_id: 1
      };
      query.mockResolvedValueOnce({ rows: [existingSubtask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Update
      query.mockResolvedValueOnce({ rows: [{
        id: 2, title: 'Existing Subtask', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'urgent',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: 1, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      }] }); // Full task

      await updateTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('priority = $1'),
        expect.arrayContaining(['urgent'])
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            task: expect.objectContaining({
              priority: 'urgent',
              parentTaskId: 1
            })
          })
        })
      );
    });

    it('should update subtask due date', async () => {
      req.params = { id: '2' };
      req.body = { due_date: '2024-03-01' };
      const existingSubtask = {
        id: 2, title: 'Existing Subtask', status: 'todo',
        completed_at: null, category_id: 1, position: 0,
        parent_task_id: 1
      };
      query.mockResolvedValueOnce({ rows: [existingSubtask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [] }); // Update
      query.mockResolvedValueOnce({ rows: [{
        id: 2, title: 'Existing Subtask', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: '2024-03-01', completed_at: null, position: 0,
        parent_task_id: 1, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(), assignees: []
      }] }); // Full task

      await updateTask(req, res);

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('due_date = $1'),
        expect.arrayContaining(['2024-03-01'])
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            task: expect.objectContaining({
              dueDate: '2024-03-01',
              parentTaskId: 1
            })
          })
        })
      );
    });

    it('should update subtask assignees', async () => {
      req.params = { id: '2' };
      req.body = { assignee_ids: [3, 4] };
      const existingSubtask = {
        id: 2, title: 'Existing Subtask', status: 'todo',
        completed_at: null, category_id: 1, position: 0,
        parent_task_id: 1
      };
      query.mockResolvedValueOnce({ rows: [existingSubtask] }); // Check exists
      query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] }); // Get current assignees
      query.mockResolvedValueOnce({ rows: [] }); // Delete old assignments
      query.mockResolvedValueOnce({ rows: [] }); // Insert new assignments
      query.mockResolvedValueOnce({ rows: [{
        id: 2, title: 'Existing Subtask', description: null, category_id: 1,
        category_name: 'Category', category_color: '#fff', priority: 'medium',
        status: 'todo', due_date: null, completed_at: null, position: 0,
        parent_task_id: 1, subtask_count: '0', completed_subtask_count: '0',
        created_by: 1, created_by_name: 'Test', created_at: new Date(),
        updated_at: new Date(),
        assignees: [
          { id: 3, name: 'User 3', email: 'user3@test.com' },
          { id: 4, name: 'User 4', email: 'user4@test.com' }
        ]
      }] }); // Full task

      await updateTask(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO task_assignments'),
        ['2', 3, 4]
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            task: expect.objectContaining({
              parentTaskId: 1,
              assignees: expect.arrayContaining([
                expect.objectContaining({ id: 3 }),
                expect.objectContaining({ id: 4 })
              ])
            })
          })
        })
      );
    });
  });
});
