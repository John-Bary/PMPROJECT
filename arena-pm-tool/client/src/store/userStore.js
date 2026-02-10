// User State Management with Zustand
import { create } from 'zustand';
import { workspacesAPI } from '../utils/api';
import { toast } from 'sonner';

const useUserStore = create((set, get) => ({
  users: [],
  currentWorkspaceId: null,
  isLoading: false,
  error: null,

  // Fetch users for a specific workspace (only workspace members)
  fetchUsers: async (workspaceId) => {
    if (!workspaceId) {
      set({ users: [], isLoading: false });
      return;
    }

    // Skip if already loaded for this workspace
    const { currentWorkspaceId, users } = get();
    if (currentWorkspaceId === workspaceId && users.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await workspacesAPI.getUsers(workspaceId);
      set({
        users: response.data.data.users,
        currentWorkspaceId: workspaceId,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch workspace users';
      set({
        error: errorMessage,
        isLoading: false,
      });
      toast.error(errorMessage);
    }
  },

  // Force refresh users for a workspace
  refreshUsers: async (workspaceId) => {
    if (!workspaceId) {
      set({ users: [], isLoading: false });
      return;
    }

    set({ isLoading: true, error: null, currentWorkspaceId: null });
    try {
      const response = await workspacesAPI.getUsers(workspaceId);
      set({
        users: response.data.data.users,
        currentWorkspaceId: workspaceId,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch workspace users';
      set({
        error: errorMessage,
        isLoading: false,
      });
      toast.error(errorMessage);
    }
  },

  // Clear users (on workspace switch or logout)
  clearUsers: () => {
    set({ users: [], currentWorkspaceId: null, isLoading: false, error: null });
  },
}));

export default useUserStore;
