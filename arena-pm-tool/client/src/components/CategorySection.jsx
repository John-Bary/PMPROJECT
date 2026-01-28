import { useState, useEffect } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, Plus, GripVertical } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import TaskItem from './TaskItem';
import EmptyState from './EmptyState';

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
    <Draggable draggableId={`category-${category.id}`} index={index}>
      {(categoryProvided, categorySnapshot) => (
        <div
          ref={categoryProvided.innerRef}
          {...categoryProvided.draggableProps}
          className={`flex-shrink-0 w-72 sm:w-80 snap-start transition-shadow duration-200 ${
            categorySnapshot.isDragging ? 'shadow-xl bg-neutral-50 rounded-xl' : ''
          }`}
        >
          {/* Category Header */}
          <div className="mb-3 sm:mb-4 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                {/* Drag Handle - only show for users who can edit */}
                {canEdit ? (
                  <div
                    {...categoryProvided.dragHandleProps}
                    className="p-1 text-neutral-300 hover:text-neutral-500 cursor-grab active:cursor-grabbing transition-colors duration-150 flex-shrink-0"
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
                  className="text-neutral-400 hover:text-neutral-600 transition-all duration-150 p-0.5 flex-shrink-0"
                  title={isCollapsed ? 'Expand category' : 'Collapse category'}
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>

                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                ></div>
                <h3 className="font-semibold text-neutral-900 text-sm sm:text-base truncate">{category.name}</h3>
                <span className="text-xs sm:text-sm text-neutral-500 flex-shrink-0">({tasks.length})</span>
              </div>

              {/* Category Action Buttons - only show for users who can edit */}
              {canEdit && (
                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => onEditCategory(category)}
                    className="p-1.5 sm:p-1 text-neutral-400 sm:text-neutral-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-150"
                    title="Edit category"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteCategory(category)}
                    className="p-1.5 sm:p-1 text-neutral-400 sm:text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
                    title="Delete category"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tasks - Droppable Area (disabled when category is being dragged or user is viewer) */}
          <Droppable droppableId={category.id.toString()} isDropDisabled={isDraggingCategory || !canEdit}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-3 transition-all duration-300 ease-in-out min-h-[50px] ${
                  isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[10000px] opacity-100 overflow-visible'
                } ${snapshot.isDraggingOver && !isDraggingCategory ? 'bg-teal-50/50 rounded-xl' : ''}`}
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
                    snapshot.isDraggingOver
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
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );
}

export default CategorySection;
