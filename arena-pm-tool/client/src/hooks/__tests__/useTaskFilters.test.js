import { renderHook, act } from '@testing-library/react';
import { useTaskFilters } from '../useTaskFilters';

const mockTasks = [
  { id: 1, title: 'Build login page', description: 'Auth UI', status: 'todo', priority: 'high', categoryId: 10, assignees: [{ id: 1, name: 'Alice' }] },
  { id: 2, title: 'Fix navbar bug', description: null, status: 'in_progress', priority: 'medium', categoryId: 20, assignees: [{ id: 2, name: 'Bob' }] },
  { id: 3, title: 'Write tests', description: 'Unit tests for hooks', status: 'completed', priority: 'low', categoryId: 10, assignees: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] },
  { id: 4, title: 'Deploy to production', description: 'Final deploy', status: 'todo', priority: 'urgent', categoryId: 30, assignees: [] },
];

describe('useTaskFilters', () => {
  it('should return all tasks when no filters are active', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks));
    expect(result.current.filteredTasks).toHaveLength(4);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  describe('search', () => {
    it('should filter by title (case-insensitive)', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setSearchInput('login');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].id).toBe(1);
    });

    it('should filter by description', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setSearchInput('unit tests');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].id).toBe(3);
    });

    it('should handle tasks with null description', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setSearchInput('navbar');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].id).toBe(2);
    });

    it('should return empty when search matches nothing', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setSearchInput('nonexistent');
      });

      expect(result.current.filteredTasks).toHaveLength(0);
    });

    it('should clear search', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setSearchInput('login');
      });
      expect(result.current.filteredTasks).toHaveLength(1);

      act(() => {
        result.current.clearSearch();
      });
      expect(result.current.filteredTasks).toHaveLength(4);
      expect(result.current.searchInput).toBe('');
    });
  });

  describe('assignee filter', () => {
    it('should filter by single assignee', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setFilters(prev => ({ ...prev, assignees: [1] }));
      });

      expect(result.current.filteredTasks).toHaveLength(2);
      expect(result.current.filteredTasks.map(t => t.id)).toEqual([1, 3]);
    });

    it('should filter by multiple assignees (OR logic)', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setFilters(prev => ({ ...prev, assignees: [1, 2] }));
      });

      expect(result.current.filteredTasks).toHaveLength(3);
    });
  });

  describe('priority filter', () => {
    it('should filter by priority', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setFilters(prev => ({ ...prev, priorities: ['high'] }));
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].id).toBe(1);
    });

    it('should filter by multiple priorities', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setFilters(prev => ({ ...prev, priorities: ['high', 'urgent'] }));
      });

      expect(result.current.filteredTasks).toHaveLength(2);
    });
  });

  describe('category filter', () => {
    it('should filter by category', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setFilters(prev => ({ ...prev, categories: [10] }));
      });

      expect(result.current.filteredTasks).toHaveLength(2);
      expect(result.current.filteredTasks.map(t => t.id)).toEqual([1, 3]);
    });
  });

  describe('hide completed filter', () => {
    it('should hide completed tasks', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setFilters(prev => ({ ...prev, hideCompleted: true }));
      });

      expect(result.current.filteredTasks).toHaveLength(3);
      expect(result.current.filteredTasks.find(t => t.status === 'completed')).toBeUndefined();
    });
  });

  describe('combined filters', () => {
    it('should combine search with priority filter', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setSearchInput('build');
        result.current.setFilters(prev => ({ ...prev, priorities: ['high'] }));
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].id).toBe(1);
    });

    it('should return empty when combined filters match nothing', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setFilters(prev => ({ ...prev, priorities: ['urgent'], categories: [10] }));
      });

      expect(result.current.filteredTasks).toHaveLength(0);
    });
  });

  describe('hasActiveFilters', () => {
    it('should be true when search is active', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setSearchInput('test');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be true when any filter is set', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setFilters(prev => ({ ...prev, hideCompleted: true }));
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should be false after clearing all', () => {
      const { result } = renderHook(() => useTaskFilters(mockTasks));

      act(() => {
        result.current.setSearchInput('test');
        result.current.setFilters(prev => ({ ...prev, priorities: ['high'] }));
      });
      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.clearSearchAndFilters();
      });
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.filteredTasks).toHaveLength(4);
    });
  });

  describe('empty tasks', () => {
    it('should handle empty task array', () => {
      const { result } = renderHook(() => useTaskFilters([]));
      expect(result.current.filteredTasks).toHaveLength(0);
    });
  });
});
