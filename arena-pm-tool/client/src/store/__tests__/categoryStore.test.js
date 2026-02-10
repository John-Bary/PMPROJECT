import { act } from 'react';
import useCategoryStore from '../categoryStore';
import useWorkspaceStore from '../workspaceStore';
import { categoriesAPI } from '../../utils/api';
import { toast } from 'sonner';

// Mock the API module
jest.mock('../../utils/api', () => ({
  categoriesAPI: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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

describe('Category Store', () => {
  beforeEach(() => {
    // Set workspace ID so store operations don't bail early
    useWorkspaceStore.setState({ currentWorkspaceId: 'test-workspace-id' });
    // Reset store to initial state
    useCategoryStore.setState({
      categories: [],
      isLoading: false,
      isFetching: false,
      isMutating: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('fetchCategories', () => {
    it('should update categories array on success', async () => {
      const mockCategories = [
        { id: 1, name: 'Category 1', color: '#3B82F6' },
        { id: 2, name: 'Category 2', color: '#10B981' },
      ];
      categoriesAPI.getAll.mockResolvedValue({
        data: { data: { categories: mockCategories } }
      });

      await act(async () => {
        await useCategoryStore.getState().fetchCategories();
      });

      const state = useCategoryStore.getState();
      expect(state.categories).toEqual(mockCategories);
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      categoriesAPI.getAll.mockRejectedValue({
        response: { data: { message: 'Network error' } }
      });

      await act(async () => {
        await useCategoryStore.getState().fetchCategories();
      });

      expect(toast.error).toHaveBeenCalledWith('Network error');
    });
  });

  describe('createCategory', () => {
    it('should append category to array and show toast', async () => {
      const newCategory = { id: 1, name: 'New Category', color: '#3B82F6' };
      categoriesAPI.create.mockResolvedValue({
        data: { data: { category: newCategory } }
      });

      await act(async () => {
        const result = await useCategoryStore.getState().createCategory({ name: 'New Category' });
        expect(result.success).toBe(true);
      });

      expect(useCategoryStore.getState().categories).toContainEqual(newCategory);
      expect(toast.success).toHaveBeenCalledWith('Category "New Category" created');
    });
  });

  describe('updateCategory', () => {
    it('should update category by id', async () => {
      useCategoryStore.setState({
        categories: [
          { id: 1, name: 'Old Name', color: '#3B82F6' },
          { id: 2, name: 'Other', color: '#10B981' },
        ],
      });

      const updatedCategory = { id: 1, name: 'New Name', color: '#3B82F6' };
      categoriesAPI.update.mockResolvedValue({
        data: { data: { category: updatedCategory } }
      });

      await act(async () => {
        await useCategoryStore.getState().updateCategory(1, { name: 'New Name' });
      });

      const category = useCategoryStore.getState().categories.find(c => c.id === 1);
      expect(category.name).toBe('New Name');
      expect(toast.success).toHaveBeenCalledWith('Category "New Name" updated');
    });
  });

  describe('deleteCategory', () => {
    it('should remove category from array', async () => {
      useCategoryStore.setState({
        categories: [
          { id: 1, name: 'To Delete' },
          { id: 2, name: 'Keep' },
        ],
      });
      categoriesAPI.delete.mockResolvedValue({});

      await act(async () => {
        await useCategoryStore.getState().deleteCategory(1);
      });

      const categories = useCategoryStore.getState().categories;
      expect(categories).toHaveLength(1);
      expect(categories.find(c => c.id === 1)).toBeUndefined();
      expect(toast.success).toHaveBeenCalledWith('Category "To Delete" deleted');
    });
  });
});
