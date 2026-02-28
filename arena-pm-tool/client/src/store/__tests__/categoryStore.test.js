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
    reorder: jest.fn(),
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
      isLoadingMore: false,
      error: null,
      nextCursor: null,
      hasMore: false,
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

    it('should bail early when no workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      await act(async () => {
        await useCategoryStore.getState().fetchCategories();
      });

      expect(categoriesAPI.getAll).not.toHaveBeenCalled();
      expect(useCategoryStore.getState().categories).toEqual([]);
    });

    it('should use default error message when response has no message', async () => {
      categoriesAPI.getAll.mockRejectedValue(new Error('connection failed'));

      await act(async () => {
        await useCategoryStore.getState().fetchCategories();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to fetch categories');
      expect(useCategoryStore.getState().error).toBe('Failed to fetch categories');
    });
  });

  describe('loadMoreCategories', () => {
    it('should append next page of categories', async () => {
      useCategoryStore.setState({
        categories: [{ id: 1, name: 'Existing', color: '#3B82F6' }],
        nextCursor: 'cursor-abc',
        hasMore: true,
      });

      const newCategories = [{ id: 2, name: 'Page 2', color: '#10B981' }];
      categoriesAPI.getAll.mockResolvedValue({
        data: { data: { categories: newCategories, nextCursor: 'cursor-def', hasMore: true } }
      });

      await act(async () => {
        await useCategoryStore.getState().loadMoreCategories();
      });

      const state = useCategoryStore.getState();
      expect(state.categories).toHaveLength(2);
      expect(state.categories[1].name).toBe('Page 2');
      expect(state.nextCursor).toBe('cursor-def');
      expect(state.hasMore).toBe(true);
      expect(state.isLoadingMore).toBe(false);
    });

    it('should not fetch when hasMore is false', async () => {
      useCategoryStore.setState({ hasMore: false, nextCursor: 'cursor-abc' });

      await act(async () => {
        await useCategoryStore.getState().loadMoreCategories();
      });

      expect(categoriesAPI.getAll).not.toHaveBeenCalled();
    });

    it('should not fetch when nextCursor is null', async () => {
      useCategoryStore.setState({ hasMore: true, nextCursor: null });

      await act(async () => {
        await useCategoryStore.getState().loadMoreCategories();
      });

      expect(categoriesAPI.getAll).not.toHaveBeenCalled();
    });

    it('should not fetch when already loading more', async () => {
      useCategoryStore.setState({ hasMore: true, nextCursor: 'cursor-abc', isLoadingMore: true });

      await act(async () => {
        await useCategoryStore.getState().loadMoreCategories();
      });

      expect(categoriesAPI.getAll).not.toHaveBeenCalled();
    });

    it('should not fetch when no workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });
      useCategoryStore.setState({ hasMore: true, nextCursor: 'cursor-abc' });

      await act(async () => {
        await useCategoryStore.getState().loadMoreCategories();
      });

      expect(categoriesAPI.getAll).not.toHaveBeenCalled();
    });

    it('should handle load more error', async () => {
      useCategoryStore.setState({
        categories: [{ id: 1, name: 'Existing' }],
        nextCursor: 'cursor-abc',
        hasMore: true,
      });

      categoriesAPI.getAll.mockRejectedValue({
        response: { data: { message: 'Pagination failed' } }
      });

      await act(async () => {
        await useCategoryStore.getState().loadMoreCategories();
      });

      expect(toast.error).toHaveBeenCalledWith('Pagination failed');
      expect(useCategoryStore.getState().isLoadingMore).toBe(false);
    });

    it('should use default error message when load more fails without message', async () => {
      useCategoryStore.setState({
        categories: [{ id: 1, name: 'Existing' }],
        nextCursor: 'cursor-abc',
        hasMore: true,
      });

      categoriesAPI.getAll.mockRejectedValue(new Error('timeout'));

      await act(async () => {
        await useCategoryStore.getState().loadMoreCategories();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to load more categories');
    });

    it('should handle null nextCursor and hasMore in response', async () => {
      useCategoryStore.setState({
        categories: [{ id: 1, name: 'Existing', color: '#3B82F6' }],
        nextCursor: 'cursor-abc',
        hasMore: true,
      });

      const newCategories = [{ id: 2, name: 'Last Page', color: '#10B981' }];
      categoriesAPI.getAll.mockResolvedValue({
        data: { data: { categories: newCategories, nextCursor: null, hasMore: false } }
      });

      await act(async () => {
        await useCategoryStore.getState().loadMoreCategories();
      });

      const state = useCategoryStore.getState();
      expect(state.categories).toHaveLength(2);
      expect(state.nextCursor).toBeNull();
      expect(state.hasMore).toBe(false);
    });

    it('should handle undefined nextCursor and hasMore in response', async () => {
      useCategoryStore.setState({
        categories: [{ id: 1, name: 'Existing', color: '#3B82F6' }],
        nextCursor: 'cursor-abc',
        hasMore: true,
      });

      const newCategories = [{ id: 2, name: 'Last Page', color: '#10B981' }];
      categoriesAPI.getAll.mockResolvedValue({
        data: { data: { categories: newCategories } }
      });

      await act(async () => {
        await useCategoryStore.getState().loadMoreCategories();
      });

      const state = useCategoryStore.getState();
      expect(state.nextCursor).toBeNull();
      expect(state.hasMore).toBe(false);
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

    it('should return error when no workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      let result;
      await act(async () => {
        result = await useCategoryStore.getState().createCategory({ name: 'Test' });
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No workspace selected');
      expect(toast.error).toHaveBeenCalledWith('No workspace selected');
      expect(categoriesAPI.create).not.toHaveBeenCalled();
    });

    it('should handle create error from API', async () => {
      categoriesAPI.create.mockRejectedValue({
        response: { data: { message: 'Duplicate name' } }
      });

      let result;
      await act(async () => {
        result = await useCategoryStore.getState().createCategory({ name: 'Duplicate' });
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Duplicate name');
      expect(toast.error).toHaveBeenCalledWith('Duplicate name');
      expect(useCategoryStore.getState().isMutating).toBe(false);
    });

    it('should use default error message when create fails without message', async () => {
      categoriesAPI.create.mockRejectedValue(new Error('network error'));

      let result;
      await act(async () => {
        result = await useCategoryStore.getState().createCategory({ name: 'Test' });
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create category');
      expect(toast.error).toHaveBeenCalledWith('Failed to create category');
    });

    it('should use fallback name when category response has no name', async () => {
      const newCategory = { id: 5, color: '#EF4444' };
      categoriesAPI.create.mockResolvedValue({
        data: { data: { category: newCategory } }
      });

      await act(async () => {
        const result = await useCategoryStore.getState().createCategory({ color: '#EF4444' });
        expect(result.success).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Category "Category" created');
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

    it('should fall back to existing category name when response has no name', async () => {
      useCategoryStore.setState({
        categories: [
          { id: 1, name: 'Existing Name', color: '#3B82F6' },
        ],
      });

      // Response category without a name field
      const updatedCategory = { id: 1, color: '#EF4444' };
      categoriesAPI.update.mockResolvedValue({
        data: { data: { category: updatedCategory } }
      });

      await act(async () => {
        await useCategoryStore.getState().updateCategory(1, { color: '#EF4444' });
      });

      expect(toast.success).toHaveBeenCalledWith('Category "Existing Name" updated');
    });

    it('should handle update error from API', async () => {
      useCategoryStore.setState({
        categories: [{ id: 1, name: 'Test', color: '#3B82F6' }],
      });

      categoriesAPI.update.mockRejectedValue({
        response: { data: { message: 'Validation error' } }
      });

      let result;
      await act(async () => {
        result = await useCategoryStore.getState().updateCategory(1, { name: '' });
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation error');
      expect(toast.error).toHaveBeenCalledWith('Validation error');
      expect(useCategoryStore.getState().isMutating).toBe(false);
    });

    it('should use default error message when update fails without message', async () => {
      useCategoryStore.setState({
        categories: [{ id: 1, name: 'Test', color: '#3B82F6' }],
      });

      categoriesAPI.update.mockRejectedValue(new Error('timeout'));

      let result;
      await act(async () => {
        result = await useCategoryStore.getState().updateCategory(1, { name: 'X' });
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update category');
      expect(toast.error).toHaveBeenCalledWith('Failed to update category');
    });

    it('should use "Category" fallback when both response and state lack name', async () => {
      useCategoryStore.setState({
        categories: [],
      });

      const updatedCategory = { id: 999, color: '#EF4444' };
      categoriesAPI.update.mockResolvedValue({
        data: { data: { category: updatedCategory } }
      });

      await act(async () => {
        await useCategoryStore.getState().updateCategory(999, { color: '#EF4444' });
      });

      expect(toast.success).toHaveBeenCalledWith('Category "Category" updated');
    });
  });

  describe('reorderCategories', () => {
    it('should optimistically reorder and update with server response', async () => {
      useCategoryStore.setState({
        categories: [
          { id: 1, name: 'First', position: 0 },
          { id: 2, name: 'Second', position: 1 },
          { id: 3, name: 'Third', position: 2 },
        ],
      });

      const serverCategories = [
        { id: 3, name: 'Third', position: 0 },
        { id: 1, name: 'First', position: 1 },
        { id: 2, name: 'Second', position: 2 },
      ];
      categoriesAPI.reorder.mockResolvedValue({
        data: { data: { categories: serverCategories } }
      });

      let result;
      await act(async () => {
        result = await useCategoryStore.getState().reorderCategories([3, 1, 2]);
      });

      expect(result.success).toBe(true);
      expect(useCategoryStore.getState().categories).toEqual(serverCategories);
    });

    it('should rollback on error', async () => {
      const originalCategories = [
        { id: 1, name: 'First', position: 0 },
        { id: 2, name: 'Second', position: 1 },
      ];
      useCategoryStore.setState({ categories: originalCategories });

      categoriesAPI.reorder.mockRejectedValue({
        response: { data: { message: 'Reorder failed' } }
      });

      let result;
      await act(async () => {
        result = await useCategoryStore.getState().reorderCategories([2, 1]);
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reorder failed');
      expect(toast.error).toHaveBeenCalledWith('Reorder failed');
      // Should rollback to original categories
      expect(useCategoryStore.getState().categories).toEqual(originalCategories);
    });

    it('should use default error message when reorder fails without message', async () => {
      const originalCategories = [
        { id: 1, name: 'A', position: 0 },
        { id: 2, name: 'B', position: 1 },
      ];
      useCategoryStore.setState({ categories: originalCategories });

      categoriesAPI.reorder.mockRejectedValue(new Error('server error'));

      let result;
      await act(async () => {
        result = await useCategoryStore.getState().reorderCategories([2, 1]);
      });

      expect(result.error).toBe('Failed to reorder categories');
      expect(toast.error).toHaveBeenCalledWith('Failed to reorder categories');
      expect(useCategoryStore.getState().categories).toEqual(originalCategories);
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

    it('should handle delete error from API', async () => {
      useCategoryStore.setState({
        categories: [{ id: 1, name: 'Protected' }],
      });

      categoriesAPI.delete.mockRejectedValue({
        response: { data: { message: 'Category has tasks' } }
      });

      let result;
      await act(async () => {
        result = await useCategoryStore.getState().deleteCategory(1);
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Category has tasks');
      expect(toast.error).toHaveBeenCalledWith('Category has tasks');
      expect(useCategoryStore.getState().isMutating).toBe(false);
      // Category should still be in the array
      expect(useCategoryStore.getState().categories).toHaveLength(1);
    });

    it('should use default error message when delete fails without message', async () => {
      useCategoryStore.setState({
        categories: [{ id: 1, name: 'Test' }],
      });

      categoriesAPI.delete.mockRejectedValue(new Error('network error'));

      let result;
      await act(async () => {
        result = await useCategoryStore.getState().deleteCategory(1);
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete category');
      expect(toast.error).toHaveBeenCalledWith('Failed to delete category');
    });

    it('should use fallback name when category is not found in state', async () => {
      useCategoryStore.setState({ categories: [] });
      categoriesAPI.delete.mockResolvedValue({});

      await act(async () => {
        await useCategoryStore.getState().deleteCategory(999);
      });

      expect(toast.success).toHaveBeenCalledWith('Category "Category" deleted');
    });
  });

  describe('clearCategories', () => {
    it('should reset categories and pagination state', () => {
      useCategoryStore.setState({
        categories: [{ id: 1, name: 'Test' }],
        nextCursor: 'cursor-123',
        hasMore: true,
        error: 'some error',
      });

      act(() => {
        useCategoryStore.getState().clearCategories();
      });

      const state = useCategoryStore.getState();
      expect(state.categories).toEqual([]);
      expect(state.nextCursor).toBeNull();
      expect(state.hasMore).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
