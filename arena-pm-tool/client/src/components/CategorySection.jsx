import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, Plus, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './TaskItem';
import EmptyState from './EmptyState';
import useTaskStore from '../store/taskStore';

function CategorySection({
  category,
  tasks,
  onOpenDetail,
  onEdit,
  onDelete,
  onToggleComplete,
  onEditCategory,
  onDeleteCategory,
  togglingTaskIds = new Set(),
  onAddTask,
  searchQuery = '',
  index,
  isDraggingCategory = false,
  canEdit = true,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const quickAddRef = useRef(null);
  const { createTask } = useTaskStore();

  // Make the category itself sortable (for reordering columns)
  const {
    attributes: categoryAttributes,
    listeners: categoryListeners,
    setNodeRef: setCategoryNodeRef,
    transform: categoryTransform,
    transition: categoryTransition,
    isDragging: isCategoryDragging,
  } = useSortable({
    id: `category-${category.id}`,
    data: { type: 'category', category },
  });

  // Make the task area a drop zone (for receiving tasks from other columns)
  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: `column-${category.id}`,
    data: { type: 'column', categoryId: category.id },
  });

  const categoryStyle = {
    transform: CSS.Transform.toString(categoryTransform),
    transition: categoryTransition,
    opacity: isCategoryDragging ? 0.4 : 1,
  };

  const taskIds = tasks.map(t => `task-${t.id}`);

  const handleQuickAdd = async (e) => {
    if (e.key !== 'Enter') return;
    const title = quickAddTitle.trim();
    if (!title) return;

    setIsQuickAdding(true);
    try {
      await createTask({ title, category_id: category.id, priority: 'medium' });
      setQuickAddTitle('');
    } finally {
      setIsQuickAdding(false);
      quickAddRef.current?.focus();
    }
  };

  // Load collapse state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`category-collapsed-${category.id}`);
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, [category.id]);

  // Save collapse state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(`category-collapsed-${category.id}`, newState.toString());
  };

  return (
    <div
      ref={setCategoryNodeRef}
      style={categoryStyle}
      {...categoryAttributes}
      className={`flex-shrink-0 w-[85vw] max-w-72 md:w-80 lg:w-auto lg:flex-1 snap-start transition-shadow duration-200 ${
        isCategoryDragging ? 'shadow-sm bg-background rounded-lg' : ''
      }`}
    >
      {/* Category Header */}
      <div className="mb-3 sm:mb-4 group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {/* Drag Handle - only show for users who can edit */}
            {canEdit ? (
              <div
                {...categoryListeners}
                className="p-1 text-muted-foreground cursor-grab active:cursor-grabbing transition-colors duration-150 flex-shrink-0 touch-manipulation"
                title="Drag to reorder category"
              >
                <GripVertical size={16} />
              </div>
            ) : (
              <div className="w-6" /> /* Spacer for alignment */
            )}

            {/* Collapse/Expand Button */}
            <button
              onClick={toggleCollapse}
              className="text-muted-foreground hover:text-foreground transition-all duration-150 p-2 md:p-0.5 flex-shrink-0 touch-manipulation touch-target-44 md:min-w-0 md:min-h-0"
              title={isCollapsed ? 'Expand category' : 'Collapse category'}
              aria-label={isCollapsed ? `Expand ${category.name} category` : `Collapse ${category.name} category`}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>

            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
            ></div>
            <h3 className="text-sm font-semibold text-foreground tracking-wide truncate">{category.name}</h3>
            <span className="font-mono text-xs sm:text-sm text-muted-foreground flex-shrink-0">({tasks.length})</span>
          </div>

          {/* Category Action Buttons - only show for users who can edit */}
          {canEdit && (
            <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => onEditCategory(category)}
                className="p-1.5 sm:p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all duration-150"
                title="Edit category"
                aria-label={`Edit ${category.name} category`}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDeleteCategory(category)}
                className="p-1.5 sm:p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-150"
                title="Delete category"
                aria-label={`Delete ${category.name} category`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline Quick-Add */}
      {canEdit && !isCollapsed && (
        <div className="mb-3">
          <input
            ref={quickAddRef}
            type="text"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onKeyDown={handleQuickAdd}
            placeholder="Add a task..."
            disabled={isQuickAdding}
            className="w-full border border-dashed border-border rounded-md px-3 py-2 text-sm bg-transparent placeholder:text-muted-foreground text-foreground outline-none hover:border-primary/50 hover:text-foreground focus:border-primary focus:ring-1 focus:ring-ring cursor-pointer transition-colors disabled:opacity-50"
          />
        </div>
      )}

      {/* Tasks - Droppable Area */}
      <div ref={setDropNodeRef}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div
            className={`space-y-3 transition-all duration-300 ease-in-out min-h-[50px] ${
              isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[10000px] opacity-100 overflow-visible'
            } ${isOver && !isDraggingCategory ? 'bg-accent rounded-lg p-2' : ''}`}
          >
            {tasks.length > 0 ? (
              tasks.map((task, taskIndex) => (
              <TaskItem
                key={task.id}
                task={task}
                index={taskIndex}
                onOpenDetail={onOpenDetail}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleComplete={onToggleComplete}
                isToggling={togglingTaskIds.has(task.id)}
                searchQuery={searchQuery}
                canEdit={canEdit}
              />
            ))
          ) : (
            <EmptyState
              icon={Plus}
              title="No tasks here yet"
              description={
                isOver
                  ? 'Drop a task to move it into this category.'
                  : canEdit
                    ? 'Add a task to get this category moving.'
                    : 'No tasks in this category.'
              }
              tone="ghost"
              size="sm"
              className="bg-white/80"
              primaryAction={
                onAddTask && canEdit
                  ? {
                      label: 'Add task',
                      onClick: () => onAddTask(category),
                      icon: Plus,
                    }
                  : undefined
              }
            />
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default CategorySection;
