import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Check, Calendar, ListTodo } from 'lucide-react';
import { Draggable } from '@hello-pangea/dnd';
import useUserStore from '../store/userStore';
import useTaskStore from '../store/taskStore';
import useWorkspaceStore from '../store/workspaceStore';
import DatePicker from './DatePicker';
import AssigneeDropdown from './AssigneeDropdown';
import { InlineSpinner } from './Loader';
import { getAvatarColor } from './AssigneeListItem';

const priorityStyles = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

const priorityDotColors = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
};

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

  const toLocalDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };

  const toUTCISOString = (date) =>
    date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString() : null;

  const formatDueDate = (date) => {
    if (!date) return null;
    try {
      const localDate = toLocalDate(date);
      return localDate ? format(localDate, 'MMM d') : null;
    } catch (error) {
      return null;
    }
  };

  const dueDateObj = toLocalDate(task.dueDate);
  const dueDate = formatDueDate(task.dueDate);
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isOverdue = dueDateObj && dueDateObj < todayLocal && task.status !== 'completed';
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

  // getAvatarColor is now imported from AssigneeListItem

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
              bg-white rounded-lg border border-gray-200
              ${compact ? 'p-2' : 'p-3'}
              hover:shadow-md hover:border-gray-300
              cursor-pointer transition-all duration-200
              ${isCompleted ? 'opacity-60' : ''}
              ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 ring-opacity-50' : ''}
            `}
          >
            {/* Header: Checkbox + Title */}
            <div className="flex items-start gap-2">
              <button
                onClick={handleToggleComplete}
                className={`
                  flex-shrink-0 w-5 h-5 rounded-full border-2
                  flex items-center justify-center transition-all
                  ${isCompleted
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                  }
                  ${isToggling ? 'opacity-70 cursor-not-allowed' : ''}
                `}
                disabled={isToggling}
                title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
              >
                {isToggling ? (
                  <InlineSpinner size="sm" />
                ) : (
                  isCompleted && <Check size={12} className="text-white" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h4 className={`
                  text-sm font-medium text-gray-900 leading-tight
                  ${isCompleted ? 'line-through text-gray-500' : ''}
                `}>
                  {task.title}
                </h4>
              </div>
            </div>

            {/* Description preview */}
            {!compact && task.description && (
              <p className="mt-1.5 ml-7 text-xs text-gray-500 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Subtasks progress */}
            {totalSubtasks > 0 && (
              <div className="mt-2 ml-7 flex items-center gap-1.5 text-xs text-gray-500">
                <ListTodo size={12} className="text-gray-400" />
                <span>{completedSubtasks}/{totalSubtasks}</span>
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
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
                    px-1.5 py-0.5 rounded text-xs font-medium border
                    flex items-center gap-1 hover:opacity-80 transition
                    ${priorityStyles[task.priority]}
                  `}
                  title="Change priority"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityDotColors[task.priority]}`} />
                  {task.priority}
                </button>

                {showPriorityDropdown && (
                  <div className="absolute left-0 mt-1 w-28 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      {priorities.map((priority) => (
                        <button
                          key={priority}
                          onClick={() => handlePrioritySelect(priority)}
                          className={`
                            w-full px-2 py-1.5 text-left text-xs font-medium
                            hover:bg-gray-50 flex items-center gap-2 transition
                            ${task.priority === priority ? 'bg-gray-50' : ''}
                          `}
                        >
                          <span className={`w-2 h-2 rounded-full ${priorityDotColors[priority]}`} />
                          {priority}
                          {task.priority === priority && (
                            <Check size={12} className="ml-auto text-gray-600" />
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
                    hover:bg-gray-100 rounded transition text-xs
                    ${isOverdue ? 'text-red-600 font-medium bg-red-50' : 'text-gray-500'}
                  `}
                  title="Change due date"
                >
                  <Calendar size={12} />
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
                          className={`
                            w-6 h-6 rounded-full flex items-center justify-center
                            text-white text-xs font-semibold border-2 border-white
                            ${getAvatarColor(assignee.name)}
                          `}
                          style={{ zIndex: 2 - idx }}
                          title={assignee.name}
                        >
                          {assignee.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {(task.assignees || []).length > 2 && (
                        <div
                          className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                          title={`+${(task.assignees || []).length - 2} more`}
                        >
                          +{(task.assignees || []).length - 2}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">?</span>
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
