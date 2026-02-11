import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Check, ChevronDown, Calendar } from 'lucide-react';
import { Draggable } from '@hello-pangea/dnd';
import useUserStore from '../store/userStore';
import useTaskStore from '../store/taskStore';
import useWorkspaceStore from '../store/workspaceStore';
import { toLocalDate, toUTCISOString, formatDueDate, isOverdue as checkIsOverdue } from '../utils/dateUtils';
import { priorityPillStyles, priorityBorderColors } from '../utils/priorityStyles';
import DatePicker from './DatePicker';
import AssigneeDropdown from './AssigneeDropdown';
import { InlineSpinner } from './Loader';

function TaskItem({ task, index, onOpenDetail, onEdit, onDelete, onToggleComplete, isToggling = false, searchQuery = '', canEdit = true, noDrag = false }) {
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const assigneeDropdownRef = useRef(null);
  const datePickerRef = useRef(null);
  const priorityDropdownRef = useRef(null);
  const titleInputRef = useRef(null);
  const { users, fetchUsers } = useUserStore();
  const { updateTask } = useTaskStore();
  const { currentWorkspaceId } = useWorkspaceStore();
  const dueDateObj = toLocalDate(task.dueDate);
  const dueDate = formatDueDate(task.dueDate);
  const isOverdue = checkIsOverdue(task.dueDate, task.status);

  const avatarColors = ['bg-primary', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-violet-500'];

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(task);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(task);
  };

  const handleToggleComplete = (e) => {
    e.stopPropagation();
    if (isToggling) return;
    onToggleComplete(task);
  };

  const isCompleted = task.status === 'completed';

  // Fetch users on mount
  useEffect(() => {
    if (currentWorkspaceId) {
      fetchUsers(currentWorkspaceId);
    }
  }, [currentWorkspaceId, fetchUsers]);

  // Auto-focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Note: Click-outside for assignee dropdown is handled by AssigneeDropdown component

  // Close priority dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) {
        setShowPriorityDropdown(false);
      }
    };

    if (showPriorityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPriorityDropdown]);

  // Close all dropdowns when search query changes
  useEffect(() => {
    setShowPriorityDropdown(false);
    setShowAssigneeDropdown(false);
    setShowDatePicker(false);
  }, [searchQuery]);

  const handleAssigneeClick = (e) => {
    e.stopPropagation();
    if (!canEdit) return;
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
    if (!canEdit) return;
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
    if (!canEdit) return;
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

  const handleTitleClick = (e) => {
    e.stopPropagation();
    if (!canEdit) return;
    setIsEditingTitle(true);
  };

  const handleTitleChange = (e) => {
    setEditedTitle(e.target.value);
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      try {
        await updateTask(task.id, { title: editedTitle.trim() });
      } catch (error) {
        // Error is handled in taskStore
        setEditedTitle(task.title); // Revert on error
      }
    }
    setIsEditingTitle(false);
  };

  const handleTitleBlur = () => {
    handleTitleSave();
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setIsEditingTitle(false);
    }
  };

  const handleCardClick = (e) => {
    // Don't open detail if clicking on interactive elements
    // Also check if assignee dropdown is open (it's rendered in a portal, so closest won't find it)
    if (
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('[data-dropdown]') ||
      showAssigneeDropdown
    ) {
      return;
    }
    onOpenDetail?.(task);
  };

  const cardBody = (provided, snapshot) => (
        <div
          ref={provided?.innerRef}
          {...(provided?.draggableProps || {})}
          {...(canEdit && provided?.dragHandleProps ? provided.dragHandleProps : {})}
          onClick={handleCardClick}
          className={`bg-card border border-border rounded-xl p-3 sm:p-4 shadow-card hover:-translate-y-[1px] hover:shadow-elevated transition-all duration-150 cursor-pointer border-l-[3px] ${priorityBorderColors[task.priority] || ''} ${canEdit && !noDrag ? 'active:cursor-grabbing' : ''} group relative ${
            isCompleted ? 'opacity-50' : ''
          } ${snapshot?.isDragging ? 'shadow-elevated' : ''}`}
        >
          {/* Action Buttons - visible on mobile, hover on desktop (hidden for viewers) */}
          {canEdit && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleEdit}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all duration-150"
                title="Edit task"
                aria-label="Edit task"
              >
                <Pencil size={14} className="sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
                title="Delete task"
                aria-label="Delete task"
              >
                <Trash2 size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          )}

      {/* Completion Checkbox and Title */}
      <div className="flex items-start gap-3 mb-2">
        <button
          onClick={handleToggleComplete}
          className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
            isCompleted
              ? 'bg-primary border-primary'
              : 'border-input hover:border-neutral-500'
          } ${isToggling || !canEdit ? 'opacity-70 cursor-not-allowed' : ''}`}
          disabled={isToggling || !canEdit}
          title={!canEdit ? 'View only access' : isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isToggling ? (
            <InlineSpinner size="sm" />
          ) : (
            isCompleted && <Check size={14} className="text-primary-foreground" />
          )}
        </button>

        {/* Editable Title */}
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editedTitle}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 pr-16 font-medium text-foreground border-b-2 border-primary focus:outline-none bg-transparent"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h4
            onClick={handleTitleClick}
            className={`font-medium text-foreground flex-1 pr-16 ${canEdit ? 'cursor-text hover:bg-accent' : 'cursor-default'} rounded-lg px-1 -mx-1 transition-all duration-150 ${
              isCompleted ? 'line-through text-muted-foreground' : ''
            }`}
            title={canEdit ? 'Click to edit' : ''}
          >
            {task.title}
          </h4>
        )}
      </div>

      {/* Task Description */}
      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Subtask Count */}
      {task.subtaskCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>{task.completedSubtaskCount}/{task.subtaskCount} subtasks completed</span>
        </div>
      )}

      {/* Task Metadata - stacks on mobile */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {/* Priority Badge - clickable with dropdown */}
        <div className="relative" ref={priorityDropdownRef}>
          <button
            onClick={handlePriorityClick}
            className={`px-2 py-0.5 sm:py-1 rounded-md text-xs font-medium border hover:opacity-80 transition flex items-center gap-1 ${priorityPillStyles[task.priority] || priorityPillStyles.medium}`}
            title="Change priority"
          >
            {task.priority}
            <ChevronDown size={10} />
          </button>

          {/* Priority Dropdown */}
          {showPriorityDropdown && (
            <div className="absolute left-0 mt-1 w-32 bg-card border border-border rounded-lg shadow-sm z-50 animate-fade-in">
              <div className="py-1">
                {priorities.map((priority) => (
                  <button
                    key={priority}
                    onClick={() => handlePrioritySelect(priority)}
                    className={`w-full px-3 py-2 text-left text-xs font-medium hover:bg-accent flex items-center justify-between transition-all duration-150 ${
                      task.priority === priority ? 'bg-accent' : ''
                    }`}
                  >
                    <span className={`px-2 py-1 rounded-md border ${priorityPillStyles[priority] || priorityPillStyles.medium}`}>
                      {priority}
                    </span>
                    {task.priority === priority && (
                      <Check size={14} className="text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Due Date - clickable with calendar popup */}
        <div className="relative" ref={datePickerRef}>
          <button
            onClick={handleDateClick}
            className={`flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg transition-all duration-150 text-xs ${
              isOverdue
                ? 'text-red-600 font-medium bg-red-50 border border-red-200'
                : 'text-muted-foreground hover:bg-accent'
            }`}
            title={isOverdue ? 'Overdue - click to change due date' : 'Change due date'}
          >
            <Calendar size={12} />
            {dueDate ? (
              <>
                {isOverdue && <span className="font-semibold">Overdue</span>}
                {isOverdue && <span className="mx-0.5">·</span>}
                {dueDate}
              </>
            ) : (
              <span className="hidden sm:inline">Set date</span>
            )}
          </button>

        </div>

        {/* Spacer for desktop alignment */}
        <div className="flex-1 hidden sm:block"></div>

        {/* Assignees - Avatar stack with multi-select dropdown */}
        <div className="relative" ref={assigneeDropdownRef} data-dropdown>
          <button
            onClick={handleAssigneeClick}
            className="flex items-center hover:bg-accent rounded-lg px-1.5 py-0.5 sm:py-1 transition-all duration-150"
            title="Manage assignees"
          >
            {(task.assignees || []).length > 0 ? (
              <div className="flex items-center">
                {/* Avatar Stack */}
                <div className="flex -space-x-1.5">
                  {(task.assignees || []).slice(0, 3).map((assignee, idx) => (
                    <div
                      key={assignee.id}
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${avatarColors[assignee.name.charCodeAt(0) % avatarColors.length]} flex items-center justify-center text-white text-xs font-medium border-2 border-white`}
                      style={{ zIndex: 3 - idx }}
                      title={assignee.name}
                    >
                      {assignee.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {(task.assignees || []).length > 3 && (
                    <div
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-neutral-400 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                      title={`+${(task.assignees || []).length - 3} more`}
                    >
                      +{(task.assignees || []).length - 3}
                    </div>
                  )}
                </div>
                <ChevronDown size={10} className="text-muted-foreground ml-1" />
              </div>
            ) : (
              <>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-neutral-300 flex items-center justify-center text-white text-xs font-medium">
                  ?
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline ml-1">Assign</span>
                <ChevronDown size={10} className="text-muted-foreground ml-0.5" />
              </>
            )}
          </button>

          {/* Assignee Multi-Select Dropdown */}
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
  );

  return (
    <>
    {noDrag ? (
      cardBody(null, null)
    ) : (
      <Draggable draggableId={task.id.toString()} index={index} isDragDisabled={!canEdit}>
        {(provided, snapshot) => cardBody(provided, snapshot)}
      </Draggable>
    )}
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

export default TaskItem;
