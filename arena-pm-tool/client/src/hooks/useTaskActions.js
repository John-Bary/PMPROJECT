import { useState, useCallback } from 'react';
import useTaskStore from '../store/taskStore';
import useCategoryStore from '../store/categoryStore';

/**
 * Shared hook for task completion toggling.
 * Replaces duplicated toggle-complete logic in TaskList, ListView, and TaskDetailModal.
 */
export function useTaskActions() {
  const { toggleComplete } = useTaskStore();
  const { categories } = useCategoryStore();
  const [togglingTaskIds, setTogglingTaskIds] = useState(new Set());

  const handleToggleComplete = useCallback(async (task) => {
    if (togglingTaskIds.has(task.id)) return;
    setTogglingTaskIds((prev) => {
      const next = new Set(prev);
      next.add(task.id);
      return next;
    });

    try {
      await toggleComplete(task, categories);
    } finally {
      setTogglingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }, [toggleComplete, categories, togglingTaskIds]);

  const isToggling = useCallback((taskId) => {
    return togglingTaskIds.has(taskId);
  }, [togglingTaskIds]);

  return {
    handleToggleComplete,
    togglingTaskIds,
    isToggling,
  };
}

export default useTaskActions;
