import { useState, useMemo, useRef, useEffect } from 'react';

const DEFAULT_FILTERS = {
  assignees: [],
  priorities: [],
  categories: [],
  hideCompleted: false,
};

/**
 * Shared hook for task filtering logic.
 * Replaces duplicated filter logic in TaskList and ListView.
 */
export function useTaskFilters(tasks, { debounceSearch = false } = {}) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const searchDebounceRef = useRef(null);

  // Debounce search when enabled (used in board view)
  useEffect(() => {
    if (!debounceSearch) {
      setSearchQuery(searchInput);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchInput, debounceSearch]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = searchQuery.trim() === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAssignee = filters.assignees.length === 0 ||
        (task.assignees || []).some(assignee => filters.assignees.includes(assignee.id));

      const matchesPriority = filters.priorities.length === 0 ||
        filters.priorities.includes(task.priority);

      const matchesCategory = filters.categories.length === 0 ||
        filters.categories.includes(task.categoryId);

      const matchesCompleted = !filters.hideCompleted ||
        task.status !== 'completed';

      return matchesSearch && matchesAssignee && matchesPriority && matchesCategory && matchesCompleted;
    });
  }, [tasks, searchQuery, filters]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(searchInput.trim() || searchQuery.trim()) ||
      filters.assignees.length > 0 ||
      filters.priorities.length > 0 ||
      filters.categories.length > 0 ||
      filters.hideCompleted;
  }, [searchInput, searchQuery, filters]);

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const clearSearchAndFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setFilters(DEFAULT_FILTERS);
  };

  return {
    searchInput,
    setSearchInput,
    searchQuery,
    filters,
    setFilters,
    filteredTasks,
    hasActiveFilters,
    clearSearch,
    clearSearchAndFilters,
  };
}

export default useTaskFilters;
