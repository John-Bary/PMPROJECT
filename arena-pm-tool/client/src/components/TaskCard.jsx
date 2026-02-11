import { useState, useRef, useEffect } from 'react';
import { Check, Calendar, ListTodo } from 'lucide-react';
import { Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import useUserStore from '../store/userStore';
import useTaskStore from '../store/taskStore';
import useWorkspaceStore from '../store/workspaceStore';
import { toLocalDate, toUTCISOString, formatDueDate, isOverdue as checkIsOverdue } from '../utils/dateUtils';
import { priorityStyles, priorityDotColors, priorityPillStyles, priorityBorderColors } from '../utils/priorityStyles';
import DatePicker from './DatePicker';
import AssigneeDropdown from './AssigneeDropdown';
import { InlineSpinner } from './Loader';

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
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) {
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

  return (
    <>
      <Draggable draggableId={task.id.toString()} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={handleCardClick}
            className={`
              bg-card rounded-xl border border-border shadow-card
              hover:-translate-y-[1px] hover:shadow-elevated transition-all duration-150
              ${task.priority ? `border-l-[3px] ${priorityBorderColors[task.priority]}` : ''}
              ${compact ? 'p-2' : 'p-4'}
              cursor-pointer
              ${isCompleted ? 'opacity-50' : ''}
              ${snapshot.isDragging ? 'shadow-elevated border-border' : ''}
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
                  ${isToggling ? 'opacity-70 cursor-not-allowed' : ''}
                `}
                disabled={isToggling}
                title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
              >
                {isToggling ? (
                  <InlineSpinner size="sm" />
                ) : (
                  isCompleted && <Check size={12} className="text-primary-foreground" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h4 className={`
                  text-sm font-medium text-foreground line-clamp-2 leading-tight
                  ${isCompleted ? 'line-through text-muted-foreground' : ''}
                `}>
                  {task.title}
                </h4>
              </div>
            </div>

            {/* Description preview */}
            {!compact && task.description && (
              <p className="mt-1.5 ml-7 text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Subtasks progress */}
            {totalSubtasks > 0 && (
              <div className="mt-2 ml-7 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ListTodo size={12} className="text-muted-foreground" />
                <span>{completedSubtasks}/{totalSubtasks}</span>
                <div className="flex-1 h-0.5 bg-accent rounded-full overflow-hidden max-w-[60px]">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Footer: Priority, Due Date, Assignee */}
            <div className={`${compact ? 'mt-2' : 'mt-3'} ml-7 flex items-center gap-2 flex-wrap`}>
              {/* Priority Badge */}
              <div className="relative" ref={priorityDropdownRef} data-dropdown>
                <button
                  onClick={handlePriorityClick}
                  className={`
                    px-2 py-0.5 rounded-md text-xs font-medium border
                    flex items-center gap-1 hover:opacity-80 transition
                    ${priorityPillStyles[task.priority]}
                  `}
                  title="Change priority"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityDotColors[task.priority]}`} />
                  {task.priority}
                </button>

                {showPriorityDropdown && (
                  <div className="absolute left-0 mt-1 w-28 bg-card border border-border rounded-lg shadow-sm z-50">
                    <div className="py-1">
                      {priorities.map((priority) => (
                        <button
                          key={priority}
                          onClick={() => handlePrioritySelect(priority)}
                          className={`
                            w-full px-2 py-1.5 text-left text-xs font-medium
                            hover:bg-muted flex items-center gap-2 transition
                            ${task.priority === priority ? 'bg-muted' : ''}
                          `}
                        >
                          <span className={`w-2 h-2 rounded-full ${priorityDotColors[priority]}`} />
                          {priority}
                          {task.priority === priority && (
                            <Check size={12} className="ml-auto text-muted-foreground" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div className="relative" ref={datePickerRef} data-dropdown>
                <button
                  onClick={handleDateClick}
                  className={`
                    flex items-center gap-1 px-1.5 py-0.5
                    rounded transition text-xs
                    ${isOverdue
                      ? 'text-red-500 font-medium'
                      : 'text-muted-foreground hover:bg-accent'}
                  `}
                  title={isOverdue ? 'Overdue - click to change due date' : 'Change due date'}
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
                  className="flex items-center hover:opacity-80 transition"
                  title={(task.assignees || []).length > 0
                    ? (task.assignees || []).map(a => a.name).join(', ')
                    : 'Assign someone'}
                >
                  {(task.assignees || []).length > 0 ? (
                    <div className="flex -space-x-1">
                      {(task.assignees || []).slice(0, 2).map((assignee, idx) => (
                        <div
                          key={assignee.id}
                          className={`w-6 h-6 rounded-full flex items-center justify-center
                            text-white text-[11px] font-semibold ring-1 ring-white
                            ${avatarColors[assignee.name.charCodeAt(0) % avatarColors.length]}`}
                          style={{ zIndex: 2 - idx }}
                          title={assignee.name}
                        >
                          {assignee.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {(task.assignees || []).length > 2 && (
                        <div
                          className="w-6 h-6 rounded-full bg-neutral-400 flex items-center justify-center text-white text-[11px] font-semibold ring-1 ring-white"
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
        )}
      </Draggable>

      {showDatePicker && (
        <DatePicker
          selected={dueDateObj}
          onSelect={handleDateSelect}
          onClose={() => setShowDatePicker(false)}
          triggerRef={datePickerRef}
        />
      )}
    </>
  );
}

export default TaskCard;
