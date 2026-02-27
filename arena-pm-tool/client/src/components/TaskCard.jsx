import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, Calendar, ListTodo } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import useUserStore from '../store/userStore';
import useTaskStore from '../store/taskStore';
import useWorkspaceStore from '../store/workspaceStore';
import { toLocalDate, toUTCISOString, formatDueDate, isOverdue as checkIsOverdue } from '../utils/dateUtils';
import { priorityStyles, priorityDotColors, priorityPillStyles, priorityBorderColors } from '../utils/priorityStyles';
import DatePicker from './DatePicker';
import AssigneeDropdown from './AssigneeDropdown';

const avatarColors = ['bg-primary', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-violet-500'];

function TaskCard({
  task,
  index,
  onOpenDetail,
  onEdit,
  onDelete,
  onToggleComplete,
  isToggling = false,
  compact = false
}) {
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const assigneeDropdownRef = useRef(null);
  const datePickerRef = useRef(null);
  const priorityDropdownRef = useRef(null);
  const priorityPortalRef = useRef(null);
  const [priorityDropdownPos, setPriorityDropdownPos] = useState({ top: 0, left: 0 });
  const { users, fetchUsers } = useUserStore();
  const { updateTask } = useTaskStore();
  const { currentWorkspaceId } = useWorkspaceStore();

  const dueDateObj = toLocalDate(task.dueDate);
  const dueDate = formatDueDate(task.dueDate);
  const isOverdue = checkIsOverdue(task.dueDate, task.status);
  const isCompleted = task.status === 'completed';

  const completedSubtasks = task.completedSubtaskCount || 0;
  const totalSubtasks = task.subtaskCount || 0;

  useEffect(() => {
    if (currentWorkspaceId) {
      fetchUsers(currentWorkspaceId);
    }
  }, [currentWorkspaceId, fetchUsers]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target)) {
        setShowAssigneeDropdown(false);
      }
      if (
        priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target) &&
        priorityPortalRef.current && !priorityPortalRef.current.contains(event.target)
      ) {
        setShowPriorityDropdown(false);
      }
    };

    if (showAssigneeDropdown || showPriorityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAssigneeDropdown, showPriorityDropdown]);

  // Update priority dropdown position on scroll/resize
  const updatePriorityPosition = useCallback(() => {
    if (!priorityDropdownRef.current) return;
    const rect = priorityDropdownRef.current.getBoundingClientRect();
    const dropdownHeight = 4 * 36 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= dropdownHeight
      ? rect.bottom + 4
      : rect.top - dropdownHeight - 4;
    setPriorityDropdownPos({
      top: Math.max(8, top),
      left: rect.left,
    });
  }, []);

  useEffect(() => {
    if (!showPriorityDropdown) return;
    updatePriorityPosition();
    window.addEventListener('resize', updatePriorityPosition);
    window.addEventListener('scroll', updatePriorityPosition, true);
    return () => {
      window.removeEventListener('resize', updatePriorityPosition);
      window.removeEventListener('scroll', updatePriorityPosition, true);
    };
  }, [showPriorityDropdown, updatePriorityPosition]);

  const handleCardClick = (e) => {
    // Don't open detail if clicking on interactive elements
    if (
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('[data-dropdown]')
    ) {
      return;
    }
    onOpenDetail?.(task);
  };

  const handleToggleComplete = (e) => {
    e.stopPropagation();
    if (isToggling) return;
    onToggleComplete(task);
  };

  const handleAssigneeClick = (e) => {
    e.stopPropagation();
    setShowAssigneeDropdown(!showAssigneeDropdown);
  };

  // Toggle assignee (add if not present, remove if present)
  const handleAssigneeToggle = async (userId) => {
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

      await updateTask(task.id, { assignee_ids: newAssigneeIds });
    } catch (error) {
      // Error is handled in taskStore
    }
  };

  const handleDateClick = (e) => {
    e.stopPropagation();
    setShowDatePicker(!showDatePicker);
  };

  const handleDateSelect = async (date) => {
    try {
      const formattedDate = toUTCISOString(date);
      await updateTask(task.id, { due_date: formattedDate });
      setShowDatePicker(false);
    } catch (error) {
      // Error is handled in taskStore
    }
  };

  const handlePriorityClick = (e) => {
    e.stopPropagation();
    setShowPriorityDropdown(!showPriorityDropdown);
  };

  const handlePrioritySelect = async (priority) => {
    try {
      await updateTask(task.id, { priority });
      setShowPriorityDropdown(false);
    } catch (error) {
      // Error is handled in taskStore
    }
  };

  const priorities = ['low', 'medium', 'high', 'urgent'];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `taskcard-${task.id}`,
    data: { type: 'task', task },
  });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={sortableStyle}
        {...attributes}
        {...listeners}
        onClick={handleCardClick}
        className={`
          bg-card rounded-xl border border-border shadow-card
          hover:-translate-y-[1px] hover:shadow-elevated transition-all duration-150
          ${task.priority ? `border-l-[3px] ${priorityBorderColors[task.priority]}` : ''}
          p-3 space-y-2
          cursor-grab active:cursor-grabbing
          ${isCompleted ? 'opacity-50' : ''}
          ${isSortableDragging ? 'shadow-elevated border-border' : ''}
        `}
      >
            {/* Header: Checkbox + Title */}
            <div className="flex items-start gap-2">
              <button
                onClick={handleToggleComplete}
                className={`
                  flex-shrink-0 w-5 h-5 rounded-md border-2
                  flex items-center justify-center transition-all duration-150
                  ${isCompleted
                    ? 'bg-primary border-primary'
                    : 'border-input hover:border-neutral-500'
                  }
                  ${isToggling ? 'cursor-not-allowed' : ''}
                `}
                disabled={isToggling}
                title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
              >
                {isCompleted && <Check size={12} className="text-primary-foreground" />}
              </button>

              <div className="flex-1 min-w-0">
                <h4 className={`
                  font-medium text-foreground line-clamp-2 leading-snug
                  ${isCompleted ? 'line-through text-muted-foreground' : ''}
                `}>
                  {task.title}
                </h4>
              </div>
            </div>

            {/* Description preview */}
            {!compact && task.description && (
              <p className="ml-7 text-sm text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Subtasks progress */}
            {totalSubtasks > 0 && (
              <div className="ml-7 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ListTodo size={14} className="h-4 w-4 text-muted-foreground" />
                <span>{completedSubtasks}/{totalSubtasks}</span>
                <div className="flex-1 h-0.5 bg-accent rounded-full overflow-hidden max-w-[60px]">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Metadata Row: Priority, Due Date, Assignee */}
            <div className="ml-7 flex items-center gap-2 flex-wrap">
              {/* Priority Badge - looks like a badge, not a button */}
              <div className="relative" ref={priorityDropdownRef} data-dropdown>
                <button
                  onClick={handlePriorityClick}
                  className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                    hover:opacity-80 transition cursor-pointer
                    ${priorityPillStyles[task.priority]}
                  `}
                  title="Change priority"
                  aria-label={`Priority: ${task.priority}. Click to change`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityDotColors[task.priority]}`} />
                  {task.priority}
                </button>

              </div>

              {/* Due Date */}
              <div className="relative" ref={datePickerRef} data-dropdown>
                <button
                  onClick={handleDateClick}
                  className={`
                    inline-flex items-center gap-1.5 px-2 py-0.5
                    rounded-md transition text-xs cursor-pointer
                    ${isOverdue
                      ? 'text-red-600 font-medium bg-red-50 border border-red-200'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
                  `}
                  title={isOverdue ? 'Overdue - click to change due date' : 'Change due date'}
                  aria-label={`Due date: ${dueDate || 'none'}${isOverdue ? ' (overdue)' : ''}. Click to change`}
                >
                  <Calendar size={12} />
                  {isOverdue && <span className="font-semibold">Overdue</span>}
                  {isOverdue && dueDate && <span className="mx-0.5">·</span>}
                  {dueDate || 'No date'}
                </button>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Assignee Avatars */}
              <div className="relative" ref={assigneeDropdownRef} data-dropdown>
                <button
                  onClick={handleAssigneeClick}
                  className="flex items-center hover:opacity-80 transition cursor-pointer"
                  title={(task.assignees || []).length > 0
                    ? (task.assignees || []).map(a => a.name).join(', ')
                    : 'Assign someone'}
                  aria-label={(task.assignees || []).length > 0
                    ? `Assigned to: ${(task.assignees || []).map(a => a.name).join(', ')}. Click to change`
                    : 'No assignee. Click to assign someone'}
                >
                  {(task.assignees || []).length > 0 ? (
                    <div className="flex -space-x-1">
                      {(task.assignees || []).slice(0, 2).map((assignee, idx) => (
                        <div
                          key={assignee.id}
                          className={`w-6 h-6 rounded-full flex items-center justify-center
                            text-white text-[11px] font-semibold ring-1 ring-card
                            ${avatarColors[assignee.name.charCodeAt(0) % avatarColors.length]}`}
                          style={{ zIndex: 2 - idx }}
                          title={assignee.name}
                        >
                          {assignee.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {(task.assignees || []).length > 2 && (
                        <div
                          className="w-6 h-6 rounded-full bg-neutral-400 flex items-center justify-center text-white text-[11px] font-semibold ring-1 ring-card"
                          title={`+${(task.assignees || []).length - 2} more`}
                        >
                          +{(task.assignees || []).length - 2}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-input flex items-center justify-center">
                      <span className="text-muted-foreground text-[11px]">?</span>
                    </div>
                  )}
                </button>

                {showAssigneeDropdown && (
                  <AssigneeDropdown
                    users={users}
                    selectedIds={(task.assignees || []).map(a => a.id)}
                    onToggle={handleAssigneeToggle}
                    onClose={() => setShowAssigneeDropdown(false)}
                    triggerRef={assigneeDropdownRef}
                    variant="multi"
                  />
                )}
              </div>
            </div>
      </div>

      {showDatePicker && (
        <DatePicker
          selected={dueDateObj}
          onSelect={handleDateSelect}
          onClose={() => setShowDatePicker(false)}
          triggerRef={datePickerRef}
        />
      )}
      {showPriorityDropdown && createPortal(
        <div
          ref={priorityPortalRef}
          className="fixed w-28 bg-card border border-border rounded-lg shadow-elevated z-[100] p-1"
          style={{ top: `${priorityDropdownPos.top}px`, left: `${priorityDropdownPos.left}px` }}
        >
          {priorities.map((priority) => (
            <button
              key={priority}
              onClick={() => handlePrioritySelect(priority)}
              className={`
                w-full px-2 py-1.5 text-left text-xs font-medium rounded-md
                hover:bg-accent flex items-center gap-2 transition
                ${task.priority === priority ? 'bg-accent' : ''}
              `}
            >
              <span className={`w-2 h-2 rounded-full ${priorityDotColors[priority]}`} />
              {priority}
              {task.priority === priority && (
                <Check size={12} className="ml-auto text-primary" />
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default TaskCard;
