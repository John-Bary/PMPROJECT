import { act } from 'react';
import useTaskStore from '../taskStore';
import useWorkspaceStore from '../workspaceStore';
import useUserStore from '../userStore';
import { tasksAPI } from '../../utils/api';
import { toast } from 'sonner';
import analytics from '../../utils/analytics';

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

// Mock sonner
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock analytics
jest.mock('../../utils/analytics', () => ({
  __esModule: true,
  default: { track: jest.fn() },
  EVENTS: { TASK_CREATED: 'task_created' },
}));

describe('Task Store', () => {
  beforeEach(() => {
    // Set workspace ID so store operations don't bail early
    useWorkspaceStore.setState({ currentWorkspaceId: 'test-workspace-id' });
    // Provide users for assignee resolution
    useUserStore.setState({ users: [{ id: 10, name: 'Alice' }, { id: 20, name: 'Bob' }] });
    // Reset store to initial state
    useTaskStore.setState({
      tasks: [],
      isLoading: false,
      isFetching: false,
      isMutating: false,
      isLoadingMore: false,
      error: null,
      nextCursor: null,
      hasMore: false,
      _taskMutationGeneration: {},
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

    it('should return early without API call when no workspaceId', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      await act(async () => {
        await useTaskStore.getState().fetchTasks();
      });

      expect(tasksAPI.getAll).not.toHaveBeenCalled();
      expect(useTaskStore.getState().tasks).toEqual([]);
    });

    it('should set nextCursor and hasMore from response', async () => {
      tasksAPI.getAll.mockResolvedValue({
        data: { data: { tasks: [{ id: 1 }], nextCursor: 'cursor-abc', hasMore: true } }
      });

      await act(async () => {
        await useTaskStore.getState().fetchTasks();
      });

      const state = useTaskStore.getState();
      expect(state.nextCursor).toBe('cursor-abc');
      expect(state.hasMore).toBe(true);
    });

    it('should default nextCursor to null and hasMore to false when not in response', async () => {
      tasksAPI.getAll.mockResolvedValue({
        data: { data: { tasks: [{ id: 1 }] } }
      });

      await act(async () => {
        await useTaskStore.getState().fetchTasks();
      });

      const state = useTaskStore.getState();
      expect(state.nextCursor).toBeNull();
      expect(state.hasMore).toBe(false);
    });

    it('should use fallback error message when no response.data.message', async () => {
      tasksAPI.getAll.mockRejectedValue(new Error('Network failure'));

      await act(async () => {
        await useTaskStore.getState().fetchTasks();
      });

      expect(useTaskStore.getState().error).toBe('Failed to fetch tasks');
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch tasks');
    });

    it('should not clear loading flags on error when showLoading is false', async () => {
      useTaskStore.setState({ isLoading: false, isFetching: false });
      tasksAPI.getAll.mockRejectedValue(new Error('fail'));

      await act(async () => {
        await useTaskStore.getState().fetchTasks({}, { showLoading: false });
      });

      // isLoading and isFetching should remain as they were (false), not be explicitly set
      expect(useTaskStore.getState().isLoading).toBe(false);
      expect(useTaskStore.getState().isFetching).toBe(false);
    });
  });

  describe('loadMoreTasks', () => {
    it('should load more tasks and append to existing array', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Existing' }],
        hasMore: true,
        nextCursor: 'cursor-1',
      });

      tasksAPI.getAll.mockResolvedValue({
        data: { data: { tasks: [{ id: 2, title: 'New' }], nextCursor: 'cursor-2', hasMore: true } }
      });

      await act(async () => {
        await useTaskStore.getState().loadMoreTasks();
      });

      const state = useTaskStore.getState();
      expect(state.tasks).toHaveLength(2);
      expect(state.tasks[0]).toEqual({ id: 1, title: 'Existing' });
      expect(state.tasks[1]).toEqual({ id: 2, title: 'New' });
      expect(state.nextCursor).toBe('cursor-2');
      expect(state.hasMore).toBe(true);
      expect(state.isLoadingMore).toBe(false);
    });

    it('should set isLoadingMore true during load', async () => {
      useTaskStore.setState({ hasMore: true, nextCursor: 'cursor-1' });
      tasksAPI.getAll.mockImplementation(() => new Promise(() => {}));

      // eslint-disable-next-line no-unused-vars
      const promise = useTaskStore.getState().loadMoreTasks();

      expect(useTaskStore.getState().isLoadingMore).toBe(true);
    });

    it('should return early when hasMore is false', async () => {
      useTaskStore.setState({ hasMore: false, nextCursor: 'cursor-1' });

      await act(async () => {
        await useTaskStore.getState().loadMoreTasks();
      });

      expect(tasksAPI.getAll).not.toHaveBeenCalled();
    });

    it('should return early when nextCursor is null', async () => {
      useTaskStore.setState({ hasMore: true, nextCursor: null });

      await act(async () => {
        await useTaskStore.getState().loadMoreTasks();
      });

      expect(tasksAPI.getAll).not.toHaveBeenCalled();
    });

    it('should return early when isLoadingMore is true', async () => {
      useTaskStore.setState({ hasMore: true, nextCursor: 'cursor-1', isLoadingMore: true });

      await act(async () => {
        await useTaskStore.getState().loadMoreTasks();
      });

      expect(tasksAPI.getAll).not.toHaveBeenCalled();
    });

    it('should return early when no workspaceId', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });
      useTaskStore.setState({ hasMore: true, nextCursor: 'cursor-1' });

      await act(async () => {
        await useTaskStore.getState().loadMoreTasks();
      });

      expect(tasksAPI.getAll).not.toHaveBeenCalled();
    });

    it('should handle error and set isLoadingMore to false', async () => {
      useTaskStore.setState({ hasMore: true, nextCursor: 'cursor-1' });
      tasksAPI.getAll.mockRejectedValue({
        response: { data: { message: 'Pagination error' } }
      });

      await act(async () => {
        await useTaskStore.getState().loadMoreTasks();
      });

      expect(useTaskStore.getState().isLoadingMore).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Pagination error');
    });

    it('should use fallback error message when no response.data.message', async () => {
      useTaskStore.setState({ hasMore: true, nextCursor: 'cursor-1' });
      tasksAPI.getAll.mockRejectedValue(new Error('Network down'));

      await act(async () => {
        await useTaskStore.getState().loadMoreTasks();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to load more tasks');
      expect(useTaskStore.getState().isLoadingMore).toBe(false);
    });

    it('should default nextCursor to null and hasMore to false when absent from response', async () => {
      useTaskStore.setState({ hasMore: true, nextCursor: 'cursor-1' });
      tasksAPI.getAll.mockResolvedValue({
        data: { data: { tasks: [{ id: 3 }] } }
      });

      await act(async () => {
        await useTaskStore.getState().loadMoreTasks();
      });

      const state = useTaskStore.getState();
      expect(state.nextCursor).toBeNull();
      expect(state.hasMore).toBe(false);
    });

    it('should pass filters and cursor to API', async () => {
      useTaskStore.setState({
        hasMore: true,
        nextCursor: 'cursor-1',
        filters: { category_id: 5, assignee_ids: [], status: 'todo', priority: null, search: '' },
      });

      tasksAPI.getAll.mockResolvedValue({
        data: { data: { tasks: [], nextCursor: null, hasMore: false } }
      });

      await act(async () => {
        await useTaskStore.getState().loadMoreTasks();
      });

      expect(tasksAPI.getAll).toHaveBeenCalledWith({
        category_id: 5,
        assignee_ids: [],
        status: 'todo',
        priority: null,
        search: '',
        workspace_id: 'test-workspace-id',
        cursor: 'cursor-1',
      });
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

    it('should return error and show toast when no workspace selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      let result;
      await act(async () => {
        result = await useTaskStore.getState().createTask({ title: 'Task' });
      });

      expect(result).toEqual({ success: false, error: 'No workspace selected' });
      expect(toast.error).toHaveBeenCalledWith('No workspace selected');
      expect(tasksAPI.create).not.toHaveBeenCalled();
    });

    it('should call analytics.track with TASK_CREATED on success', async () => {
      const newTask = { id: 1, title: 'Tracked Task', status: 'todo' };
      tasksAPI.create.mockResolvedValue({
        data: { data: { task: newTask } }
      });

      await act(async () => {
        await useTaskStore.getState().createTask({ title: 'Tracked Task' });
      });

      expect(analytics.track).toHaveBeenCalledWith('task_created');
    });

    it('should use fallback error message when no response.data.message', async () => {
      tasksAPI.create.mockRejectedValue(new Error('Network failure'));

      await act(async () => {
        const result = await useTaskStore.getState().createTask({ title: 'Task' });
        expect(result).toEqual({ success: false, error: 'Failed to create task' });
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to create task');
    });

    it('should use "Task" as fallback title when task has no title', async () => {
      const newTask = { id: 1, status: 'todo' }; // no title field
      tasksAPI.create.mockResolvedValue({
        data: { data: { task: newTask } }
      });

      await act(async () => {
        await useTaskStore.getState().createTask({});
      });

      expect(toast.success).toHaveBeenCalledWith('Created "Task"');
    });

    it('should return success true and the task on success', async () => {
      const newTask = { id: 1, title: 'Task', status: 'todo' };
      tasksAPI.create.mockResolvedValue({
        data: { data: { task: newTask } }
      });

      let result;
      await act(async () => {
        result = await useTaskStore.getState().createTask({ title: 'Task' });
      });

      expect(result).toEqual({ success: true, task: newTask });
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

    it('should optimistically update before API resolves', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Old Title', priority: 'low', status: 'todo' }],
      });

      let resolveApi;
      tasksAPI.update.mockImplementation(() => new Promise((resolve) => { resolveApi = resolve; }));

      // Start the update but don't await
      const updatePromise = useTaskStore.getState().updateTask(1, { priority: 'high' });

      // Task should be updated immediately (optimistic)
      const taskBeforeResolve = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(taskBeforeResolve.priority).toBe('high');

      // isMutating should NOT be set by updateTask
      expect(useTaskStore.getState().isMutating).toBe(false);

      // Resolve the API
      resolveApi({ data: { data: { task: { id: 1, title: 'Old Title', priority: 'high', status: 'todo' } } } });
      await act(async () => { await updatePromise; });
    });

    it('should rollback on API error', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Task', priority: 'low', status: 'todo' }],
      });

      tasksAPI.update.mockRejectedValue({
        response: { data: { message: 'Server error' } }
      });

      await act(async () => {
        await useTaskStore.getState().updateTask(1, { priority: 'high' });
      });

      // Should have rolled back to original
      const task = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(task.priority).toBe('low');
      expect(toast.error).toHaveBeenCalledWith('Server error');
    });

    it('should not reconcile if a newer mutation has fired (generation conflict)', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Original', priority: 'low', status: 'todo' }],
      });

      let resolveFirst;
      let resolveSecond;
      tasksAPI.update
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

      // Fire first update
      const firstPromise = useTaskStore.getState().updateTask(1, { priority: 'medium' });
      // Fire second update immediately (newer generation)
      const secondPromise = useTaskStore.getState().updateTask(1, { priority: 'high' });

      // Optimistic: should show the latest (high)
      expect(useTaskStore.getState().tasks.find(t => t.id === 1).priority).toBe('high');

      // Resolve the first (older) mutation — it should NOT reconcile because gen is stale
      resolveFirst({ data: { data: { task: { id: 1, title: 'Original', priority: 'medium', status: 'todo' } } } });
      await act(async () => { await firstPromise; });

      // The task should still be 'high' (optimistic from second update), not 'medium'
      expect(useTaskStore.getState().tasks.find(t => t.id === 1).priority).toBe('high');

      // Resolve the second (newer) mutation — it SHOULD reconcile
      resolveSecond({ data: { data: { task: { id: 1, title: 'Original', priority: 'high', status: 'todo' } } } });
      await act(async () => { await secondPromise; });

      expect(useTaskStore.getState().tasks.find(t => t.id === 1).priority).toBe('high');
    });

    it('should not rollback on error if a newer mutation has fired', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Original', priority: 'low', status: 'todo' }],
      });

      let rejectFirst;
      let resolveSecond;
      tasksAPI.update
        .mockImplementationOnce(() => new Promise((_, reject) => { rejectFirst = reject; }))
        .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

      // Fire first update
      const firstPromise = useTaskStore.getState().updateTask(1, { priority: 'medium' });
      // Fire second update (newer generation)
      const secondPromise = useTaskStore.getState().updateTask(1, { priority: 'high' });

      // Reject the first (stale) — should NOT rollback because gen is stale
      rejectFirst({ response: { data: { message: 'First failed' } } });
      await act(async () => { await firstPromise; });

      // Task should still be 'high' from the second optimistic update, not rolled back to 'low'
      expect(useTaskStore.getState().tasks.find(t => t.id === 1).priority).toBe('high');

      // Resolve second
      resolveSecond({ data: { data: { task: { id: 1, title: 'Original', priority: 'high', status: 'todo' } } } });
      await act(async () => { await secondPromise; });
    });

    it('should use prevTasks title as fallback when updatedTask has no title', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Fallback Title', status: 'todo' }],
      });

      // updatedTask has no title
      tasksAPI.update.mockResolvedValue({
        data: { data: { task: { id: 1, status: 'in_progress' } } }
      });

      await act(async () => {
        await useTaskStore.getState().updateTask(1, { status: 'in_progress' });
      });

      expect(toast.success).toHaveBeenCalledWith('Updated "Fallback Title"');
    });

    it('should use "Task" as fallback when both updatedTask and prevTask have no title', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, status: 'todo' }], // no title
      });

      tasksAPI.update.mockResolvedValue({
        data: { data: { task: { id: 1, status: 'in_progress' } } } // no title
      });

      await act(async () => {
        await useTaskStore.getState().updateTask(1, { status: 'in_progress' });
      });

      expect(toast.success).toHaveBeenCalledWith('Updated "Task"');
    });

    it('should use fallback error message when no response.data.message', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Task', status: 'todo' }],
      });

      tasksAPI.update.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        const result = await useTaskStore.getState().updateTask(1, { title: 'New' });
        expect(result).toEqual({ success: false, error: 'Failed to update task' });
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to update task');
    });

    it('should map snake_case fields optimistically via buildOptimisticTaskData', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Task', status: 'todo', categoryId: 'cat-1' }],
      });

      let resolveApi;
      tasksAPI.update.mockImplementation(() => new Promise((resolve) => { resolveApi = resolve; }));

      const updatePromise = useTaskStore.getState().updateTask(1, {
        due_date: '2026-03-01',
        category_id: 'cat-2',
        completed_at: '2026-02-28T12:00:00Z',
        parent_task_id: 'parent-1',
      });

      // Verify optimistic update uses camelCase
      const task = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(task.dueDate).toBe('2026-03-01');
      expect(task.categoryId).toBe('cat-2');
      expect(task.completedAt).toBe('2026-02-28T12:00:00Z');
      expect(task.parentTaskId).toBe('parent-1');

      resolveApi({ data: { data: { task: { id: 1, title: 'Task' } } } });
      await act(async () => { await updatePromise; });
    });

    it('should map assignee_ids to assignees using userStore', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Task', status: 'todo' }],
      });

      let resolveApi;
      tasksAPI.update.mockImplementation(() => new Promise((resolve) => { resolveApi = resolve; }));

      const updatePromise = useTaskStore.getState().updateTask(1, {
        assignee_ids: [10, 20],
      });

      const task = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(task.assignees).toEqual([
        { id: 10, name: 'Alice' },
        { id: 20, name: 'Bob' },
      ]);

      resolveApi({ data: { data: { task: { id: 1, title: 'Task' } } } });
      await act(async () => { await updatePromise; });
    });

    it('should handle unknown assignee ids with "Unknown" name', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Task', status: 'todo' }],
      });

      let resolveApi;
      tasksAPI.update.mockImplementation(() => new Promise((resolve) => { resolveApi = resolve; }));

      const updatePromise = useTaskStore.getState().updateTask(1, {
        assignee_ids: [10, 999], // 999 is not in userStore
      });

      const task = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(task.assignees).toEqual([
        { id: 10, name: 'Alice' },
        { id: 999, name: 'Unknown' },
      ]);

      resolveApi({ data: { data: { task: { id: 1, title: 'Task' } } } });
      await act(async () => { await updatePromise; });
    });

    it('should pass through camelCase fields directly in optimistic update', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Old', description: 'old desc', status: 'todo' }],
      });

      let resolveApi;
      tasksAPI.update.mockImplementation(() => new Promise((resolve) => { resolveApi = resolve; }));

      const updatePromise = useTaskStore.getState().updateTask(1, {
        title: 'New',
        description: 'new desc',
        priority: 'urgent',
        status: 'in_progress',
      });

      const task = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(task.title).toBe('New');
      expect(task.description).toBe('new desc');
      expect(task.priority).toBe('urgent');
      expect(task.status).toBe('in_progress');

      resolveApi({ data: { data: { task: { id: 1, title: 'New' } } } });
      await act(async () => { await updatePromise; });
    });
  });

  describe('updateTaskPosition', () => {
    it('should optimistically move task to new category and position', async () => {
      useTaskStore.setState({
        tasks: [
          { id: 1, title: 'Task 1', categoryId: 'cat-a', position: 0 },
          { id: 2, title: 'Task 2', categoryId: 'cat-a', position: 1 },
          { id: 3, title: 'Task 3', categoryId: 'cat-b', position: 0 },
        ],
      });

      let resolvePosition;
      tasksAPI.updatePosition.mockImplementation(() => new Promise((resolve) => { resolvePosition = resolve; }));

      const promise = useTaskStore.getState().updateTaskPosition(1, { category_id: 'cat-b', position: 1 });

      // Before API resolves, the task should have been optimistically moved
      const movedTask = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(movedTask.categoryId).toBe('cat-b');

      tasksAPI.getAll.mockResolvedValue({ data: { data: { tasks: [] } } });
      resolvePosition({});
      await act(async () => { await promise; });
    });

    it('should set isMutating true during operation', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Task', categoryId: 'cat-a', position: 0 }],
      });

      let resolveApi;
      tasksAPI.updatePosition.mockImplementation(() => new Promise((resolve) => { resolveApi = resolve; }));

      const promise = useTaskStore.getState().updateTaskPosition(1, { category_id: 'cat-b', position: 0 });

      expect(useTaskStore.getState().isMutating).toBe(true);

      tasksAPI.getAll.mockResolvedValue({ data: { data: { tasks: [] } } });
      resolveApi({});
      await act(async () => { await promise; });

      expect(useTaskStore.getState().isMutating).toBe(false);
    });

    it('should call fetchTasks on success for background refetch', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Task', categoryId: 'cat-a', position: 0 }],
      });

      tasksAPI.updatePosition.mockResolvedValue({});
      tasksAPI.getAll.mockResolvedValue({ data: { data: { tasks: [{ id: 1, title: 'Task', categoryId: 'cat-b', position: 0 }] } } });

      await act(async () => {
        const result = await useTaskStore.getState().updateTaskPosition(1, { category_id: 'cat-b', position: 0 });
        expect(result).toEqual({ success: true });
      });

      // fetchTasks should have been called (background refetch)
      expect(tasksAPI.getAll).toHaveBeenCalled();
    });

    it('should revert to previous tasks on error', async () => {
      const prevTasks = [
        { id: 1, title: 'Task', categoryId: 'cat-a', position: 0 },
        { id: 2, title: 'Task 2', categoryId: 'cat-b', position: 0 },
      ];
      useTaskStore.setState({ tasks: prevTasks });

      tasksAPI.updatePosition.mockRejectedValue({
        response: { data: { message: 'Position update failed' } }
      });

      await act(async () => {
        const result = await useTaskStore.getState().updateTaskPosition(1, { category_id: 'cat-b', position: 1 });
        expect(result).toEqual({ success: false, error: 'Position update failed' });
      });

      expect(useTaskStore.getState().tasks).toEqual(prevTasks);
      expect(useTaskStore.getState().isMutating).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Position update failed');
    });

    it('should use fallback error message when no response.data.message', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Task', categoryId: 'cat-a', position: 0 }],
      });

      tasksAPI.updatePosition.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useTaskStore.getState().updateTaskPosition(1, { category_id: 'cat-b', position: 0 });
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to update position');
    });

    it('should handle task not found in state (returns isMutating true)', async () => {
      useTaskStore.setState({
        tasks: [{ id: 2, title: 'Other Task', categoryId: 'cat-a', position: 0 }],
      });

      let resolveApi;
      tasksAPI.updatePosition.mockImplementation(() => new Promise((resolve) => { resolveApi = resolve; }));

      const promise = useTaskStore.getState().updateTaskPosition(999, { category_id: 'cat-b', position: 0 });

      // When task is not found, set returns { isMutating: true } but tasks unchanged
      expect(useTaskStore.getState().isMutating).toBe(true);
      expect(useTaskStore.getState().tasks).toHaveLength(1);

      tasksAPI.getAll.mockResolvedValue({ data: { data: { tasks: [] } } });
      resolveApi({});
      await act(async () => { await promise; });
    });

    it('should correctly reorder positions in destination category', async () => {
      useTaskStore.setState({
        tasks: [
          { id: 1, title: 'A', categoryId: 'cat-a', position: 0 },
          { id: 2, title: 'B', categoryId: 'cat-b', position: 0 },
          { id: 3, title: 'C', categoryId: 'cat-b', position: 1 },
        ],
      });

      let resolvePosition;
      tasksAPI.updatePosition.mockImplementation(() => new Promise((resolve) => { resolvePosition = resolve; }));

      const promise = useTaskStore.getState().updateTaskPosition(1, { category_id: 'cat-b', position: 1 });

      // Check optimistic state BEFORE API resolves (before fetchTasks overwrites)
      const catBTasks = useTaskStore.getState().tasks
        .filter(t => t.categoryId === 'cat-b')
        .sort((a, b) => a.position - b.position);

      expect(catBTasks[0].id).toBe(2);
      expect(catBTasks[0].position).toBe(0);
      expect(catBTasks[1].id).toBe(1);
      expect(catBTasks[1].position).toBe(1);
      expect(catBTasks[2].id).toBe(3);
      expect(catBTasks[2].position).toBe(2);

      tasksAPI.getAll.mockResolvedValue({ data: { data: { tasks: [] } } });
      resolvePosition({});
      await act(async () => { await promise; });
    });

    it('should handle tasks with null/undefined positions using fallback of 0', async () => {
      useTaskStore.setState({
        tasks: [
          { id: 1, title: 'A', categoryId: 'cat-a', position: 0 },
          { id: 2, title: 'B', categoryId: 'cat-b', position: null },
          { id: 3, title: 'C', categoryId: 'cat-b' }, // position undefined
        ],
      });

      let resolvePosition;
      tasksAPI.updatePosition.mockImplementation(() => new Promise((resolve) => { resolvePosition = resolve; }));

      const promise = useTaskStore.getState().updateTaskPosition(1, { category_id: 'cat-b', position: 0 });

      // Tasks with null/undefined positions should be treated as position 0
      const catBTasks = useTaskStore.getState().tasks
        .filter(t => t.categoryId === 'cat-b');
      expect(catBTasks.length).toBe(3); // task 1 moved + task 2 + task 3

      tasksAPI.getAll.mockResolvedValue({ data: { data: { tasks: [] } } });
      resolvePosition({});
      await act(async () => { await promise; });
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

    it('should optimistically remove task before API resolves', async () => {
      useTaskStore.setState({
        tasks: [
          { id: 1, title: 'Task 1' },
          { id: 2, title: 'Task 2' },
        ],
      });

      let resolveApi;
      tasksAPI.delete.mockImplementation(() => new Promise((resolve) => { resolveApi = resolve; }));

      const deletePromise = useTaskStore.getState().deleteTask(1);

      // Task should be removed immediately
      expect(useTaskStore.getState().tasks).toHaveLength(1);
      expect(useTaskStore.getState().tasks.find(t => t.id === 1)).toBeUndefined();

      // isMutating should NOT be set
      expect(useTaskStore.getState().isMutating).toBe(false);

      resolveApi({});
      await act(async () => { await deletePromise; });
    });

    it('should rollback on API error (task reappears)', async () => {
      useTaskStore.setState({
        tasks: [
          { id: 1, title: 'Task 1' },
          { id: 2, title: 'Task 2' },
        ],
      });

      tasksAPI.delete.mockRejectedValue({
        response: { data: { message: 'Delete failed' } }
      });

      await act(async () => {
        await useTaskStore.getState().deleteTask(1);
      });

      // Task should reappear after rollback
      const tasks = useTaskStore.getState().tasks;
      expect(tasks).toHaveLength(2);
      expect(tasks.find(t => t.id === 1)).toBeDefined();
      expect(toast.error).toHaveBeenCalledWith('Delete failed');
    });

    it('should use "Task" as fallback title when task has no title', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1 }], // no title
      });
      tasksAPI.delete.mockResolvedValue({});

      await act(async () => {
        await useTaskStore.getState().deleteTask(1);
      });

      expect(toast.success).toHaveBeenCalledWith('Deleted "Task"');
    });

    it('should use fallback error message when no response.data.message', async () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Task' }],
      });

      tasksAPI.delete.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useTaskStore.getState().deleteTask(1);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to delete task');
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

    it('should optimistically change status and category', async () => {
      const task = { id: 1, title: 'Task', status: 'todo', categoryId: 10 };
      useTaskStore.setState({ tasks: [task] });

      const categories = [
        { id: 10, name: 'To Do' },
        { id: 20, name: 'Completed' },
      ];

      let resolveApi;
      tasksAPI.update.mockImplementation(() => new Promise((resolve) => { resolveApi = resolve; }));

      const togglePromise = useTaskStore.getState().toggleComplete(task, categories);

      // Should optimistically update status and category immediately
      const optimisticTask = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(optimisticTask.status).toBe('completed');
      expect(optimisticTask.categoryId).toBe(20);
      expect(optimisticTask.completedAt).toBeTruthy();

      // isMutating should NOT be set
      expect(useTaskStore.getState().isMutating).toBe(false);

      resolveApi({ data: { data: { task: { ...task, status: 'completed', categoryId: 20, completedAt: new Date().toISOString() } } } });
      await act(async () => { await togglePromise; });
    });

    it('should rollback on API error', async () => {
      const task = { id: 1, title: 'Task', status: 'todo', categoryId: 10 };
      useTaskStore.setState({ tasks: [task] });

      tasksAPI.update.mockRejectedValue({
        response: { data: { message: 'Toggle failed' } }
      });

      await act(async () => {
        await useTaskStore.getState().toggleComplete(task);
      });

      // Should rollback
      const rolledBackTask = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(rolledBackTask.status).toBe('todo');
      expect(rolledBackTask.categoryId).toBe(10);
      expect(toast.error).toHaveBeenCalledWith('Toggle failed');
    });

    it('should move task to "To Do" category when toggling from completed to todo', async () => {
      const task = { id: 1, title: 'Task', status: 'completed', categoryId: 20 };
      useTaskStore.setState({ tasks: [task] });

      const categories = [
        { id: 10, name: 'To Do' },
        { id: 20, name: 'Completed' },
      ];

      let resolveApi;
      tasksAPI.update.mockImplementation(() => new Promise((resolve) => { resolveApi = resolve; }));

      const togglePromise = useTaskStore.getState().toggleComplete(task, categories);

      // Should optimistically move to "To Do" category
      const optimisticTask = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(optimisticTask.status).toBe('todo');
      expect(optimisticTask.categoryId).toBe(10);
      expect(optimisticTask.completedAt).toBeNull();

      resolveApi({ data: { data: { task: { ...task, status: 'todo', categoryId: 10, completedAt: null } } } });
      await act(async () => { await togglePromise; });
    });

    it('should keep original categoryId when no matching category found', async () => {
      const task = { id: 1, title: 'Task', status: 'todo', categoryId: 99 };
      useTaskStore.setState({ tasks: [task] });

      // Categories don't include a "Completed" category
      const categories = [
        { id: 10, name: 'In Progress' },
        { id: 20, name: 'Done' }, // Not named "Completed"
      ];

      let resolveApi;
      tasksAPI.update.mockImplementation(() => new Promise((resolve) => { resolveApi = resolve; }));

      const togglePromise = useTaskStore.getState().toggleComplete(task, categories);

      const optimisticTask = useTaskStore.getState().tasks.find(t => t.id === 1);
      expect(optimisticTask.categoryId).toBe(99); // unchanged

      resolveApi({ data: { data: { task: { ...task, status: 'completed', categoryId: 99 } } } });
      await act(async () => { await togglePromise; });
    });

    it('should use "Task" as fallback label when task has no title', async () => {
      const task = { id: 1, status: 'todo' }; // no title
      useTaskStore.setState({ tasks: [task] });

      tasksAPI.update.mockResolvedValue({
        data: { data: { task: { id: 1, status: 'completed' } } }
      });

      await act(async () => {
        await useTaskStore.getState().toggleComplete(task);
      });

      expect(toast.success).toHaveBeenCalledWith('Marked "Task" as completed');
    });

    it('should use fallback error message when no response.data.message', async () => {
      const task = { id: 1, title: 'Task', status: 'todo' };
      useTaskStore.setState({ tasks: [task] });

      tasksAPI.update.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useTaskStore.getState().toggleComplete(task);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to update task');
    });

    it('should not modify other tasks when toggling one task', async () => {
      const task1 = { id: 1, title: 'Task 1', status: 'todo', categoryId: 10 };
      const task2 = { id: 2, title: 'Task 2', status: 'in_progress', categoryId: 15 };
      useTaskStore.setState({ tasks: [task1, task2] });

      tasksAPI.update.mockResolvedValue({
        data: { data: { task: { ...task1, status: 'completed', completedAt: '2026-02-28T12:00:00Z' } } }
      });

      await act(async () => {
        await useTaskStore.getState().toggleComplete(task1);
      });

      // task2 should remain unchanged
      const unchangedTask = useTaskStore.getState().tasks.find(t => t.id === 2);
      expect(unchangedTask.status).toBe('in_progress');
      expect(unchangedTask.categoryId).toBe(15);
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

  describe('clearTasks', () => {
    it('should reset tasks, nextCursor, hasMore, and error to initial values', () => {
      useTaskStore.setState({
        tasks: [{ id: 1, title: 'Task' }, { id: 2, title: 'Task 2' }],
        nextCursor: 'cursor-abc',
        hasMore: true,
        error: 'Some error',
      });

      act(() => {
        useTaskStore.getState().clearTasks();
      });

      const state = useTaskStore.getState();
      expect(state.tasks).toEqual([]);
      expect(state.nextCursor).toBeNull();
      expect(state.hasMore).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should not affect other state properties like filters or isMutating', () => {
      useTaskStore.setState({
        tasks: [{ id: 1 }],
        nextCursor: 'cursor',
        hasMore: true,
        error: 'err',
        filters: { category_id: 5, assignee_ids: [], status: 'todo', priority: 'high', search: 'test' },
        isMutating: true,
        isLoading: true,
      });

      act(() => {
        useTaskStore.getState().clearTasks();
      });

      const state = useTaskStore.getState();
      // These should be cleared
      expect(state.tasks).toEqual([]);
      expect(state.nextCursor).toBeNull();
      expect(state.hasMore).toBe(false);
      expect(state.error).toBeNull();
      // These should be preserved
      expect(state.filters.category_id).toBe(5);
      expect(state.isMutating).toBe(true);
      expect(state.isLoading).toBe(true);
    });
  });
});
