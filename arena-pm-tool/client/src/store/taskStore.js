// Task State Management with Zustand
import { create } from 'zustand';
import { tasksAPI } from '../utils/api';
import toast from 'react-hot-toast';
import useWorkspaceStore from './workspaceStore';

// Helper to get current workspace ID
const getWorkspaceId = () => useWorkspaceStore.getState().currentWorkspaceId;

const useTaskStore = create((set, get) => ({
  tasks: [],
  isLoading: false,
  isFetching: false,
  isMutating: false,
  error: null,
  filters: {
    category_id: null,
    assignee_ids: [], // Changed from assignee_id to support multiple assignees
    status: null,
    priority: null,
    search: '',
  },

  // Fetch all tasks (filtered by workspace_id)
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
      set({
        tasks: response.data.data.tasks,
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

      toast.success(`Created "${taskTitle}"`);
      return { success: true, task: newTask };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create task';
      set({ isMutating: false });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Update task
  updateTask: async (id, taskData) => {
    set({ isMutating: true });
    try {
      const response = await tasksAPI.update(id, taskData);
      const updatedTask = response.data.data.task;
      const taskTitle =
        updatedTask?.title ||
        get().tasks.find((task) => task.id === id)?.title ||
        'Task';

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...updatedTask } : task
        ),
        isMutating: false,
      }));

      toast.success(`Updated "${taskTitle}"`);
      return { success: true, task: updatedTask };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update task';
      set({ isMutating: false });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Update task position (drag & drop)
  updateTaskPosition: async (id, positionData) => {
    set({ isMutating: true });
    try {
      await tasksAPI.updatePosition(id, positionData);
      // Refetch tasks to get updated positions
      await get().fetchTasks(get().filters, { showLoading: false });
      set({ isMutating: false });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update position';
      set({ isMutating: false });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Delete task
  deleteTask: async (id) => {
    set({ isMutating: true });
    const taskTitle = get().tasks.find((task) => task.id === id)?.title || 'Task';
    try {
      await tasksAPI.delete(id);

      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
        isMutating: false,
      }));

      toast.success(`Deleted "${taskTitle}"`);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete task';
      set({ isMutating: false });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Toggle task completion
  toggleComplete: async (task, categories = []) => {
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

    set({ isMutating: true });
    try {
      const response = await tasksAPI.update(task.id, {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        category_id: newCategoryId,
      });
      const updatedTask = response.data.data.task;

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id ? { ...t, ...updatedTask } : t
        ),
        isMutating: false,
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
      set({ isMutating: false });
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
      error: null,
    });
  },
}));

export default useTaskStore;
