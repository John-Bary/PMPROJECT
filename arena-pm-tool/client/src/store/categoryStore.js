// Category State Management with Zustand
import { create } from 'zustand';
import { categoriesAPI } from '../utils/api';
import toast from 'react-hot-toast';
import useWorkspaceStore from './workspaceStore';

// Helper to get current workspace ID
const getWorkspaceId = () => useWorkspaceStore.getState().currentWorkspaceId;

const useCategoryStore = create((set, get) => ({
  categories: [],
  isLoading: false,
  isFetching: false,
  isMutating: false,
  error: null,

  // Fetch all categories (filtered by workspace_id)
  fetchCategories: async () => {
    const workspaceId = getWorkspaceId();

    // Don't fetch if no workspace is selected - avoids "workspace_id is required" errors
    if (!workspaceId) {
      return;
    }

    set({ isLoading: true, isFetching: true, error: null });
    try {
      // Include workspace_id in query params
      const params = { workspace_id: workspaceId };
      const response = await categoriesAPI.getAll(params);
      set({
        categories: response.data.data.categories,
        isLoading: false,
        isFetching: false,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch categories';
      set({
        error: errorMessage,
        isLoading: false,
        isFetching: false,
      });
      toast.error(errorMessage);
    }
  },

  // Create category (with workspace_id)
  createCategory: async (categoryData) => {
    const workspaceId = getWorkspaceId();

    if (!workspaceId) {
      toast.error('No workspace selected');
      return { success: false, error: 'No workspace selected' };
    }

    set({ isMutating: true });
    try {
      // Include workspace_id in category data
      const response = await categoriesAPI.create({
        ...categoryData,
        workspace_id: workspaceId,
      });
      const newCategory = response.data.data.category;
      const categoryName = newCategory?.name || 'Category';

      set((state) => ({
        categories: [...state.categories, newCategory],
        isMutating: false,
      }));

      toast.success(`Category "${categoryName}" created`);
      return { success: true, category: newCategory };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create category';
      set({ isMutating: false });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Update category
  updateCategory: async (id, categoryData) => {
    set({ isMutating: true });
    try {
      const response = await categoriesAPI.update(id, categoryData);
      const updatedCategory = response.data.data.category;
      const categoryName =
        updatedCategory?.name ||
        get().categories.find((cat) => cat.id === id)?.name ||
        'Category';

      set((state) => ({
        categories: state.categories.map((cat) =>
          cat.id === id ? { ...cat, ...updatedCategory } : cat
        ),
        isMutating: false,
      }));

      toast.success(`Category "${categoryName}" updated`);
      return { success: true, category: updatedCategory };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update category';
      set({ isMutating: false });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Reorder categories (with optimistic update)
  reorderCategories: async (categoryIds) => {
    const previousCategories = get().categories;

    // Optimistic update - reorder categories locally first
    const reorderedCategories = categoryIds.map((id, index) => {
      const category = previousCategories.find(c => c.id === id);
      return { ...category, position: index };
    });

    set({ categories: reorderedCategories });

    try {
      const response = await categoriesAPI.reorder(categoryIds);
      // Update with server response to ensure consistency
      set({ categories: response.data.data.categories });
      return { success: true };
    } catch (error) {
      // Rollback on error
      set({ categories: previousCategories });
      const errorMessage = error.response?.data?.message || 'Failed to reorder categories';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Delete category
  deleteCategory: async (id) => {
    set({ isMutating: true });
    const categoryName =
      get().categories.find((cat) => cat.id === id)?.name || 'Category';
    try {
      await categoriesAPI.delete(id);

      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
        isMutating: false,
      }));

      toast.success(`Category "${categoryName}" deleted`);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete category';
      set({ isMutating: false });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Clear categories (used when switching workspaces)
  clearCategories: () => {
    set({
      categories: [],
      error: null,
    });
  },
}));

export default useCategoryStore;
