import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  X, Check, Calendar, User, FolderOpen, Flag,
  ChevronDown, MoreHorizontal, Trash2
} from 'lucide-react';
import useTaskStore from '../store/taskStore';
import useCategoryStore from '../store/categoryStore';
import useUserStore from '../store/userStore';
import DatePicker from './DatePicker';
import AssigneeDropdown from './AssigneeDropdown';
import SubtaskList from './SubtaskList';
import CommentSection from './CommentSection';
import { ButtonSpinner, InlineSpinner } from './Loader';
import { getAvatarColor } from './AssigneeListItem';

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500' },
  high: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100', dot: 'bg-yellow-500' },
  low: { label: 'Low', color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' },
};

function TaskDetailModal({ task, isOpen, onClose, onDelete }) {
  const { updateTask } = useTaskStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { users, fetchUsers } = useUserStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingComplete, setIsTogglingComplete] = useState(false);

  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const titleInputRef = useRef(null);
  const descriptionRef = useRef(null);
  const datePickerRef = useRef(null);
  const assigneeDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const priorityDropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const modalRef = useRef(null);

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
      return localDate ? format(localDate, 'MMM d, yyyy') : null;
    } catch (error) {
      return null;
    }
  };

  const dueDateObj = toLocalDate(task?.dueDate);
  const formattedDueDate = formatDueDate(task?.dueDate);
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isOverdue = dueDateObj && dueDateObj < todayLocal && task?.status !== 'completed';
  const isCompleted = task?.status === 'completed';

  // Initialize form values
  useEffect(() => {
    if (task) {
      setEditedTitle(task.title || '');
      setEditedDescription(task.description || '');
    }
  }, [task]);

  // Fetch users and categories on mount
  useEffect(() => {
    fetchUsers();
    fetchCategories();
  }, [fetchUsers, fetchCategories]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isEditingTitle || isEditingDescription) {
          setIsEditingTitle(false);
          setIsEditingDescription(false);
          setEditedTitle(task?.title || '');
          setEditedDescription(task?.description || '');
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, isEditingTitle, isEditingDescription, task, onClose]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target)) {
        setShowAssigneeDropdown(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) {
        setShowPriorityDropdown(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Auto-focus description when editing
  useEffect(() => {
    if (isEditingDescription && descriptionRef.current) {
      descriptionRef.current.focus();
    }
  }, [isEditingDescription]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSaveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      setIsSaving(true);
      try {
        await updateTask(task.id, { title: editedTitle.trim() });
      } catch (error) {
        setEditedTitle(task.title);
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (editedDescription !== task.description) {
      setIsSaving(true);
      try {
        await updateTask(task.id, { description: editedDescription });
      } catch (error) {
        setEditedDescription(task.description || '');
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditingDescription(false);
  };

  const handleToggleComplete = async () => {
    if (isTogglingComplete) return;
    setIsTogglingComplete(true);
    try {
      const newStatus = isCompleted ? 'todo' : 'completed';

      // Find the Completed category and To Do category
      const completedCategory = categories.find(c => c.name === 'Completed');
      const todoCategory = categories.find(c => c.name === 'To Do');

      // Determine the new category based on completion status
      let newCategoryId = task.categoryId;
      if (newStatus === 'completed' && completedCategory) {
        newCategoryId = completedCategory.id;
      } else if (newStatus === 'todo' && todoCategory) {
        newCategoryId = todoCategory.id;
      }

      await updateTask(task.id, {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        category_id: newCategoryId,
      });
    } finally {
      setIsTogglingComplete(false);
    }
  };

  // Toggle assignee (add or remove) for multiple assignees
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
      // Error handled in store
    }
  };

  const handleCategorySelect = async (categoryId) => {
    try {
      await updateTask(task.id, { category_id: categoryId });
      setShowCategoryDropdown(false);
    } catch (error) {
      // Error handled in store
    }
  };

  const handlePrioritySelect = async (priority) => {
    try {
      await updateTask(task.id, { priority });
      setShowPriorityDropdown(false);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleDateSelect = async (date) => {
    try {
      const formattedDate = toUTCISOString(date);
      await updateTask(task.id, { due_date: formattedDate });
      setShowDatePicker(false);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleClearDate = async () => {
    try {
      await updateTask(task.id, { due_date: null });
      setShowDatePicker(false);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleDelete = () => {
    setShowMoreMenu(false);
    onDelete?.(task);
  };

  // getAvatarColor is now imported from AssigneeListItem

  if (!isOpen || !task) return null;

  const currentCategory = categories.find(c => c.id === task.categoryId);
  const currentPriority = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal Container */}
      <div className="flex min-h-full items-start justify-center p-4 pt-16 sm:pt-20">
        <div
          ref={modalRef}
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {/* Completion checkbox */}
              <button
                onClick={handleToggleComplete}
                disabled={isTogglingComplete}
                className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                  ${isCompleted
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                  }
                  ${isTogglingComplete ? 'opacity-60 cursor-not-allowed' : ''}
                `}
                title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
              >
                {isTogglingComplete ? (
                  <InlineSpinner size="sm" />
                ) : (
                  isCompleted && <Check size={14} className="text-white" />
                )}
              </button>
              <span className={`text-sm font-medium ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                {isCompleted ? 'Completed' : 'Mark complete'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* More menu */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <MoreHorizontal size={20} />
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                      Delete task
                    </button>
                  </div>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4">
              {/* Task Title */}
              <div className="mb-6">
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') {
                        setEditedTitle(task.title);
                        setIsEditingTitle(false);
                      }
                    }}
                    className="w-full text-xl font-semibold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent pb-1"
                    placeholder="Task title"
                  />
                ) : (
                  <h2
                    onClick={() => setIsEditingTitle(true)}
                    className={`
                      text-xl font-semibold cursor-text hover:bg-gray-50 rounded px-2 py-1 -mx-2
                      ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}
                    `}
                    title="Click to edit"
                  >
                    {task.title}
                  </h2>
                )}
              </div>

              {/* Task Fields */}
              <div className="space-y-4 mb-6">
                {/* Assignees - Multiple assignees with chips */}
                <div className="flex items-start gap-4">
                  <div className="w-24 flex items-center gap-2 text-sm text-gray-500 pt-1.5">
                    <User size={16} />
                    <span>Assignees</span>
                  </div>
                  <div className="relative flex-1" ref={assigneeDropdownRef}>
                    {/* Display selected assignees as chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(task.assignees || []).map((assignee) => (
                        <span
                          key={assignee.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-full text-sm border border-teal-200"
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(assignee.name)}`}>
                            {assignee.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="max-w-[100px] truncate">{assignee.name}</span>
                          <button
                            type="button"
                            onClick={() => handleAssigneeToggle(assignee.id)}
                            className="ml-0.5 p-0.5 hover:bg-teal-100 rounded-full transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-lg transition text-sm"
                    >
                      {(task.assignees || []).length === 0 ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                            <User size={14} className="text-gray-400" />
                          </div>
                          <span className="text-gray-400">Add assignee</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-500 text-xs">+ Add more</span>
                        </>
                      )}
                      <ChevronDown size={14} className="ml-auto text-gray-400" />
                    </button>

                    {showAssigneeDropdown && (
                      <AssigneeDropdown
                        users={users}
                        selectedIds={(task?.assignees || []).map(a => a.id)}
                        onToggle={handleAssigneeToggle}
                        onClose={() => setShowAssigneeDropdown(false)}
                        triggerRef={assigneeDropdownRef}
                        variant="multi"
                      />
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-4">
                  <div className="w-24 flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={16} />
                    <span>Due date</span>
                  </div>
                  <div className="relative flex-1" ref={datePickerRef}>
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className={`flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-lg transition text-sm ${isOverdue ? 'text-red-600' : ''}`}
                    >
                      <Calendar size={16} className={isOverdue ? 'text-red-500' : 'text-gray-400'} />
                      <span className={formattedDueDate ? (isOverdue ? 'text-red-600 font-medium' : 'text-gray-900') : 'text-gray-400'}>
                        {formattedDueDate || 'Add due date'}
                      </span>
                      {formattedDueDate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearDate();
                          }}
                          className="ml-1 p-0.5 hover:bg-gray-200 rounded transition"
                          title="Clear date"
                        >
                          <X size={12} className="text-gray-400" />
                        </button>
                      )}
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div className="flex items-center gap-4">
                  <div className="w-24 flex items-center gap-2 text-sm text-gray-500">
                    <FolderOpen size={16} />
                    <span>Category</span>
                  </div>
                  <div className="relative flex-1" ref={categoryDropdownRef}>
                    <button
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-lg transition text-sm"
                    >
                      {currentCategory ? (
                        <>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: currentCategory.color }}
                          />
                          <span className="text-gray-900">{currentCategory.name}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">Select category</span>
                      )}
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {showCategoryDropdown && (
                      <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div className="py-1">
                          {categories.map((category) => (
                            <button
                              key={category.id}
                              onClick={() => handleCategorySelect(category.id)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${task.categoryId === category.id ? 'bg-gray-50' : ''}`}
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <span>{category.name}</span>
                              {task.categoryId === category.id && <Check size={14} className="ml-auto text-gray-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority */}
                <div className="flex items-center gap-4">
                  <div className="w-24 flex items-center gap-2 text-sm text-gray-500">
                    <Flag size={16} />
                    <span>Priority</span>
                  </div>
                  <div className="relative flex-1" ref={priorityDropdownRef}>
                    <button
                      onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-lg transition text-sm"
                    >
                      <div className={`w-2 h-2 rounded-full ${currentPriority.dot}`} />
                      <span className={currentPriority.color}>{currentPriority.label}</span>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {showPriorityDropdown && (
                      <div className="absolute left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div className="py-1">
                          {Object.entries(priorityConfig).map(([key, config]) => (
                            <button
                              key={key}
                              onClick={() => handlePrioritySelect(key)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${task.priority === key ? 'bg-gray-50' : ''}`}
                            >
                              <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                              <span className={config.color}>{config.label}</span>
                              {task.priority === key && <Check size={14} className="ml-auto text-gray-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-6" />

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                {isEditingDescription ? (
                  <div>
                    <textarea
                      ref={descriptionRef}
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Add a description..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveDescription}
                        disabled={isSaving}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving && <ButtonSpinner />}
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditedDescription(task.description || '');
                          setIsEditingDescription(false);
                        }}
                        className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-100 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDescription(true)}
                    className="min-h-[60px] px-3 py-2 rounded-lg hover:bg-gray-50 cursor-text transition"
                  >
                    {task.description ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
                    ) : (
                      <p className="text-sm text-gray-400">Add a description...</p>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-6" />

              {/* Subtasks */}
              <div className="mb-6">
                <SubtaskList
                  taskId={task.id}
                  categoryId={task.categoryId}
                />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-6" />

              {/* Comments */}
              <div>
                <CommentSection taskId={task.id} />
              </div>
            </div>
          </div>

          {/* Footer with metadata */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>
                Created {task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy') : 'unknown'}
                {task.createdByName && ` by ${task.createdByName}`}
              </span>
              {task.updatedAt && (
                <span>
                  Updated {format(new Date(task.updatedAt), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date Picker Portal */}
      {showDatePicker && (
        <DatePicker
          selected={dueDateObj}
          onSelect={handleDateSelect}
          onClose={() => setShowDatePicker(false)}
          triggerRef={datePickerRef}
        />
      )}
    </div>
  );
}

export default TaskDetailModal;
