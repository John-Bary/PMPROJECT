import { useEffect, useState, useRef } from 'react';
import { Plus, Search, X, ClipboardList, FilterX, FolderPlus, SearchX, Eye } from 'lucide-react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import useTaskStore from '../store/taskStore';
import useCategoryStore from '../store/categoryStore';
import { useWorkspace } from '../contexts/WorkspaceContext';
import CategorySection from './CategorySection';
import TaskModal from './TaskModal';
import TaskDetailModal from './TaskDetailModal';
import CategoryModal from './CategoryModal';
import AddCategoryButton from './AddCategoryButton';
import FilterDropdown from './FilterDropdown';
import { InlineSpinner, TaskColumnSkeleton, ButtonSpinner } from './Loader';
import EmptyState from './EmptyState';

function TaskList() {
  const {
    tasks,
    fetchTasks,
    deleteTask,
    toggleComplete,
    updateTaskPosition,
    isLoading: isTasksLoading,
    isFetching,
    isMutating,
  } = useTaskStore();
  const {
    categories,
    fetchCategories,
    deleteCategory,
    reorderCategories,
    isLoading: isCategoriesLoading,
  } = useCategoryStore();
  const { canEdit } = useWorkspace();
  const userCanEdit = canEdit();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Get the selected task from the tasks array to ensure it's always fresh
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef(null);
  const searchInputRef = useRef(null);
  const [togglingTaskIds, setTogglingTaskIds] = useState(new Set());
  const [filters, setFilters] = useState({
    assignees: [],
    priorities: [],
    categories: [],
    hideCompleted: false,
  });
  const [isDraggingCategory, setIsDraggingCategory] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchCategories();
  }, [fetchTasks, fetchCategories]);

  // Cmd/Ctrl+K keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounce search query - update filter value 300ms after user stops typing
  useEffect(() => {
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
  }, [searchInput]);

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
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = (task) => {
    setDeletingTask(task);
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
    setDefaultCategoryId(null);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (category) => {
    setDeletingCategory(category);
  };

  const confirmDeleteCategory = async () => {
    if (deletingCategory) {
      setIsDeletingCategory(true);
      try {
        await deleteCategory(deletingCategory.id);
        setDeletingCategory(null);
        // Refetch tasks to ensure any reassigned tasks are updated
        await fetchTasks();
      } finally {
        setIsDeletingCategory(false);
      }
    }
  };

  const cancelDeleteCategory = () => {
    if (!isDeletingCategory) {
      setDeletingCategory(null);
    }
  };

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const getSuggestedCategoryId = () => {
    if (filters.categories.length > 0) return filters.categories[0];
    if (categories.length > 0) return categories[0].id;
    return null;
  };

  const openCreateTask = (categoryId = null) => {
    setEditingTask(null);
    setDefaultCategoryId(categoryId);
    setIsModalOpen(true);
  };

  // Handle drag start to detect category dragging
  const handleDragStart = (start) => {
    if (start.draggableId.startsWith('category-')) {
      setIsDraggingCategory(true);
    }
  };

  // Handle drag and drop
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Reset category dragging state
    setIsDraggingCategory(false);

    // Dropped outside valid droppable area
    if (!destination) {
      return;
    }

    // Dropped in same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Handle category reorder
    if (draggableId.startsWith('category-')) {
      const newOrder = [...visibleCategories];
      const [movedCategory] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, movedCategory);

      // Get new order of all category IDs
      const categoryIds = newOrder.map(cat => cat.id);
      await reorderCategories(categoryIds);
      return;
    }

    // Handle task reorder
    const taskId = parseInt(draggableId);
    const destCategoryId = parseInt(destination.droppableId);

    // Update task position and category
    const positionData = {
      category_id: destCategoryId,
      position: destination.index,
    };

    await updateTaskPosition(taskId, positionData);
  };

  // Only show top-level tasks (subtasks are handled in ListView)
  const topLevelTasks = tasks.filter((task) => !task.parentTaskId);

  // Group tasks by category and apply search filter and filters
  const getTasksByCategory = (categoryId) => {
    return topLevelTasks.filter((task) => {
      const matchesCategory = task.categoryId === categoryId;

      const matchesSearch = searchQuery.trim() === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // Filter by assignee
      const matchesAssignee = filters.assignees.length === 0 ||
        filters.assignees.includes(task.assigneeId);

      // Filter by priority
      const matchesPriority = filters.priorities.length === 0 ||
        filters.priorities.includes(task.priority);

      // Filter by completed status
      const matchesCompleted = !filters.hideCompleted ||
        task.status !== 'completed';

      return matchesCategory && matchesSearch && matchesAssignee && matchesPriority && matchesCompleted;
    });
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const clearSearchAndFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setFilters({
      assignees: [],
      priorities: [],
      categories: [],
      hideCompleted: false,
    });
  };

  const isLoadingData = isTasksLoading || isCategoriesLoading || isFetching;
  const disableControls = isLoadingData;
  const disablePrimaryAction = isLoadingData || isMutating || !userCanEdit;
  const hasActiveFilters = Boolean(searchInput.trim() || searchQuery.trim()) ||
    filters.assignees.length > 0 ||
    filters.priorities.length > 0 ||
    filters.categories.length > 0 ||
    filters.hideCompleted;

  const visibleCategories = categories.filter(
    (category) =>
      filters.categories.length === 0 || filters.categories.includes(category.id)
  );

  const visibleTaskCount = visibleCategories.reduce(
    (count, category) => count + getTasksByCategory(category.id).length,
    0
  );

  const showNoResults = !isLoadingData && visibleTaskCount === 0 && hasActiveFilters;
  const showNoTasks = !isLoadingData && topLevelTasks.length === 0 && !hasActiveFilters;

  return (
    <>
      {/* Viewer Mode Banner */}
      {!userCanEdit && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800">
          <Eye className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">View Only Mode</p>
            <p className="text-xs text-amber-700">You have viewer access to this workspace. Contact an admin to request edit permissions.</p>
          </div>
        </div>
      )}

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
            onClick={() => openCreateTask(getSuggestedCategoryId())}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-all duration-200 flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={disablePrimaryAction}
            title={!userCanEdit ? 'View-only access' : ''}
          >
            <Plus size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">{isLoadingData ? 'Loading...' : isMutating ? 'Working...' : !userCanEdit ? 'View Only' : 'Add Task'}</span>
            <span className="sm:hidden">{!userCanEdit ? 'View' : 'Add'}</span>
          </button>
        </div>

        {/* Search and Filter Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 sm:mt-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tasks... (⌘K)"
              className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 disabled:bg-neutral-50 transition-all duration-150"
              disabled={disableControls}
            />
            {searchInput && (
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

      {isLoadingData ? (
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
          {[1, 2, 3].map((i) => (
            <TaskColumnSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {showNoTasks && (
            <div className="mb-6">
              <EmptyState
                icon={ClipboardList}
                title="No tasks yet"
                description={
                  categories.length > 0
                    ? 'Create your first task to start tracking work in this board.'
                    : 'Create a category first, then add tasks to keep everything organized.'
                }
                primaryAction={
                  categories.length > 0
                    ? {
                        label: 'Create your first task',
                        onClick: () => openCreateTask(getSuggestedCategoryId()),
                        icon: Plus,
                      }
                    : {
                        label: 'Create a category',
                        onClick: () => setIsCategoryModalOpen(true),
                        icon: FolderPlus,
                      }
                }
                secondaryAction={
                  categories.length > 0
                    ? {
                        label: 'Add category',
                        onClick: () => setIsCategoryModalOpen(true),
                        icon: FolderPlus,
                      }
                    : undefined
                }
              />
            </div>
          )}

          {showNoResults ? (
            <div className="space-y-4">
              <EmptyState
                icon={SearchX}
                title="No tasks match your search"
                description="Try adjusting your filters or clearing the search to see everything again."
                primaryAction={{
                  label: 'Clear search & filters',
                  onClick: clearSearchAndFilters,
                  icon: FilterX,
                }}
                secondaryAction={
                  categories.length > 0
                    ? {
                        label: 'Add a task',
                        onClick: () => openCreateTask(getSuggestedCategoryId()),
                        icon: Plus,
                      }
                    : {
                        label: 'Add category',
                        onClick: () => setIsCategoryModalOpen(true),
                        icon: FolderPlus,
                      }
                }
              />
              <div className="flex gap-6 overflow-x-auto pb-2">
                <AddCategoryButton onClick={() => setIsCategoryModalOpen(true)} />
              </div>
            </div>
          ) : (
            <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <Droppable droppableId="categories" direction="horizontal" type="CATEGORY">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none"
                  >
                    {visibleCategories.map((category, index) => (
                      <CategorySection
                        key={category.id}
                        category={category}
                        index={index}
                        tasks={getTasksByCategory(category.id)}
                        onOpenDetail={handleOpenDetail}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleComplete={handleToggleComplete}
                        onEditCategory={handleEditCategory}
                        onDeleteCategory={handleDeleteCategory}
                        togglingTaskIds={togglingTaskIds}
                        onAddTask={(cat) => openCreateTask(cat?.id || category.id)}
                        searchQuery={searchQuery}
                        isDraggingCategory={isDraggingCategory}
                        canEdit={userCanEdit}
                      />
                    ))}
                    {provided.placeholder}

                    {/* Add Category Button - only show for users who can edit */}
                    {userCanEdit && <AddCategoryButton onClick={() => setIsCategoryModalOpen(true)} />}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={editingTask}
        defaultCategoryId={defaultCategoryId}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={handleCloseCategoryModal}
        category={editingCategory}
      />

      {/* Delete Task Confirmation Modal */}
      {deletingTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={cancelDelete}
          ></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
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

      {/* Delete Category Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={cancelDeleteCategory}
          ></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Delete Category
              </h3>
              <p className="text-neutral-600 mb-6">
                Are you sure you want to delete the category "{deletingCategory.name}"? All tasks in this category will need to be reassigned.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteCategory}
                  className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all duration-200"
                  disabled={isDeletingCategory}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteCategory}
                  className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={isDeletingCategory}
                >
                  {isDeletingCategory && <ButtonSpinner />}
                  {isDeletingCategory ? 'Deleting...' : 'Delete'}
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

export default TaskList;
