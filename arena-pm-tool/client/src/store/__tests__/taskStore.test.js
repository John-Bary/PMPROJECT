import { act } from 'react';
import useTaskStore from '../taskStore';
import { tasksAPI } from '../../utils/api';
import toast from 'react-hot-toast';

// Mock the API module
jest.mock('../../utils/api', () => ({
  tasksAPI: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updatePosition: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe('Task Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useTaskStore.setState({
      tasks: [],
      isLoading: false,
      isFetching: false,
      isMutating: false,
      error: null,
      filters: {
        category_id: null,
        assignee_ids: [],
        status: null,
        priority: null,
        search: '',
      },
    });
    jest.clearAllMocks();
  });

  describe('fetchTasks', () => {
    it('should set loading flags during fetch', async () => {
      tasksAPI.getAll.mockImplementation(() => new Promise(() => {})); // Never resolves

      // eslint-disable-next-line no-unused-vars
      const fetchPromise = useTaskStore.getState().fetchTasks();

      expect(useTaskStore.getState().isLoading).toBe(true);
      expect(useTaskStore.getState().isFetching).toBe(true);
    });

    it('should update tasks array on success', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1', status: 'todo' },
        { id: 2, title: 'Task 2', status: 'completed' },
      ];
      tasksAPI.getAll.mockResolvedValue({
        data: { data: { tasks: mockTasks } }
      });

      await act(async () => {
        await useTaskStore.getState().fetchTasks();
      });

      const state = useTaskStore.getState();
      expect(state.tasks).toEqual(mockTasks);
      expect(state.isLoading).toBe(false);
      expect(state.isFetching).toBe(false);
    });

    it('should not show loading when showLoading is false', async () => {
      tasksAPI.getAll.mockResolvedValue({
        data: { data: { tasks: [] } }
      });

      await act(async () => {
        await useTaskStore.getState().fetchTasks({}, { showLoading: false });
      });

      // isLoading should still be false (wasn't set during fetch)
      expect(useTaskStore.getState().isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Network error';
      tasksAPI.getAll.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      await act(async () => {
        await useTaskStore.getState().fetchTasks();
      });

      const state = useTaskStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('createTask', () => {
    it('should set isMutating flag', async () => {
      tasksAPI.create.mockImplementation(() => new Promise(() => {}));

      // eslint-disable-next-line no-unused-vars
      const createPromise = useTaskStore.getState().createTask({ title: 'New Task' });

      expect(useTaskStore.getState().isMutating).toBe(true);
    });

    it('should append new task to array', async () => {
      const newTask = { id: 1, title: 'New Task', status: 'todo' };
      tasksAPI.create.mockResolvedValue({
        data: { data: { task: newTask } }
      });

      await act(async () => {
        await useTaskStore.getState().createTask({ title: 'New Task' });
      });

      expect(useTaskStore.getState().tasks).toContainEqual(newTask);
    });

    it('should show success toast with task title', async () => {
      const newTask = { id: 1, title: 'My New Task', status: 'todo' };
      tasksAPI.create.mockResolvedValue({
        data: { data: { task: newTask } }
      });

      await act(async () => {
        await useTaskStore.getState().createTask({ title: 'My New Task' });
      });

      expect(toast.success).toHaveBeenCalledWith('Created "My New Task"');
    });

    it('should handle create error', async () => {
      tasksAPI.create.mockRejectedValue({
        response: { data: { message: 'Create failed' } }
      });

      await act(async () => {
        const result = await useTaskStore.getState().createTask({ title: 'Task' });
        expect(result.success).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith('Create failed');
      expect(useTaskStore.getState().isMutating).toBe(false);
    });
  });

  describe('updateTask', () => {
    it('should update task in array by id', async () => {
      useTaskStore.setState({
        tasks: [
          { id: 1, title: 'Old Title', status: 'todo' },
          { id: 2, title: 'Other Task', status: 'todo' },
        ],
      });

      const updatedTask = { id: 1, title: 'New Title', status: 'todo' };
      tasksAPI.update.mockResolvedValue({
        data: { data: { task: updatedTask } }
      });

      await act(async () => {
        await useTaskStore.getState().updateTask(1, { title: 'New Title' });
      });

      const task = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(task.title).toBe('New Title');
    });

    it('should show success toast with updated title', async () => {
      const updatedTask = { id: 1, title: 'Updated Task', status: 'todo' };
      tasksAPI.update.mockResolvedValue({
        data: { data: { task: updatedTask } }
      });

      await act(async () => {
        await useTaskStore.getState().updateTask(1, { title: 'Updated Task' });
      });

      expect(toast.success).toHaveBeenCalledWith('Updated "Updated Task"');
    });
  });

  describe('deleteTask', () => {
    it('should remove task from array', async () => {
      useTaskStore.setState({
        tasks: [
          { id: 1, title: 'Task 1' },
          { id: 2, title: 'Task 2' },
        ],
      });
      tasksAPI.delete.mockResolvedValue({});

      await act(async () => {
        await useTaskStore.getState().deleteTask(1);
      });

      const tasks = useTaskStore.getState().tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks.find(t => t.id === 1)).toBeUndefined();
    });

    it('should show success toast with deleted task title', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Task to Delete' }],
      });
      tasksAPI.delete.mockResolvedValue({});

      await act(async () => {
        await useTaskStore.getState().deleteTask(1);
      });

      expect(toast.success).toHaveBeenCalledWith('Deleted "Task to Delete"');
    });
  });

  describe('toggleComplete', () => {
    it('should toggle status from todo to completed', async () => {
      const task = { id: 1, title: 'Task', status: 'todo' };
      useTaskStore.setState({ tasks: [task] });

      const completedTask = { ...task, status: 'completed', completedAt: new Date().toISOString() };
      tasksAPI.update.mockResolvedValue({
        data: { data: { task: completedTask } }
      });

      await act(async () => {
        await useTaskStore.getState().toggleComplete(task);
      });

      const updatedTask = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(updatedTask.status).toBe('completed');
      expect(toast.success).toHaveBeenCalledWith('Marked "Task" as completed');
    });

    it('should toggle status from completed to todo', async () => {
      const task = { id: 1, title: 'Task', status: 'completed' };
      useTaskStore.setState({ tasks: [task] });

      const todoTask = { ...task, status: 'todo', completedAt: null };
      tasksAPI.update.mockResolvedValue({
        data: { data: { task: todoTask } }
      });

      await act(async () => {
        await useTaskStore.getState().toggleComplete(task);
      });

      const updatedTask = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(updatedTask.status).toBe('todo');
      expect(toast.success).toHaveBeenCalledWith('Marked "Task" as incomplete');
    });
  });

  describe('setFilters', () => {
    it('should merge new filters with existing', () => {
      useTaskStore.setState({
        filters: { category_id: 1, status: 'todo', priority: null, assignee_ids: [], search: '' },
      });

      act(() => {
        useTaskStore.getState().setFilters({ status: 'completed', priority: 'high' });
      });

      const filters = useTaskStore.getState().filters;
      expect(filters.category_id).toBe(1); // preserved
      expect(filters.status).toBe('completed'); // updated
      expect(filters.priority).toBe('high'); // updated
    });
  });

  describe('clearFilters', () => {
    it('should reset all filters', () => {
      useTaskStore.setState({
        filters: { category_id: 1, status: 'completed', priority: 'high', assignee_ids: [1, 2], search: 'test' },
      });

      act(() => {
        useTaskStore.getState().clearFilters();
      });

      const filters = useTaskStore.getState().filters;
      expect(filters).toEqual({
        category_id: null,
        assignee_ids: [],
        status: null,
        priority: null,
        search: '',
      });
    });
  });
});
