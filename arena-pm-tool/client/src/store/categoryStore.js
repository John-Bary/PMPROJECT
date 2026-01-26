// Category State Management with Zustand
import { create } from 'zustand';
import { categoriesAPI } from '../utils/api';
import toast from 'react-hot-toast';

const useCategoryStore = create((set, get) => ({
  categories: [],
  isLoading: false,
  isFetching: false,
  isMutating: false,
  error: null,

  // Fetch all categories
  fetchCategories: async () => {
    set({ isLoading: true, isFetching: true, error: null });
    try {
      const response = await categoriesAPI.getAll();
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

  // Create category
  createCategory: async (categoryData) => {
    set({ isMutating: true });
    try {
      const response = await categoriesAPI.create(categoryData);
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
}));

export default useCategoryStore;
