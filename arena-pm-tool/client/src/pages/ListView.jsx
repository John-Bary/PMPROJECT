import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Search,
  X,
  Plus,
  ChevronRight,
  ChevronDown,
  Calendar,
  Check,
  GripVertical,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import useTaskStore from '../store/taskStore';
import useCategoryStore from '../store/categoryStore';
import useUserStore from '../store/userStore';
import useWorkspaceStore from '../store/workspaceStore';
import FilterDropdown from '../components/FilterDropdown';
import TaskModal from '../components/TaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import DatePicker from '../components/DatePicker';
import AssigneeDropdown from '../components/AssigneeDropdown';
import { InlineSpinner, TaskRowSkeleton } from '../components/Loader';
import { toLocalDate, toUTCISOString, formatDueDate, isOverdue } from '../utils/dateUtils';
import { priorityPillStyles, priorityDotColors } from '../utils/priorityStyles';
import { useTaskActions } from '../hooks/useTaskActions';
import { useTaskFilters } from '../hooks/useTaskFilters';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from 'components/ui/alert-dialog';

function ListView() {
  const {
    tasks,
    fetchTasks,
    deleteTask,
    updateTask,
    updateTaskPosition,
    isLoading,
    isFetching,
    isMutating,
    hasMore,
    loadMoreTasks,
    isLoadingMore,
  } = useTaskStore();
  const { categories, fetchCategories, isLoading: isCategoriesLoading } = useCategoryStore();
  const { users, fetchUsers } = useUserStore();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [, setDefaultCategoryId] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState(null);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null); // { taskId, type }
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'dueDate', direction: 'asc' });
  const [priorityDropdownPos, setPriorityDropdownPos] = useState({ top: 0, left: 0 });
  const dropdownRefs = useRef({});
  const priorityPortalRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const PRIORITY_ORDER = useMemo(() => ({ urgent: 0, high: 1, medium: 2, low: 3 }), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const STATUS_ORDER = useMemo(() => ({ todo: 0, in_progress: 1, completed: 2 }), []);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Shared hooks for toggle complete and filtering
  const { handleToggleComplete, togglingTaskIds } = useTaskActions();
  const {
    searchInput: searchQuery,
    setSearchInput: setSearchQuery,
    filters,
    setFilters,
    filteredTasks,
    clearSearch,
  } = useTaskFilters(tasks);

  // Get the selected task from the tasks array to ensure it's always fresh
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  useEffect(() => {
    fetchTasks();
    fetchCategories();
    if (currentWorkspaceId) {
      fetchUsers(currentWorkspaceId);
    }
  }, [fetchTasks, fetchCategories, fetchUsers, currentWorkspaceId]);

  // Close open dropdown when clicking outside the active trigger/dropdown
  // Note: For 'assignee' type, the AssigneeDropdown component handles its own click-outside via portal
  useEffect(() => {
    if (!activeDropdown || activeDropdown.type === 'date' || activeDropdown.type === 'assignee') return;

    const handleClickOutside = (event) => {
      const triggerKey = `${activeDropdown.type}-${activeDropdown.taskId}`;
      const triggerEl = dropdownRefs.current[triggerKey];
      const clickedInsideTrigger = triggerEl?.contains(event.target);
      const clickedInsidePortal = priorityPortalRef.current?.contains(event.target);

      if (!clickedInsideTrigger && !clickedInsidePortal) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  // Update priority dropdown position
  const updatePriorityPosition = useCallback(() => {
    if (!activeDropdown || activeDropdown.type !== 'priority') return;
    const triggerEl = dropdownRefs.current[`priority-${activeDropdown.taskId}`];
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const dropdownHeight = 4 * 36 + 16;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= dropdownHeight
      ? rect.bottom + 4
      : rect.top - dropdownHeight - 4;
    setPriorityDropdownPos({
      top: Math.max(8, top),
      left: rect.left,
    });
  }, [activeDropdown]);

  useEffect(() => {
    if (!activeDropdown || activeDropdown.type !== 'priority') return;
    updatePriorityPosition();
    window.addEventListener('resize', updatePriorityPosition);
    window.addEventListener('scroll', updatePriorityPosition, true);
    return () => {
      window.removeEventListener('resize', updatePriorityPosition);
      window.removeEventListener('scroll', updatePriorityPosition, true);
    };
  }, [activeDropdown, updatePriorityPosition]);

  const handleOpenDetail = (task) => {
    setSelectedTaskId(task.id);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedTaskId(null);
  };

  const handleEdit = (task) => {
    setDefaultCategoryId(null);
    setParentTaskForSubtask(null);
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = (task) => {
    setDeletingTask(task);
  };

  const confirmDelete = async () => {
    if (deletingTask) {
      const id = deletingTask.id;
      setDeletingTask(null);
      await deleteTask(id);
    }
  };

  const cancelDelete = () => {
    setDeletingTask(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setParentTaskForSubtask(null);
    setDefaultCategoryId(null);
    setActiveDropdown(null);
  };

  const handleAddSubtask = (parentTask) => {
    setDefaultCategoryId(null);
    setParentTaskForSubtask(parentTask);
    setEditingTask(null);
    setIsModalOpen(true);
  };


  /**
   * Handle drag-and-drop reordering of tasks and subtasks.
   * Supports:
   * - Moving parent tasks within a category (reorder)
   * - Moving parent tasks between categories
   * - Reordering subtasks within the same parent
   */
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Early exit: no drop target or same exact position
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const sourceCategoryId = parseInt(source.droppableId, 10);
    const destCategoryId = parseInt(destination.droppableId, 10);
    const isSubtask = draggableId.startsWith('subtask-');
    const taskId = parseInt(draggableId.replace('subtask-', '').replace('task-', ''), 10);

    // --- Cross-category move (parent tasks only) ---
    if (sourceCategoryId !== destCategoryId) {
      if (isSubtask) return; // Subtasks cannot move across categories

      // Build the destination category's flat rows to find the correct parent-task position
      const destSortedParents = tasksByCategory[destCategoryId] || [];
      const destRows = [];
      destSortedParents.forEach((parent) => {
        destRows.push({ task: parent, isSubtask: false });
        if (expandedTasks[parent.id]) {
          const subs = getSubtasks(parent.id);
          subs.forEach((sub) => destRows.push({ task: sub, isSubtask: true }));
        }
      });

      // Map the visual drop index to a parent-task position
      const destRow = destRows[destination.index];
      let position;
      if (!destRow) {
        // Dropped past the last item — append to end
        position = destSortedParents.length;
      } else if (destRow.isSubtask) {
        // Dropped onto a subtask row — place after its parent in parent order
        const parentOfSub = destSortedParents.find(p => p.id === destRow.task.parentTaskId);
        position = parentOfSub
          ? destSortedParents.indexOf(parentOfSub) + 1
          : destSortedParents.length;
      } else {
        position = destSortedParents.indexOf(destRow.task);
        if (position === -1) position = destSortedParents.length;
      }

      await updateTaskPosition(taskId, { category_id: destCategoryId, position });
      return;
    }

    // --- Same-category operations ---
    // Use the sorted parent list that matches the rendered order
    const sortedParents = tasksByCategory[destCategoryId] || [];

    // Build flat list of visible rows matching what is rendered
    const buildCategoryRows = (parents) => {
      const rows = [];
      parents.forEach((parent) => {
        rows.push({ task: parent, isSubtask: false });
        if (expandedTasks[parent.id]) {
          const subs = getSubtasks(parent.id);
          subs.forEach((sub) => rows.push({ task: sub, isSubtask: true, parentId: parent.id }));
        }
      });
      return rows;
    };

    const categoryRows = buildCategoryRows(sortedParents);
    const sourceRow = categoryRows[source.index];
    const destRow = categoryRows[destination.index];
    if (!sourceRow || !destRow) return;

    // --- Parent task reorder within same category ---
    if (!isSubtask) {
      // Don't allow dropping a parent task onto a subtask row
      if (sourceRow.isSubtask || destRow.isSubtask) return;

      const newParentOrder = [...sortedParents];
      const fromIdx = newParentOrder.findIndex(t => t.id === taskId);
      const toIdx = newParentOrder.findIndex(t => t.id === destRow.task.id);
      if (fromIdx === -1 || toIdx === -1) return;

      const [moved] = newParentOrder.splice(fromIdx, 1);
      newParentOrder.splice(toIdx, 0, moved);

      await updateTaskPosition(taskId, { category_id: destCategoryId, position: toIdx });
      return;
    }

    // --- Subtask reorder within the same parent ---
    if (!sourceRow.isSubtask || !destRow.isSubtask) return;
    if (sourceRow.parentId !== destRow.parentId) return;

    const parentId = sourceRow.parentId;
    const siblings = getSubtasks(parentId);
    const draggedTask = tasks.find(t => t.id === taskId);
    if (!draggedTask) return;

    // Build reordered siblings list
    const fromSubIdx = siblings.findIndex(t => t.id === taskId);
    const toSubIdx = siblings.findIndex(t => t.id === destRow.task.id);
    if (fromSubIdx === -1 || toSubIdx === -1) return;

    const reorderedSiblings = [...siblings];
    const [movedSub] = reorderedSiblings.splice(fromSubIdx, 1);
    reorderedSiblings.splice(toSubIdx, 0, movedSub);

    // Find position within all category tasks
    const categoryTasksOrdered = tasks
      .filter(t => t.categoryId === destCategoryId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    let siblingCursor = 0;
    const newCategoryOrder = categoryTasksOrdered.map((task) => {
      if (task.parentTaskId === parentId) {
        const next = reorderedSiblings[siblingCursor];
        siblingCursor += 1;
        return next;
      }
      return task;
    });

    const newIndex = newCategoryOrder.findIndex(t => t.id === taskId);
    if (newIndex === -1) return;

    await updateTaskPosition(taskId, { category_id: destCategoryId, position: newIndex });
  };

  // Toggle task expansion to show/hide subtasks
  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Toggle category collapse
  const toggleCategoryCollapse = (categoryId) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Memoize getSubtasks
  const getSubtasks = useCallback((parentTaskId) => {
    return tasks.filter(task => task.parentTaskId === parentTaskId);
  }, [tasks]);

  const isTaskOverdue = useCallback((task) => isOverdue(task.dueDate, task.status), []);

  const sortTasks = useCallback((tasksToSort) => {
    return [...tasksToSort].sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.key) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'priority':
          comparison = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
          break;
        case 'assignee': {
          const aName = (a.assignees?.[0]?.name || '').toLowerCase();
          const bName = (b.assignees?.[0]?.name || '').toLowerCase();
          comparison = aName.localeCompare(bName);
          break;
        }
        case 'dueDate': {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = aDate - bDate;
          break;
        }
        case 'status':
          comparison = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
          break;
        default:
          comparison = 0;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [sortConfig, PRIORITY_ORDER, STATUS_ORDER]);

  // Memoize inline editing handlers
  const toggleDropdown = useCallback((taskId, dropdownType) => {
    setActiveDropdown(prev => {
      if (prev?.taskId === taskId && prev?.type === dropdownType) {
        return null;
      }
      return { taskId, type: dropdownType };
    });
  }, []);

  const closeDropdown = useCallback(() => {
    setActiveDropdown(null);
  }, []);

  const handlePrioritySelect = useCallback(async (taskId, priority) => {
    try {
      await updateTask(taskId, { priority });
      closeDropdown();
    } catch (error) {
      // Error is handled in taskStore
    }
  }, [updateTask, closeDropdown]);

  // Toggle assignee (add or remove) for a task
  const handleAssigneeToggle = useCallback(async (taskId, userId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const currentAssignees = task.assignees || [];
      const currentIds = currentAssignees.map(a => a.id);

      let newAssigneeIds;
      if (currentIds.includes(userId)) {
        newAssigneeIds = currentIds.filter(id => id !== userId);
      } else {
        newAssigneeIds = [...currentIds, userId];
      }

      await updateTask(taskId, { assignee_ids: newAssigneeIds });
    } catch (error) {
      // Error is handled in taskStore
    }
  }, [tasks, updateTask]);

  const handleDateSelect = useCallback(async (taskId, date) => {
    try {
      const formattedDate = toUTCISOString(date);
      await updateTask(taskId, { due_date: formattedDate });
      closeDropdown();
    } catch (error) {
      // Error is handled in taskStore
    }
  }, [updateTask, closeDropdown]);

  const priorities = ['low', 'medium', 'high', 'urgent'];

  // Inline quick-add
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const quickAddInputRef = useRef(null);
  const { createTask } = useTaskStore();

  const handleQuickAdd = async (e) => {
    if (e.key !== 'Enter') return;
    const title = quickAddTitle.trim();
    if (!title || !categories.length) return;

    setIsQuickAdding(true);
    try {
      await createTask({ title, category_id: categories[0].id, priority: 'medium' });
      setQuickAddTitle('');
    } finally {
      setIsQuickAdding(false);
      quickAddInputRef.current?.focus();
    }
  };

  // Memoize parent tasks from filtered tasks
  const parentTasks = useMemo(() =>
    filteredTasks.filter(task => !task.parentTaskId),
    [filteredTasks]
  );

  // Memoize group parent tasks by category (sorted)
  const tasksByCategory = useMemo(() =>
    categories.reduce((acc, category) => {
      acc[category.id] = sortTasks(parentTasks.filter(task => task.categoryId === category.id));
      return acc;
    }, {}),
    [categories, parentTasks, sortTasks]
  );

  // Memoize visible categories
  const visibleCategories = useMemo(() =>
    categories.filter(category => {
      const hasTasks = tasksByCategory[category.id]?.length > 0;
      const matchesFilter = filters.categories.length === 0 || filters.categories.includes(category.id);
      return hasTasks && matchesFilter;
    }),
    [categories, tasksByCategory, filters.categories]
  );

  const isLoadingData = isLoading || isFetching || isCategoriesLoading;
  const disableControls = isLoadingData;
  const disablePrimaryAction = isLoadingData || isMutating;

  return (
    <>
      {/* Header with Search, Filter and Add Task button */}
      <div className="mb-4 sm:mb-6">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-3 sm:mb-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
            {isLoadingData && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <InlineSpinner />
                <span className="hidden sm:inline">Loading tasks...</span>
              </div>
            )}
          </div>

          {/* Add Task Button — hidden on mobile (Dashboard mobile header has one) */}
          <Button
            onClick={() => setIsModalOpen(true)}
            disabled={disablePrimaryAction}
            className="hidden sm:inline-flex"
          >
            <Plus size={18} className="w-5 h-5" />
            <span>{isLoadingData ? 'Loading...' : isMutating ? 'Working...' : 'Add Task'}</span>
          </Button>
        </div>

        {/* Search and Filter Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 sm:mt-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 sm:pl-10 pr-9 sm:pr-10"
              disabled={disableControls}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-150"
                title="Clear search"
                aria-label="Clear search"
                disabled={disableControls}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Filter Dropdown */}
          <FilterDropdown filters={filters} onFiltersChange={setFilters} disabled={disableControls} />
        </div>
      </div>

      {/* Task List Table */}
      {isLoadingData ? (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          {/* Desktop Table Header */}
          <table className="w-full hidden md:table">
            <thead className="bg-muted/80 border-b border-border">
              <tr>
                <th className="w-10 px-3 py-2"></th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">Task</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">Priority</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">Due date</th>
                <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">Assignee</th>
                <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(6)].map((_, index) => (
                <TaskRowSkeleton key={index} />
              ))}
            </tbody>
          </table>
          {/* Mobile Loading Skeleton */}
          <div className="md:hidden p-4 space-y-3">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-background rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-input rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-input rounded w-1/2 mb-2"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-input rounded w-16"></div>
                  <div className="h-6 bg-input rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            {/* Desktop Table View */}
            <table className="w-full hidden md:table">
              <thead className="bg-muted/80 border-b border-border">
                <tr>
                  <th className="w-10 px-3 py-2"></th>
                  <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground cursor-pointer hover:text-foreground/80 select-none"
                      onClick={() => handleSort('title')}>
                    <div className="flex items-center gap-1">
                      Task
                      {sortConfig.key === 'title' && (
                        <ChevronDown size={12} className={`transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground cursor-pointer hover:text-foreground/80 select-none"
                      onClick={() => handleSort('priority')}>
                    <div className="flex items-center gap-1">
                      Priority
                      {sortConfig.key === 'priority' && (
                        <ChevronDown size={12} className={`transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground cursor-pointer hover:text-foreground/80 select-none"
                      onClick={() => handleSort('dueDate')}>
                    <div className="flex items-center gap-1">
                      Due date
                      {sortConfig.key === 'dueDate' && (
                        <ChevronDown size={12} className={`transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground cursor-pointer hover:text-foreground/80 select-none"
                      onClick={() => handleSort('assignee')}>
                    <div className="flex items-center gap-1">
                      Assignee
                      {sortConfig.key === 'assignee' && (
                        <ChevronDown size={12} className={`transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">Actions</th>
                </tr>
              </thead>
              {/* Quick-Add Row */}
              <tbody>
                <tr>
                  <td colSpan="6" className="px-3 py-2">
                    <div className="flex items-center gap-2 border border-dashed border-border rounded-md px-3 py-2 text-muted-foreground hover:border-primary/50 hover:text-foreground cursor-pointer transition-colors">
                      <Plus size={16} className="flex-shrink-0" />
                      <input
                        ref={quickAddInputRef}
                        type="text"
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        onKeyDown={handleQuickAdd}
                        placeholder="Add a task... (press Enter)"
                        disabled={isQuickAdding || !categories.length}
                        className="w-full text-sm bg-transparent placeholder:text-muted-foreground text-foreground outline-none disabled:opacity-50 cursor-text"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
              {visibleCategories.length > 0 ? (
                visibleCategories.map((category) => {
                  const categoryTasks = tasksByCategory[category.id] || [];
                  const isCategoryCollapsed = collapsedCategories[category.id];

                  // Build a flat list of rows (parents + visible subtasks) to keep indices aligned with DragDropContext
                  const categoryRows = [];
                  categoryTasks.forEach((task) => {
                    categoryRows.push({ task, isSubtask: false });
                    if (expandedTasks[task.id]) {
                      const subtasks = getSubtasks(task.id);
                      subtasks.forEach((subtask) => {
                        categoryRows.push({ task: subtask, isSubtask: true, parentId: task.id });
                      });
                    }
                  });

                  return (
                    <Droppable droppableId={category.id.toString()} key={category.id}>
                      {(provided, snapshot) => (
                        <tbody
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={snapshot.isDraggingOver ? 'bg-accent' : undefined}
                        >
                          {/* Category Header Row */}
                          <tr className="bg-accent border-b border-border">
                            <td colSpan="6" className="px-3 py-2">
                              <button
                                onClick={() => toggleCategoryCollapse(category.id)}
                                className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-all duration-150"
                              >
                                {isCategoryCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  ></div>
                                  <span className="text-sm font-bold text-foreground">{category.name}</span>
                                  <span className="text-xs text-muted-foreground">({categoryTasks.length})</span>
                                </div>
                              </button>
                            </td>
                          </tr>

                          {/* Category Tasks + Subtasks */}
                          {!isCategoryCollapsed && categoryRows.map((row, rowIndex) => {
                            const task = row.task;
                            const isSubtask = row.isSubtask;
                            const isCompleted = task.status === 'completed';
                            const subtasks = isSubtask ? [] : getSubtasks(task.id);
                            const hasSubtasks = !isSubtask && subtasks.length > 0;
                            const isExpanded = expandedTasks[task.id];
                            const isToggling = togglingTaskIds.has(task.id);

                            const draggableId = `${isSubtask ? 'subtask' : 'task'}-${task.id}`;

                            return (
                              <Draggable draggableId={draggableId} index={rowIndex} key={draggableId}>
                                {(dragProvided, dragSnapshot) => (
                                  <tr
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    className={`border-b border-border hover:bg-muted/50 transition-colors duration-150 ${isCompleted ? 'opacity-50' : ''} ${dragSnapshot.isDragging ? 'bg-muted shadow-sm' : ''}`}
                                  >
                                    {/* Drag handle + expand/collapse (parents) */}
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1">
                                        <span
                                          {...dragProvided.dragHandleProps}
                                          className="text-muted-foreground cursor-grab active:cursor-grabbing p-3 -m-3 md:p-0 md:m-0 touch-manipulation"
                                          title="Drag to reorder"
                                        >
                                          <GripVertical size={14} />
                                        </span>
                                        {!isSubtask && hasSubtasks ? (
                                          <button
                                            onClick={() => toggleTaskExpansion(task.id)}
                                            className="text-muted-foreground hover:text-foreground transition-colors duration-150"
                                            title={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                                          >
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                          </button>
                                        ) : (
                                          <div className="w-4"></div>
                                        )}
                                      </div>
                                    </td>

                                    {/* Task Title and Description */}
                                    <td className="px-3 py-2">
                                      <div className={`flex items-center gap-2 ${isSubtask ? 'pl-6' : ''}`}>
                                        <button
                                          onClick={() => handleToggleComplete(task)}
                                          className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                                            isCompleted
                                              ? 'bg-primary border-primary'
                                              : 'border-input hover:border-foreground'
                                          } ${isToggling ? 'opacity-70 cursor-not-allowed' : ''}`}
                                          disabled={isToggling}
                                          aria-label={isCompleted ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                                        >
                                          {isCompleted && (
                                              <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <button
                                            onClick={() => handleOpenDetail(task)}
                                            className={`text-sm font-medium text-foreground text-left hover:underline transition-colors duration-150 leading-tight ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
                                          >
                                            {task.title}
                                            {!isSubtask && hasSubtasks && (
                                              <span className="ml-2 text-xs font-normal text-muted-foreground no-underline">
                                                {task.completedSubtaskCount}/{task.subtaskCount}
                                              </span>
                                            )}
                                          </button>
                                          {task.description && (
                                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</div>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Priority */}
                                    <td className="px-3 py-2">
                                      <div className="relative" ref={el => dropdownRefs.current[`priority-${task.id}`] = el}>
                                        <button
                                          onClick={() => toggleDropdown(task.id, 'priority')}
                                          className={`px-2 py-0.5 rounded-md text-xs font-medium border flex items-center gap-1 hover:opacity-80 transition-opacity ${priorityPillStyles[task.priority] || priorityPillStyles.medium}`}
                                        >
                                          <span className={`w-1.5 h-1.5 rounded-full ${priorityDotColors[task.priority] || priorityDotColors.medium}`} />
                                          {task.priority}
                                          <ChevronDown size={10} className="opacity-60" />
                                        </button>

                                      </div>
                                    </td>

                                    {/* Due Date */}
                                    <td className="px-3 py-2">
                                      <div className="relative">
                                        <button
                                          ref={el => dropdownRefs.current[`date-${task.id}`] = el}
                                          onClick={() => toggleDropdown(task.id, 'date')}
                                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors duration-150 text-xs ${
                                            isTaskOverdue(task)
                                              ? 'text-red-500 font-medium'
                                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                          }`}
                                        >
                                          {task.dueDate ? (() => {
                                            const overdue = isTaskOverdue(task);
                                            const label = formatDueDate(task.dueDate);
                                            return (
                                              <>
                                                {overdue ? <AlertCircle size={12} className="text-red-500" aria-hidden="true" /> : <Calendar size={12} />}
                                                {overdue && <span className="font-semibold">Overdue</span>}
                                                {overdue && <span className="mx-0.5" aria-hidden="true">·</span>}
                                                <span className={overdue ? 'font-medium' : ''}>
                                                  {label}
                                                </span>
                                              </>
                                            );
                                          })() : (
                                            <>
                                              <Calendar size={12} />
                                              <span>Set date</span>
                                            </>
                                          )}
                                        </button>

                                        {activeDropdown?.taskId === task.id && activeDropdown?.type === 'date' && (
                                          <DatePicker
                                            selected={toLocalDate(task.dueDate)}
                                            onSelect={(date) => handleDateSelect(task.id, date)}
                                            onClose={closeDropdown}
                                            triggerRef={{ current: dropdownRefs.current[`date-${task.id}`] }}
                                          />
                                        )}

                                      </div>
                                    </td>

                                    {/* Assignees - Avatar stack with multi-select */}
                                    <td className="px-3 py-2">
                                      <div className="relative" ref={el => dropdownRefs.current[`assignee-${task.id}`] = el}>
                                        <button
                                          onClick={() => toggleDropdown(task.id, 'assignee')}
                                          className="flex items-center gap-1 hover:bg-accent rounded-md px-1.5 py-0.5 transition-colors duration-150"
                                        >
                                          {(task.assignees || []).length > 0 ? (
                                            <>
                                              {/* Avatar Stack */}
                                              <div className="flex -space-x-1">
                                                {(task.assignees || []).slice(0, 3).map((assignee, idx) => (
                                                  <div
                                                    key={assignee.id}
                                                    className="w-6 h-6 rounded-full bg-neutral-500 flex items-center justify-center text-white text-[11px] font-semibold ring-1 ring-white"
                                                    style={{ zIndex: 3 - idx }}
                                                    title={assignee.name}
                                                  >
                                                    {assignee.name.charAt(0).toUpperCase()}
                                                  </div>
                                                ))}
                                                {(task.assignees || []).length > 3 && (
                                                  <div
                                                    className="w-6 h-6 rounded-full bg-neutral-400 flex items-center justify-center text-white text-xs font-semibold ring-1 ring-white"
                                                    title={`+${(task.assignees || []).length - 3} more`}
                                                  >
                                                    +{(task.assignees || []).length - 3}
                                                  </div>
                                                )}
                                              </div>
                                              <ChevronDown size={10} className="text-muted-foreground ml-0.5" />
                                            </>
                                          ) : (
                                            <>
                                              <div className="w-6 h-6 rounded-full bg-input flex items-center justify-center">
                                                <span className="text-muted-foreground text-[11px]">?</span>
                                              </div>
                                              <span className="text-xs text-muted-foreground">Assign</span>
                                              <ChevronDown size={10} className="text-muted-foreground" />
                                            </>
                                          )}
                                        </button>

                                        {activeDropdown?.taskId === task.id && activeDropdown?.type === 'assignee' && (
                                          <AssigneeDropdown
                                            users={users}
                                            selectedIds={(task.assignees || []).map(a => a.id)}
                                            onToggle={(userId) => handleAssigneeToggle(task.id, userId)}
                                            onClose={closeDropdown}
                                            triggerRef={{ current: dropdownRefs.current[`assignee-${task.id}`] }}
                                            variant="multi"
                                          />
                                        )}
                                      </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-3 py-2">
                                      <div className="flex items-center justify-end gap-1">
                                        {!isSubtask && (
                                          <button
                                            onClick={() => handleAddSubtask(task)}
                                            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition-colors duration-150"
                                            title="Add subtask"
                                            aria-label="Add subtask"
                                          >
                                            <Plus size={16} />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleEdit(task)}
                                          className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition-colors duration-150"
                                          title={isSubtask ? 'Edit subtask' : 'Edit task'}
                                          aria-label={isSubtask ? 'Edit subtask' : 'Edit task'}
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => handleDelete(task)}
                                          className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-accent transition-colors duration-150"
                                          title={isSubtask ? 'Delete subtask' : 'Delete task'}
                                          aria-label={isSubtask ? 'Delete subtask' : 'Delete task'}
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Draggable>
                            );
                          })}

                          {provided.placeholder && (
                            <tr>
                              <td colSpan="6">{provided.placeholder}</td>
                            </tr>
                          )}
                        </tbody>
                      )}
                    </Droppable>
                  );
                })
              ) : (
                <tbody>
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-muted-foreground">
                      {searchQuery || filters.assignees.length > 0 || filters.priorities.length > 0 || filters.categories.length > 0
                        ? 'No tasks match your filters'
                        : 'No tasks yet. Create your first task!'}
                    </td>
                  </tr>
                </tbody>
              )}
            </table>

            {/* Mobile Card View */}
            <div className="md:hidden">
              {/* Mobile Quick-Add */}
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 border border-dashed border-border rounded-md px-3 py-2 text-muted-foreground hover:border-primary/50 hover:text-foreground cursor-pointer transition-colors">
                  <Plus size={16} className="flex-shrink-0" />
                  <input
                    type="text"
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    onKeyDown={handleQuickAdd}
                    placeholder="Add a task... (press Enter)"
                    disabled={isQuickAdding || !categories.length}
                    className="w-full text-sm bg-transparent placeholder:text-muted-foreground text-foreground outline-none disabled:opacity-50 cursor-text"
                  />
                </div>
              </div>
              {visibleCategories.length > 0 ? (
                visibleCategories.map((category) => {
                  const categoryTasks = tasksByCategory[category.id] || [];
                  const isCategoryCollapsed = collapsedCategories[category.id];

                  return (
                    <div key={category.id} className="border-b border-border last:border-b-0">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategoryCollapse(category.id)}
                        className="flex items-center gap-2 w-full px-3 py-2 bg-muted text-left transition-colors duration-150"
                      >
                        {isCategoryCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-sm font-bold text-foreground flex-1">{category.name}</span>
                        <span className="text-xs text-muted-foreground">({categoryTasks.length})</span>
                      </button>

                      {/* Category Tasks */}
                      {!isCategoryCollapsed && (
                        <div className="divide-y divide-border">
                          {categoryTasks.map((task) => {
                            const isCompleted = task.status === 'completed';
                            const isToggling = togglingTaskIds.has(task.id);
                            const subtasks = getSubtasks(task.id);
                            const hasSubtasks = subtasks.length > 0;
                            const isExpanded = expandedTasks[task.id];

                            return (
                              <div key={task.id}>
                                {/* Task Card */}
                                <div className={`px-3 py-2 ${isCompleted ? 'opacity-50' : ''}`}>
                                  {/* Task Header */}
                                  <div className="flex items-start gap-2 mb-1.5">
                                    <button
                                      onClick={() => handleToggleComplete(task)}
                                      className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                                        isCompleted
                                          ? 'bg-primary border-primary'
                                          : 'border-input hover:border-foreground'
                                      } ${isToggling ? 'opacity-70' : ''}`}
                                      disabled={isToggling}
                                      aria-label={isCompleted ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                                    >
                                      {isCompleted && (
                                          <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <button
                                        onClick={() => handleOpenDetail(task)}
                                        className={`text-sm font-medium text-foreground text-left hover:underline transition-colors duration-150 leading-tight ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
                                      >
                                        {task.title}
                                        {hasSubtasks && (
                                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                                            {task.completedSubtaskCount}/{task.subtaskCount}
                                          </span>
                                        )}
                                      </button>
                                      {task.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{task.description}</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Task Metadata - Stacked on mobile (priority -> due date -> assignee) */}
                                  <div className="flex flex-wrap items-center gap-2 ml-7 mb-1.5">
                                    {/* Priority */}
                                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium border flex items-center gap-1 ${priorityPillStyles[task.priority] || priorityPillStyles.medium}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${priorityDotColors[task.priority] || priorityDotColors.medium}`} />
                                      {task.priority}
                                    </span>

                                    {/* Due Date */}
                                    {task.dueDate && (
                                      <span className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                        isTaskOverdue(task)
                                          ? 'text-red-500 font-medium'
                                          : 'text-muted-foreground'
                                      }`}>
                                        <Calendar size={12} />
                                        {isTaskOverdue(task) && <span className="font-semibold">Overdue</span>}
                                        {isTaskOverdue(task) && <span className="mx-0.5">·</span>}
                                        {formatDueDate(task.dueDate)}
                                      </span>
                                    )}

                                    {/* Assignees - Avatar stack on mobile */}
                                    {(task.assignees || []).length > 0 && (
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <div className="flex -space-x-1">
                                          {(task.assignees || []).slice(0, 2).map((assignee, idx) => (
                                            <div
                                              key={assignee.id}
                                              className="w-6 h-6 rounded-full bg-neutral-500 flex items-center justify-center text-white text-xs font-semibold ring-1 ring-white"
                                              style={{ zIndex: 2 - idx }}
                                              title={assignee.name}
                                            >
                                              {assignee.name.charAt(0).toUpperCase()}
                                            </div>
                                          ))}
                                          {(task.assignees || []).length > 2 && (
                                            <div className="w-6 h-6 rounded-full bg-neutral-400 flex items-center justify-center text-white text-xs font-semibold ring-1 ring-white">
                                              +{(task.assignees || []).length - 2}
                                            </div>
                                          )}
                                        </div>
                                      </span>
                                    )}
                                  </div>

                                  {/* Task Actions */}
                                  <div className="flex items-center justify-between ml-7">
                                    {hasSubtasks && (
                                      <button
                                        onClick={() => toggleTaskExpansion(task.id)}
                                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                      >
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        {isExpanded ? 'Hide' : 'Show'} subtasks
                                      </button>
                                    )}
                                    <div className="flex items-center gap-1 ml-auto">
                                      <button
                                        onClick={() => handleAddSubtask(task)}
                                        className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-accent transition-colors"
                                        title="Add subtask"
                                        aria-label="Add subtask"
                                      >
                                        <Plus size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleEdit(task)}
                                        className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-accent transition-colors"
                                        title="Edit task"
                                        aria-label="Edit task"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleDelete(task)}
                                        className="text-muted-foreground hover:text-destructive p-1.5 rounded hover:bg-accent transition-colors"
                                        title="Delete task"
                                        aria-label="Delete task"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Subtasks (expanded) */}
                                {isExpanded && subtasks.map((subtask) => {
                                  const isSubtaskCompleted = subtask.status === 'completed';
                                  const isSubtaskToggling = togglingTaskIds.has(subtask.id);

                                  return (
                                    <div key={subtask.id} className={`px-3 py-2 pl-10 bg-muted/50 border-t border-border ${isSubtaskCompleted ? 'opacity-50' : ''}`}>
                                      <div className="flex items-start gap-2">
                                        <button
                                          onClick={() => handleToggleComplete(subtask)}
                                          className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                                            isSubtaskCompleted
                                              ? 'bg-primary border-primary'
                                              : 'border-input hover:border-foreground'
                                          } ${isSubtaskToggling ? 'opacity-70' : ''}`}
                                          disabled={isSubtaskToggling}
                                          aria-label={isSubtaskCompleted ? `Mark "${subtask.title}" as incomplete` : `Mark "${subtask.title}" as complete`}
                                        >
                                          {isSubtaskCompleted && (
                                              <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <span className={`text-sm text-foreground ${isSubtaskCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                            {subtask.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleEdit(subtask)}
                                            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition-colors"
                                            aria-label="Edit subtask"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => handleDelete(subtask)}
                                            className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-accent transition-colors"
                                            aria-label="Delete subtask"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                          {categoryTasks.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No tasks in this category
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {searchQuery || filters.assignees.length > 0 || filters.priorities.length > 0 || filters.categories.length > 0
                    ? 'No tasks match your filters'
                    : 'No tasks yet. Create your first task!'}
                </div>
              )}
            </div>
          </div>
        </DragDropContext>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={loadMoreTasks}
              disabled={isLoadingMore}
            >
              {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}
        </>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={editingTask}
        parentTaskId={parentTaskForSubtask?.id}
        parentTask={parentTaskForSubtask}
      />

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deletingTask} onOpenChange={(open) => { if (!open) cancelDelete(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTask?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetail}
        onDelete={handleDelete}
      />

      {/* Priority Dropdown Portal */}
      {activeDropdown?.type === 'priority' && createPortal(
        <div
          ref={priorityPortalRef}
          className="fixed w-32 bg-card border border-border rounded-lg shadow-sm z-[100] animate-fade-in"
          style={{ top: `${priorityDropdownPos.top}px`, left: `${priorityDropdownPos.left}px` }}
        >
          <div className="py-1">
            {priorities.map((priority) => {
              const activeTask = tasks.find(t => t.id === activeDropdown.taskId);
              return (
                <button
                  key={priority}
                  onClick={() => handlePrioritySelect(activeDropdown.taskId, priority)}
                  className={`w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-accent flex items-center justify-between transition-colors duration-150 ${
                    activeTask?.priority === priority ? 'bg-accent' : ''
                  }`}
                >
                  <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${priorityPillStyles[priority]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${priorityDotColors[priority]}`} />
                    {priority}
                  </span>
                  {activeTask?.priority === priority && (
                    <Check size={12} className="text-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default ListView;
