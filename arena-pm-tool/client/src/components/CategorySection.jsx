import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, Plus, GripVertical } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
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
    <Draggable draggableId={`category-${category.id}`} index={index}>
      {(categoryProvided, categorySnapshot) => (
        <div
          ref={categoryProvided.innerRef}
          {...categoryProvided.draggableProps}
          className={`flex-shrink-0 min-w-[320px] w-80 snap-start transition-shadow duration-200 ${
            categorySnapshot.isDragging ? 'shadow-sm bg-[#F8F9FC] rounded-lg' : ''
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
                    className="p-1 text-[#D1D5DB] hover:text-[#94A3B8] cursor-grab active:cursor-grabbing transition-colors duration-150 flex-shrink-0"
                    title="Drag to reorder category"
                  >
                    <GripVertical size={14} />
                  </div>
                ) : (
                  <div className="w-6" /> /* Spacer for alignment */
                )}

                {/* Collapse/Expand Button */}
                <button
                  onClick={toggleCollapse}
                  className="text-[#94A3B8] hover:text-[#64748B] transition-all duration-150 p-0.5 flex-shrink-0"
                  title={isCollapsed ? 'Expand category' : 'Collapse category'}
                  aria-label={isCollapsed ? `Expand ${category.name} category` : `Collapse ${category.name} category`}
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>

                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                ></div>
                <h3 className="text-[13px] uppercase tracking-wide font-medium text-[#64748B] truncate">{category.name}</h3>
                <span className="font-mono text-xs sm:text-sm text-neutral-500 flex-shrink-0">({tasks.length})</span>
              </div>

              {/* Category Action Buttons - only show for users who can edit */}
              {canEdit && (
                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => onEditCategory(category)}
                    className="p-1.5 sm:p-1 text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F8F9FC] rounded-lg transition-all duration-150"
                    title="Edit category"
                    aria-label={`Edit ${category.name} category`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteCategory(category)}
                    className="p-1.5 sm:p-1 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
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
                className="w-full px-3 py-2 text-sm bg-transparent border-b border-transparent focus:border-primary-300 placeholder:text-[#94A3B8] text-neutral-900 outline-none transition-colors disabled:opacity-50"
              />
            </div>
          )}

          {/* Tasks - Droppable Area (disabled when category is being dragged or user is viewer) */}
          <Droppable droppableId={category.id.toString()} isDropDisabled={isDraggingCategory || !canEdit}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-3 transition-all duration-300 ease-in-out min-h-[50px] ${
                  isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[10000px] opacity-100 overflow-visible'
                } ${snapshot.isDraggingOver && !isDraggingCategory ? 'bg-primary-50 rounded-lg' : ''}`}
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
