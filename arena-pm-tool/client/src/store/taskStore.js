// Task State Management with Zustand
import { create } from 'zustand';
import { tasksAPI } from '../utils/api';
import { toast } from 'sonner';
import useWorkspaceStore from './workspaceStore';
import useUserStore from './userStore';
import analytics, { EVENTS } from '../utils/analytics';

// Helper to get current workspace ID
const getWorkspaceId = () => useWorkspaceStore.getState().currentWorkspaceId;

// Maps snake_case API fields to camelCase task object fields for optimistic updates
const buildOptimisticTaskData = (apiData) => {
  const mapped = {};
  if ('due_date' in apiData) mapped.dueDate = apiData.due_date;
  if ('category_id' in apiData) mapped.categoryId = apiData.category_id;
  if ('completed_at' in apiData) mapped.completedAt = apiData.completed_at;
  if ('parent_task_id' in apiData) mapped.parentTaskId = apiData.parent_task_id;
  if ('assignee_ids' in apiData) {
    const allUsers = useUserStore.getState().users;
    mapped.assignees = apiData.assignee_ids.map((id) => {
      const user = allUsers.find((u) => u.id === id);
      return user ? { id: user.id, name: user.name } : { id, name: 'Unknown' };
    });
  }
  // Pass through camelCase fields directly (title, description, priority, status, etc.)
  const snakeKeys = ['due_date', 'category_id', 'completed_at', 'parent_task_id', 'assignee_ids', 'workspace_id'];
  for (const [key, value] of Object.entries(apiData)) {
    if (!snakeKeys.includes(key)) {
      mapped[key] = value;
    }
  }
  return mapped;
};

