import React, { useState, useEffect, useRef } from 'react';
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
import { InlineSpinner, TaskRowSkeleton, ButtonSpinner } from '../components/Loader';
import { toLocalDate, toUTCISOString, formatDueDate, isOverdue } from '../utils/dateUtils';
import { getPriorityColor } from '../utils/priorityStyles';

function ListView() {
  const {
    tasks,
    fetchTasks,
    deleteTask,
    toggleComplete,
    updateTask,
    updateTaskPosition,
    isLoading,
    isFetching,
    isMutating,
  } = useTaskStore();
  const { categories, fetchCategories, isLoading: isCategoriesLoading } = useCategoryStore();
  const { users, fetchUsers } = useUserStore();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    assignees: [],
    priorities: [],
    categories: [],
    hideCompleted: false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [, setDefaultCategoryId] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState(null);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [togglingTaskIds, setTogglingTaskIds] = useState(new Set());
  const [activeDropdown, setActiveDropdown] = useState(null); // { taskId, type }
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const dropdownRefs = useRef({});

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

      if (!clickedInsideTrigger) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

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
      setIsDeletingTask(true);
      try {
        await deleteTask(deletingTask.id);
        setDeletingTask(null);
      } finally {
        setIsDeletingTask(false);
      }
    }
  };

  const cancelDelete = () => {
    if (!isDeletingTask) {
      setDeletingTask(null);
    }
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

  const handleToggleComplete = async (task) => {
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
  };

  /**
   * Handle drag-and-drop reordering of tasks and subtasks.
   * Supports reordering parent tasks within their category and
   * subtasks within their parent task only.
   */
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Early exit: no drop target, cross-category drop, or same position
    if (!destination) return;
    if (destination.droppableId !== source.droppableId) return;
    if (destination.index === source.index) return;

    const categoryId = parseInt(destination.droppableId, 10);
    const isSubtask = draggableId.startsWith('subtask-');
    const taskId = parseInt(draggableId.replace('subtask-', '').replace('task-', ''), 10);

    const categoryParents = parentTasks.filter(task => task.categoryId === categoryId);

    // Build flat list of visible rows (parents + expanded subtasks) for index mapping
    const buildCategoryRows = () => {
      const rows = [];
      categoryParents.forEach((parent) => {
        rows.push({ task: parent, isSubtask: false });
        if (expandedTasks[parent.id]) {
          const subs = getSubtasks(parent.id);
          subs.forEach((sub) => rows.push({ task: sub, isSubtask: true, parentId: parent.id }));
        }
      });
      return rows;
    };

    const categoryRows = buildCategoryRows();
    const sourceRow = categoryRows[source.index];
    const destRow = categoryRows[destination.index];
    if (!sourceRow || !destRow) return;

    // Dragging parent tasks
    if (!isSubtask) {
      if (sourceRow.isSubtask || destRow.isSubtask) return;

      const newParentOrder = [...categoryParents];
      const fromIdx = newParentOrder.findIndex(t => t.id === taskId);
      const toIdx = newParentOrder.findIndex(t => t.id === destRow.task.id);
      if (fromIdx === -1 || toIdx === -1) return;

      // Reorder parents locally for index calculation
      const [moved] = newParentOrder.splice(fromIdx, 1);
      newParentOrder.splice(toIdx, 0, moved);

      await updateTaskPosition(taskId, { category_id: categoryId, position: toIdx });
      return;
    }

    // Dragging subtasks (only within the same parent)
    if (!sourceRow.isSubtask || !destRow.isSubtask) return;
    if (sourceRow.parentId !== destRow.parentId) return;

    const parentId = sourceRow.parentId;
    const parentTask = tasks.find(t => t.id === parentId);
    if (!parentTask) return;

    const categoryTasksOrdered = tasks
      .filter(t => t.categoryId === categoryId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const siblings = getSubtasks(parentId);
    const draggedTask = tasks.find(t => t.id === taskId);
    if (!draggedTask) return;

    const reorderedSiblings = siblings.filter(t => t.id !== taskId);
    reorderedSiblings.splice(destination.index, 0, draggedTask);

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

    await updateTaskPosition(taskId, { category_id: categoryId, position: newIndex });
  };

  const clearSearch = () => {
    setSearchQuery('');
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

  // Get subtasks for a parent task
  const getSubtasks = (parentTaskId) => {
    return tasks.filter(task => task.parentTaskId === parentTaskId);
  };

  const isTaskOverdue = (task) => isOverdue(task.dueDate, task.status);

  // Inline editing handlers
  const toggleDropdown = (taskId, dropdownType) => {
    setActiveDropdown(prev => {
      if (prev?.taskId === taskId && prev?.type === dropdownType) {
        return null;
      }
      return { taskId, type: dropdownType };
    });
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const handlePrioritySelect = async (taskId, priority) => {
    try {
      await updateTask(taskId, { priority });
      closeDropdown();
    } catch (error) {
      // Error is handled in taskStore
    }
  };

  // Toggle assignee (add or remove) for a task
  const handleAssigneeToggle = async (taskId, userId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const currentAssignees = task.assignees || [];
      const currentIds = currentAssignees.map(a => a.id);

      let newAssigneeIds;
      if (currentIds.includes(userId)) {
        // Remove assignee
        newAssigneeIds = currentIds.filter(id => id !== userId);
      } else {
        // Add assignee
        newAssigneeIds = [...currentIds, userId];
      }

      await updateTask(taskId, { assignee_ids: newAssigneeIds });
    } catch (error) {
      // Error is handled in taskStore
    }
  };

  const handleDateSelect = async (taskId, date) => {
    try {
      const formattedDate = toUTCISOString(date);
      await updateTask(taskId, { due_date: formattedDate });
      closeDropdown();
    } catch (error) {
      // Error is handled in taskStore
    }
  };

  const priorities = ['low', 'medium', 'high', 'urgent'];

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = searchQuery.trim() === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Updated to work with multiple assignees - OR logic (matches any selected assignee)
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

  // Filter to only show parent tasks (tasks without parent_task_id)
  const parentTasks = filteredTasks.filter(task => !task.parentTaskId);

  // Group parent tasks by category
  const tasksByCategory = categories.reduce((acc, category) => {
    acc[category.id] = parentTasks.filter(task => task.categoryId === category.id);
    return acc;
  }, {});

  // Filter categories that should be shown (have tasks or match filter)
  const visibleCategories = categories.filter(category => {
    const hasTasks = tasksByCategory[category.id]?.length > 0;
    const matchesFilter = filters.categories.length === 0 || filters.categories.includes(category.id);
    return hasTasks && matchesFilter;
  });

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
            <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900">Tasks</h2>
            {isLoadingData && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <InlineSpinner />
                <span className="hidden sm:inline">Loading tasks...</span>
              </div>
            )}
          </div>

          {/* Add Task Button - Always visible */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-all duration-200 flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={disablePrimaryAction}
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">{isLoadingData ? 'Loading...' : isMutating ? 'Working...' : 'Add Task'}</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Search and Filter Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 sm:mt-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 disabled:bg-neutral-50 transition-all duration-150"
              disabled={disableControls}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-all duration-150"
                title="Clear search"
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
        <div className="bg-white rounded-xl shadow-sm border border-neutral-150 overflow-x-auto">
          {/* Desktop Table Header */}
          <table className="w-full hidden md:table">
            <thead className="bg-neutral-50/80 border-b border-neutral-150">
              <tr>
                <th className="w-12 px-4 py-3"></th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-600">Task</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-600">Priority</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-600">Assignee</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-600">Due Date</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-neutral-600">Actions</th>
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
              <div key={index} className="bg-neutral-100 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-neutral-200 rounded w-1/2 mb-2"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-neutral-200 rounded w-16"></div>
                  <div className="h-6 bg-neutral-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="bg-white rounded-xl shadow-sm border border-neutral-150 overflow-x-auto">
            {/* Desktop Table View */}
            <table className="w-full hidden md:table">
              <thead className="bg-neutral-50/80 border-b border-neutral-150">
                <tr>
                  <th className="w-12 px-4 py-3"></th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-600">Task</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-600">Priority</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-600">Assignee</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-neutral-600">Due Date</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-neutral-600">Actions</th>
                </tr>
              </thead>
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
                          className={snapshot.isDraggingOver ? 'bg-teal-50/40' : undefined}
                        >
                          {/* Category Header Row */}
                          <tr className="bg-neutral-100 border-b border-neutral-200">
                            <td colSpan="6" className="px-4 py-2">
                              <button
                                onClick={() => toggleCategoryCollapse(category.id)}
                                className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-all duration-150"
                              >
                                {isCategoryCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  ></div>
                                  <span className="font-semibold text-neutral-900">{category.name}</span>
                                  <span className="text-sm text-neutral-500">({categoryTasks.length})</span>
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
                                    className={`hover:bg-neutral-50 transition-all duration-150 ${isCompleted ? 'opacity-60' : ''} ${dragSnapshot.isDragging ? 'bg-teal-50' : ''}`}
                                  >
                                    {/* Drag handle + expand/collapse (parents) */}
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <span
                                          {...dragProvided.dragHandleProps}
                                          className="text-neutral-400 hover:text-neutral-600 cursor-grab"
                                          title="Drag to reorder"
                                        >
                                          <GripVertical size={14} />
                                        </span>
                                        {!isSubtask && hasSubtasks ? (
                                          <button
                                            onClick={() => toggleTaskExpansion(task.id)}
                                            className="text-neutral-600 hover:text-neutral-900 transition-all duration-150"
                                            title={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                                          >
                                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                          </button>
                                        ) : (
                                          <div className="w-[18px]"></div>
                                        )}
                                      </div>
                                    </td>

                                    {/* Task Title and Description */}
                                    <td className="px-4 py-3">
                                      <div className={`flex items-center gap-3 ${isSubtask ? 'pl-6' : ''}`}>
                                        <button
                                          onClick={() => handleToggleComplete(task)}
                                          className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                                            isCompleted
                                              ? 'bg-teal-500 border-teal-500'
                                              : 'border-neutral-300 hover:border-teal-500'
                                          } ${isToggling ? 'opacity-70 cursor-not-allowed' : ''}`}
                                          disabled={isToggling}
                                        >
                                          {isToggling ? (
                                            <InlineSpinner size="sm" />
                                          ) : (
                                            isCompleted && (
                                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )
                                          )}
                                        </button>
                                        <div className="flex-1">
                                          <button
                                            onClick={() => handleOpenDetail(task)}
                                            className={`font-medium text-left hover:text-teal-600 hover:underline transition-all duration-150 ${isSubtask ? 'text-neutral-700' : 'text-neutral-900'} ${isCompleted ? 'line-through' : ''}`}
                                          >
                                            {task.title}
                                            {!isSubtask && hasSubtasks && (
                                              <span className="ml-2 text-xs text-neutral-500 no-underline">
                                                {task.completedSubtaskCount}/{task.subtaskCount}
                                              </span>
                                            )}
                                          </button>
                                          {task.description && (
                                            <div className="text-sm text-neutral-500 line-clamp-1 mt-1">{task.description}</div>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Priority */}
                                    <td className="px-4 py-3">
                                      <div className="relative" ref={el => dropdownRefs.current[`priority-${task.id}`] = el}>
                                        <button
                                          onClick={() => toggleDropdown(task.id, 'priority')}
                                          className={`px-2 py-1 rounded text-xs font-medium border hover:opacity-80 transition flex items-center gap-1 ${getPriorityColor(task.priority)}`}
                                        >
                                          {task.priority}
                                          <ChevronDown size={10} />
                                        </button>

                                        {activeDropdown?.taskId === task.id && activeDropdown?.type === 'priority' && (
                                          <div className="absolute left-0 top-full mt-1 w-32 bg-white border border-neutral-150 rounded-xl shadow-lg z-30 animate-fade-in">
                                            <div className="py-1">
                                              {priorities.map((priority) => (
                                                <button
                                                  key={priority}
                                                  onClick={() => handlePrioritySelect(task.id, priority)}
                                                  className={`w-full px-3 py-2 text-left text-xs font-medium hover:bg-neutral-100 flex items-center justify-between transition-all duration-150 ${
                                                    task.priority === priority ? 'bg-neutral-100' : ''
                                                  }`}
                                                >
                                                  <span className={`px-2 py-1 rounded border ${getPriorityColor(priority)}`}>
                                                    {priority}
                                                  </span>
                                                  {task.priority === priority && (
                                                    <Check size={14} className="text-teal-600" />
                                                  )}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </td>

                                    {/* Assignees - Avatar stack with multi-select */}
                                    <td className="px-4 py-3">
                                      <div className="relative" ref={el => dropdownRefs.current[`assignee-${task.id}`] = el}>
                                        <button
                                          onClick={() => toggleDropdown(task.id, 'assignee')}
                                          className="flex items-center gap-1 hover:bg-neutral-100 rounded-lg px-2 py-1 -mx-2 transition-all duration-150"
                                        >
                                          {(task.assignees || []).length > 0 ? (
                                            <>
                                              {/* Avatar Stack */}
                                              <div className="flex -space-x-1.5">
                                                {(task.assignees || []).slice(0, 3).map((assignee, idx) => (
                                                  <div
                                                    key={assignee.id}
                                                    className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                                                    style={{ zIndex: 3 - idx }}
                                                    title={assignee.name}
                                                  >
                                                    {assignee.name.charAt(0).toUpperCase()}
                                                  </div>
                                                ))}
                                                {(task.assignees || []).length > 3 && (
                                                  <div
                                                    className="w-6 h-6 rounded-full bg-neutral-400 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                                                    title={`+${(task.assignees || []).length - 3} more`}
                                                  >
                                                    +{(task.assignees || []).length - 3}
                                                  </div>
                                                )}
                                              </div>
                                              <ChevronDown size={12} className="text-neutral-400 ml-1" />
                                            </>
                                          ) : (
                                            <>
                                              <div className="w-6 h-6 rounded-full bg-neutral-300 flex items-center justify-center text-white text-xs font-medium">
                                                ?
                                              </div>
                                              <span className="text-sm text-neutral-500">Assign</span>
                                              <ChevronDown size={12} className="text-neutral-400" />
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

                                    {/* Due Date */}
                                    <td className="px-4 py-3">
                                      <div className="relative">
                                        <button
                                          ref={el => dropdownRefs.current[`date-${task.id}`] = el}
                                          onClick={() => toggleDropdown(task.id, 'date')}
                                          className={`flex items-center gap-1 px-2 py-1 -mx-2 rounded-lg transition-all duration-150 text-xs ${
                                            isTaskOverdue(task)
                                              ? 'bg-red-50 border border-red-200'
                                              : 'hover:bg-neutral-100'
                                          }`}
                                        >
                                          {task.dueDate ? (() => {
                                            const overdue = isTaskOverdue(task);
                                            const label = formatDueDate(task.dueDate);
                                            return (
                                              <>
                                                <Calendar size={12} className={overdue ? 'text-red-500' : ''} />
                                                {overdue && <span className="text-red-600 font-semibold">Overdue</span>}
                                                {overdue && <span className="text-red-400 mx-0.5">·</span>}
                                                <span className={overdue ? 'text-red-600 font-medium' : 'text-neutral-700'}>
                                                  {label}
                                                </span>
                                              </>
                                            );
                                          })() : (
                                            <>
                                              <Calendar size={12} />
                                              <span className="text-neutral-500">Set date</span>
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

                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                      <div className="flex items-center justify-end gap-2">
                                        {!isSubtask && (
                                          <button
                                            onClick={() => handleAddSubtask(task)}
                                            className="text-neutral-600 hover:text-teal-600 transition-all duration-150"
                                            title="Add subtask"
                                          >
                                            <Plus size={18} />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleEdit(task)}
                                          className="text-neutral-600 hover:text-teal-600 transition-all duration-150"
                                          title={isSubtask ? 'Edit subtask' : 'Edit task'}
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => handleDelete(task)}
                                          className="text-neutral-600 hover:text-red-500 transition-all duration-150"
                                          title={isSubtask ? 'Delete subtask' : 'Delete task'}
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <td colSpan="6" className="px-4 py-12 text-center text-neutral-500">
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
              {visibleCategories.length > 0 ? (
                visibleCategories.map((category) => {
                  const categoryTasks = tasksByCategory[category.id] || [];
                  const isCategoryCollapsed = collapsedCategories[category.id];

                  return (
                    <div key={category.id} className="border-b border-neutral-150 last:border-b-0">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategoryCollapse(category.id)}
                        className="flex items-center gap-2 w-full px-4 py-3 bg-neutral-50 text-left transition-all duration-150"
                      >
                        {isCategoryCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="font-semibold text-neutral-900 flex-1">{category.name}</span>
                        <span className="text-sm text-neutral-500">({categoryTasks.length})</span>
                      </button>

                      {/* Category Tasks */}
                      {!isCategoryCollapsed && (
                        <div className="divide-y divide-neutral-100">
                          {categoryTasks.map((task) => {
                            const isCompleted = task.status === 'completed';
                            const isToggling = togglingTaskIds.has(task.id);
                            const subtasks = getSubtasks(task.id);
                            const hasSubtasks = subtasks.length > 0;
                            const isExpanded = expandedTasks[task.id];

                            return (
                              <div key={task.id}>
                                {/* Task Card */}
                                <div className={`p-4 ${isCompleted ? 'opacity-60' : ''}`}>
                                  {/* Task Header */}
                                  <div className="flex items-start gap-3 mb-2">
                                    <button
                                      onClick={() => handleToggleComplete(task)}
                                      className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                                        isCompleted
                                          ? 'bg-teal-500 border-teal-500'
                                          : 'border-neutral-300 hover:border-teal-500'
                                      } ${isToggling ? 'opacity-70' : ''}`}
                                      disabled={isToggling}
                                    >
                                      {isToggling ? (
                                        <InlineSpinner size="sm" />
                                      ) : (
                                        isCompleted && (
                                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <button
                                        onClick={() => handleOpenDetail(task)}
                                        className={`font-medium text-neutral-900 text-left hover:text-teal-600 transition-all duration-150 ${isCompleted ? 'line-through' : ''}`}
                                      >
                                        {task.title}
                                        {hasSubtasks && (
                                          <span className="ml-2 text-xs text-neutral-500">
                                            {task.completedSubtaskCount}/{task.subtaskCount}
                                          </span>
                                        )}
                                      </button>
                                      {task.description && (
                                        <p className="text-sm text-neutral-500 line-clamp-2 mt-1">{task.description}</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Task Metadata - Stacked on mobile */}
                                  <div className="flex flex-wrap items-center gap-2 ml-8 mb-2">
                                    {/* Priority */}
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                      {task.priority}
                                    </span>

                                    {/* Due Date */}
                                    {task.dueDate && (
                                      <span className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                        isTaskOverdue(task)
                                          ? 'text-red-600 font-medium bg-red-50 border border-red-200'
                                          : 'text-neutral-500'
                                      }`}>
                                        <Calendar size={12} />
                                        {isTaskOverdue(task) && <span className="font-semibold">Overdue</span>}
                                        {isTaskOverdue(task) && <span className="mx-0.5">·</span>}
                                        {formatDueDate(task.dueDate)}
                                      </span>
                                    )}

                                    {/* Assignees - Avatar stack on mobile */}
                                    {(task.assignees || []).length > 0 && (
                                      <span className="flex items-center gap-1 text-xs text-neutral-500">
                                        <div className="flex -space-x-1">
                                          {(task.assignees || []).slice(0, 2).map((assignee, idx) => (
                                            <div
                                              key={assignee.id}
                                              className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-medium border border-white"
                                              style={{ zIndex: 2 - idx }}
                                              title={assignee.name}
                                            >
                                              {assignee.name.charAt(0).toUpperCase()}
                                            </div>
                                          ))}
                                          {(task.assignees || []).length > 2 && (
                                            <div className="w-5 h-5 rounded-full bg-neutral-400 flex items-center justify-center text-white text-xs font-medium border border-white">
                                              +{(task.assignees || []).length - 2}
                                            </div>
                                          )}
                                        </div>
                                      </span>
                                    )}
                                  </div>

                                  {/* Task Actions */}
                                  <div className="flex items-center justify-between ml-8">
                                    {hasSubtasks && (
                                      <button
                                        onClick={() => toggleTaskExpansion(task.id)}
                                        className="text-xs text-teal-600 flex items-center gap-1"
                                      >
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        {isExpanded ? 'Hide' : 'Show'} subtasks
                                      </button>
                                    )}
                                    <div className="flex items-center gap-3 ml-auto">
                                      <button
                                        onClick={() => handleAddSubtask(task)}
                                        className="text-neutral-500 hover:text-teal-600 p-1"
                                        title="Add subtask"
                                      >
                                        <Plus size={18} />
                                      </button>
                                      <button
                                        onClick={() => handleEdit(task)}
                                        className="text-neutral-500 hover:text-teal-600 p-1"
                                        title="Edit task"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleDelete(task)}
                                        className="text-neutral-500 hover:text-red-500 p-1"
                                        title="Delete task"
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
                                    <div key={subtask.id} className={`p-4 pl-12 bg-neutral-50 border-t border-neutral-100 ${isSubtaskCompleted ? 'opacity-60' : ''}`}>
                                      <div className="flex items-start gap-3">
                                        <button
                                          onClick={() => handleToggleComplete(subtask)}
                                          className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                                            isSubtaskCompleted
                                              ? 'bg-teal-500 border-teal-500'
                                              : 'border-neutral-300 hover:border-teal-500'
                                          } ${isSubtaskToggling ? 'opacity-70' : ''}`}
                                          disabled={isSubtaskToggling}
                                        >
                                          {isSubtaskToggling ? (
                                            <InlineSpinner size="sm" />
                                          ) : (
                                            isSubtaskCompleted && (
                                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )
                                          )}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <span className={`text-sm text-neutral-700 ${isSubtaskCompleted ? 'line-through' : ''}`}>
                                            {subtask.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleEdit(subtask)}
                                            className="text-neutral-400 hover:text-teal-600 p-1"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => handleDelete(subtask)}
                                            className="text-neutral-400 hover:text-red-500 p-1"
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
                            <div className="p-4 text-center text-sm text-neutral-500">
                              No tasks in this category
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-neutral-500">
                  {searchQuery || filters.assignees.length > 0 || filters.priorities.length > 0 || filters.categories.length > 0
                    ? 'No tasks match your filters'
                    : 'No tasks yet. Create your first task!'}
                </div>
              )}
            </div>
          </div>
        </DragDropContext>
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
      {deletingTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={cancelDelete}
          ></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Delete Task
              </h3>
              <p className="text-neutral-600 mb-6">
                Are you sure you want to delete "{deletingTask.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all duration-200"
                  disabled={isDeletingTask}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={isDeletingTask}
                >
                  {isDeletingTask && <ButtonSpinner />}
                  {isDeletingTask ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetail}
        onDelete={handleDelete}
      />
    </>
  );
}

export default ListView;
