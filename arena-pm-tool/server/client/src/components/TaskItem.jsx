import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2, Check, ChevronDown, Calendar } from 'lucide-react';
import { Draggable } from '@hello-pangea/dnd';
import useUserStore from '../store/userStore';
import useTaskStore from '../store/taskStore';
import DatePicker from './DatePicker';
import AssigneeDropdown from './AssigneeDropdown';
import { InlineSpinner } from './Loader';

function TaskItem({ task, index, onOpenDetail, onEdit, onDelete, onToggleComplete, isToggling = false, searchQuery = '' }) {
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

  // Get priority color - muted Apple-like colors
  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]',
      high: 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]',
      medium: 'bg-[#fefce8] text-[#a16207] border-[#fef08a]',
      low: 'bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]',
    };
    return colors[priority] || colors.medium;
  };

  const dueDateObj = toLocalDate(task.dueDate);
  const dueDate = formatDueDate(task.dueDate);
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isOverdue = dueDateObj && dueDateObj < todayLocal && task.status !== 'completed';

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
    fetchUsers();
  }, [fetchUsers]);

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

  const handleTitleClick = (e) => {
    e.stopPropagation();
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

  return (
    <>
    <Draggable draggableId={task.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleCardClick}
          className={`bg-white border border-neutral-150 rounded-xl p-3 sm:p-4 hover:shadow transition-all duration-200 cursor-pointer active:cursor-grabbing group relative ${
            isCompleted ? 'opacity-60' : ''
          } ${snapshot.isDragging ? 'shadow-md cursor-grabbing' : ''}`}
        >
          {/* Action Buttons - visible on mobile, hover on desktop */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEdit}
              className="p-1.5 text-neutral-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-150"
              title="Edit task"
            >
              <Pencil size={14} className="sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150"
              title="Delete task"
            >
              <Trash2 size={14} className="sm:w-4 sm:h-4" />
            </button>
          </div>

      {/* Completion Checkbox and Title */}
      <div className="flex items-start gap-3 mb-2">
        <button
          onClick={handleToggleComplete}
          className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
            isCompleted
              ? 'bg-teal-500 border-teal-500'
              : 'border-neutral-300 hover:border-teal-500'
          } ${isToggling ? 'opacity-70 cursor-not-allowed' : ''}`}
          disabled={isToggling}
          title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isToggling ? (
            <InlineSpinner size="sm" />
          ) : (
            isCompleted && <Check size={14} className="text-white" />
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
            className="flex-1 pr-16 font-medium text-neutral-900 border-b-2 border-teal-500 focus:outline-none bg-transparent"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h4
            onClick={handleTitleClick}
            className={`font-medium text-neutral-900 flex-1 pr-16 cursor-text hover:bg-neutral-100 rounded-lg px-1 -mx-1 transition-all duration-150 ${
              isCompleted ? 'line-through text-neutral-500' : ''
            }`}
            title="Click to edit"
          >
            {task.title}
          </h4>
        )}
      </div>

      {/* Task Description */}
      {task.description && (
        <p className="text-sm text-neutral-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Subtask Count */}
      {task.subtaskCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-neutral-500 mb-3">
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
            className={`px-2 py-0.5 sm:py-1 rounded text-xs font-medium border hover:opacity-80 transition flex items-center gap-1 ${getPriorityColor(
              task.priority
            )}`}
            title="Change priority"
          >
            {task.priority}
            <ChevronDown size={10} />
          </button>

          {/* Priority Dropdown */}
          {showPriorityDropdown && (
            <div className="absolute left-0 mt-1 w-32 bg-white border border-neutral-150 rounded-xl shadow-lg z-50 animate-fade-in">
              <div className="py-1">
                {priorities.map((priority) => (
                  <button
                    key={priority}
                    onClick={() => handlePrioritySelect(priority)}
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

        {/* Due Date - clickable with calendar popup */}
        <div className="relative" ref={datePickerRef}>
          <button
            onClick={handleDateClick}
            className={`flex items-center gap-1 px-2 py-0.5 sm:py-1 hover:bg-neutral-100 rounded-lg transition-all duration-150 text-xs ${
              isOverdue ? 'text-red-500 font-medium' : 'text-neutral-500'
            }`}
            title="Change due date"
          >
            {dueDate ? (
              <>
                {isOverdue && '⚠️ '}
                {dueDate}
              </>
            ) : (
              <>
                <Calendar size={12} />
                <span className="hidden sm:inline">Set date</span>
              </>
            )}
          </button>

        </div>

        {/* Spacer for desktop alignment */}
        <div className="flex-1 hidden sm:block"></div>

        {/* Assignees - Avatar stack with multi-select dropdown */}
        <div className="relative" ref={assigneeDropdownRef} data-dropdown>
          <button
            onClick={handleAssigneeClick}
            className="flex items-center hover:bg-neutral-100 rounded-lg px-1.5 py-0.5 sm:py-1 transition-all duration-150"
            title="Manage assignees"
          >
            {(task.assignees || []).length > 0 ? (
              <div className="flex items-center">
                {/* Avatar Stack */}
                <div className="flex -space-x-1.5">
                  {(task.assignees || []).slice(0, 3).map((assignee, idx) => (
                    <div
                      key={assignee.id}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
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
                <ChevronDown size={10} className="text-neutral-400 ml-1" />
              </div>
            ) : (
              <>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-neutral-300 flex items-center justify-center text-white text-xs font-medium">
                  ?
                </div>
                <span className="text-xs text-neutral-500 hidden sm:inline ml-1">Assign</span>
                <ChevronDown size={10} className="text-neutral-400 ml-0.5" />
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

export default TaskItem;