const useTaskStore = create((set, get) => ({
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
    assignee_ids: [], // Changed from assignee_id to support multiple assignees
    status: null,
    priority: null,
    search: '',
  },

  // Fetch all tasks (filtered by workspace_id) — resets pagination
  fetchTasks: async (filters = {}, options = { showLoading: true }) => {
    const showLoading = options?.showLoading !== false;
    const workspaceId = getWorkspaceId();

    // Don't fetch if no workspace is selected - avoids "workspace_id is required" errors
    if (!workspaceId) {
      return;
    }

    if (showLoading) {
      set({ isLoading: true, isFetching: true, error: null });
    }

    try {
      // Include workspace_id in filters
      const filtersWithWorkspace = {
        ...filters,
        workspace_id: workspaceId,
      };
      const response = await tasksAPI.getAll(filtersWithWorkspace);
      const { tasks, nextCursor, hasMore } = response.data.data;
      set({
        tasks,
        nextCursor: nextCursor || null,
        hasMore: hasMore || false,
        ...(showLoading ? { isLoading: false, isFetching: false } : {}),
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch tasks';
      set({
        error: errorMessage,
        ...(showLoading ? { isLoading: false, isFetching: false } : {}),
      });
      toast.error(errorMessage);
    }
  },

  // Load more tasks (append next page)
  loadMoreTasks: async () => {
    const { nextCursor, hasMore, filters, isLoadingMore } = get();
    if (!hasMore || !nextCursor || isLoadingMore) return;

    const workspaceId = getWorkspaceId();
    if (!workspaceId) return;

    set({ isLoadingMore: true });

    try {
      const filtersWithPagination = {
        ...filters,
        workspace_id: workspaceId,
        cursor: nextCursor,
      };
      const response = await tasksAPI.getAll(filtersWithPagination);
      const { tasks: newTasks, nextCursor: newCursor, hasMore: moreAvailable } = response.data.data;

      set((state) => ({
        tasks: [...state.tasks, ...newTasks],
        nextCursor: newCursor || null,
        hasMore: moreAvailable || false,
        isLoadingMore: false,
      }));
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to load more tasks';
      set({ isLoadingMore: false });
      toast.error(errorMessage);
    }
  },

  // Create task (with workspace_id)
  createTask: async (taskData) => {
    const workspaceId = getWorkspaceId();

    if (!workspaceId) {
      toast.error('No workspace selected');
      return { success: false, error: 'No workspace selected' };
    }

    set({ isMutating: true });
    try {
      // Include workspace_id in task data
      const response = await tasksAPI.create({
        ...taskData,
        workspace_id: workspaceId,
      });
      const newTask = response.data.data.task;
      const taskTitle = newTask?.title || 'Task';

      set((state) => ({
        tasks: [...state.tasks, newTask],
        isMutating: false,
      }));

      analytics.track(EVENTS.TASK_CREATED);
      toast.success(`Created "${taskTitle}"`);
      return { success: true, task: newTask };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create task';
      set({ isMutating: false });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Update task (optimistic)
  updateTask: async (id, taskData) => {
    const prevTasks = get().tasks;
    const optimistic = buildOptimisticTaskData(taskData);

    // Bump generation counter for this task to handle rapid consecutive updates
    const gen = (get()._taskMutationGeneration[id] || 0) + 1;
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...optimistic } : task
      ),
      _taskMutationGeneration: { ...state._taskMutationGeneration, [id]: gen },
    }));

    try {
      const response = await tasksAPI.update(id, taskData);
      const updatedTask = response.data.data.task;
      const taskTitle =
        updatedTask?.title ||
        prevTasks.find((task) => task.id === id)?.title ||
        'Task';

      // Only reconcile if no newer mutation has fired for this task
      if (get()._taskMutationGeneration[id] === gen) {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updatedTask } : task
          ),
        }));
      }

      toast.success(`Updated "${taskTitle}"`);
      return { success: true, task: updatedTask };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update task';
      // Only rollback if no newer mutation has fired
      if (get()._taskMutationGeneration[id] === gen) {
        set({ tasks: prevTasks });
      }
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Update task position (drag & drop)
  updateTaskPosition: async (id, positionData) => {
    const prevTasks = get().tasks;

    // Optimistic update: move the task to new category/position immediately
    set((state) => {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return { isMutating: true };

      const newCategoryId = positionData.category_id;
      const newPosition = positionData.position;

      // Remove task from its current position
      let updatedTasks = state.tasks.filter((t) => t.id !== id);

      // Get tasks in the destination category, sorted by position
      const destTasks = updatedTasks
        .filter((t) => t.categoryId === newCategoryId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      // Insert the task at the new position and reassign positions
      const movedTask = { ...task, categoryId: newCategoryId, position: newPosition };
      destTasks.splice(newPosition, 0, movedTask);
      destTasks.forEach((t, i) => { t.position = i; });

      // Rebuild tasks array: keep other categories unchanged, replace dest category tasks
      const otherTasks = updatedTasks.filter((t) => t.categoryId !== newCategoryId);
      return { tasks: [...otherTasks, ...destTasks], isMutating: true };
    });

    try {
      await tasksAPI.updatePosition(id, positionData);
      // Background refetch to sync with server (positions of other tasks may have shifted)
      get().fetchTasks(get().filters, { showLoading: false });
      set({ isMutating: false });
      return { success: true };
    } catch (error) {
      // Revert on failure
      set({ tasks: prevTasks, isMutating: false });
      const errorMessage = error.response?.data?.message || 'Failed to update position';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Delete task (optimistic)
  deleteTask: async (id) => {
    const prevTasks = get().tasks;
    const taskTitle = prevTasks.find((task) => task.id === id)?.title || 'Task';

    // Immediately remove the task from the UI
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));

    try {
      await tasksAPI.delete(id);
      toast.success(`Deleted "${taskTitle}"`);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete task';
      // Rollback: task reappears
      set({ tasks: prevTasks });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Toggle task completion (optimistic)
  toggleComplete: async (task, categories = []) => {
    const prevTasks = get().tasks;
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';

    // Find the Completed category and To Do category
    const completedCategory = categories.find(c => c.name === 'Completed');
    const todoCategory = categories.find(c => c.name === 'To Do');

    // Determine the new category based on completion status
    let newCategoryId = task.categoryId;
    if (newStatus === 'completed' && completedCategory) {
      newCategoryId = completedCategory.id;
    } else if (newStatus === 'todo' && todoCategory) {
      newCategoryId = todoCategory.id;
    }

    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === task.id
          ? { ...t, status: newStatus, completedAt, categoryId: newCategoryId }
          : t
      ),
    }));

    try {
      const response = await tasksAPI.update(task.id, {
        status: newStatus,
        completed_at: completedAt,
        category_id: newCategoryId,
      });
      const updatedTask = response.data.data.task;

      // Reconcile with server response
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, ...updatedTask } : t
        ),
      }));

      const label = task?.title || 'Task';
      const completionMessage =
        newStatus === 'completed'
          ? `Marked "${label}" as completed`
          : `Marked "${label}" as incomplete`;
      toast.success(completionMessage);
      return { success: true, task: updatedTask };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update task';
      // Rollback
      set({ tasks: prevTasks });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Set filters
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  // Clear filters
  clearFilters: () => {
    set({
      filters: {
        category_id: null,
        assignee_ids: [], // Changed from assignee_id to support multiple assignees
        status: null,
        priority: null,
        search: '',
      },
    });
  },

  // Clear tasks (used when switching workspaces)
  clearTasks: () => {
    set({
      tasks: [],
      nextCursor: null,
      hasMore: false,
      error: null,
    });
  },
}));

export default useTaskStore;
