import React, { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import useFocusTrap from '../hooks/useFocusTrap';
import useTaskStore from '../store/taskStore';
import useCategoryStore from '../store/categoryStore';
import useUserStore from '../store/userStore';
import useWorkspaceStore from '../store/workspaceStore';
import { ButtonSpinner } from './Loader';

const TaskModal = ({
  isOpen,
  onClose,
  task = null,
  initialDueDate = null,
  parentTaskId = null,
  parentTask = null,
  defaultCategoryId = null,
}) => {
  const { createTask, updateTask } = useTaskStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { users, fetchUsers } = useUserStore();
  const { currentWorkspaceId } = useWorkspaceStore();

  const isEditMode = !!task;
  const isSubtask = !!parentTaskId;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigneeIds: [], // Changed to array for multiple assignees
    dueDate: '',
    priority: 'medium',
    categoryId: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);
  const titleInputRef = useRef(null);
  const focusTrapRef = useRef(null);

  useFocusTrap(focusTrapRef, isOpen);

  // Track if form has unsaved changes
  const isDirty = initialFormData !== null && (
    formData.title !== initialFormData.title ||
    formData.description !== initialFormData.description ||
    formData.priority !== initialFormData.priority ||
    formData.categoryId !== initialFormData.categoryId ||
    formData.dueDate !== initialFormData.dueDate ||
    JSON.stringify(formData.assigneeIds) !== JSON.stringify(initialFormData.assigneeIds)
  );

  // Warn on browser back/refresh when form is dirty
  useEffect(() => {
    if (!isOpen || !isDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, isDirty]);

  // Auto-focus title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      // Delay to allow animation to complete
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (currentWorkspaceId) {
        fetchUsers(currentWorkspaceId);
      }

      // Populate form data if editing
      if (task) {
        // Extract YYYY-MM-DD from the date string directly
        let formattedDate = '';
        if (task.dueDate) {
          formattedDate = task.dueDate.split('T')[0];
        }

        // Extract assignee IDs from the assignees array
        const existingAssigneeIds = (task.assignees || []).map(a => a.id);

        const editData = {
          title: task.title || '',
          description: task.description || '',
          assigneeIds: existingAssigneeIds,
          dueDate: formattedDate,
          priority: task.priority || 'medium',
          categoryId: task.categoryId || '',
        };
        setFormData(editData);
        setInitialFormData(editData);
      } else {
        // Reset form for new task
        const newData = {
          title: '',
          description: '',
          assigneeIds: [],
          dueDate: initialDueDate || '',
          priority: 'medium',
          categoryId: defaultCategoryId ?? parentTask?.categoryId ?? '',
        };
        setFormData(newData);
        setInitialFormData(newData);
      }
      setShowUnsavedWarning(false);
    }
  }, [isOpen, task, initialDueDate, parentTask, fetchCategories, fetchUsers, defaultCategoryId, currentWorkspaceId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    // Category is required for main tasks only (subtasks inherit from parent)
    if (!isSubtask && !formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        assignee_ids: formData.assigneeIds, // Changed to array
        due_date: formData.dueDate || null,
        priority: formData.priority,
        category_id: parseInt(formData.categoryId),
        parent_task_id: parentTaskId || null,
      };

      if (isEditMode) {
        await updateTask(task.id, taskData);
      } else {
        await createTask(taskData);
      }

      // Reset form and close modal
      setFormData({
        title: '',
        description: '',
        assigneeIds: [],
        dueDate: '',
        priority: 'medium',
        categoryId: '',
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} task:`, error);
      setErrors({ submit: `Failed to ${isEditMode ? 'update' : 'create'} task. Please try again.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;

    if (isDirty) {
      setShowUnsavedWarning(true);
      return;
    }

    resetAndClose();
  };

  const resetAndClose = () => {
    setFormData({
      title: '',
      description: '',
      assigneeIds: [],
      dueDate: '',
      priority: 'medium',
      categoryId: '',
    });
    setErrors({});
    setInitialFormData(null);
    setShowUnsavedWarning(false);
    onClose();
  };

  const handleDiscardChanges = () => {
    setShowUnsavedWarning(false);
    resetAndClose();
  };

  const handleKeepEditing = () => {
    setShowUnsavedWarning(false);
  };

  // Add assignee to the list
  const handleAddAssignee = (e) => {
    const userId = parseInt(e.target.value);
    if (userId && !formData.assigneeIds.includes(userId)) {
      setFormData((prev) => ({
        ...prev,
        assigneeIds: [...prev.assigneeIds, userId],
      }));
    }
    e.target.value = ''; // Reset dropdown
  };

  // Remove assignee from the list
  const handleRemoveAssignee = (userId) => {
    setFormData((prev) => ({
      ...prev,
      assigneeIds: prev.assigneeIds.filter((id) => id !== userId),
    }));
  };

  // Get user by ID for display
  const getUserById = (userId) => {
    return users.find((u) => u.id === userId);
  };

  // Get users not already assigned
  const availableUsers = users.filter((user) => !formData.assigneeIds.includes(user.id));

  if (!isOpen) return null;

  return (
    <div ref={focusTrapRef} className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
          <div className="p-4 sm:p-6">
            {/* Mobile drag handle indicator */}
            <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-4 sm:hidden"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 id="task-modal-title" className="text-xl sm:text-2xl font-semibold text-neutral-900">
                {isEditMode ? 'Edit Task' : isSubtask ? 'Add Subtask' : 'Create New Task'}
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all duration-150"
                disabled={isSubmitting}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                ref={titleInputRef}
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-150 ${
                  errors.title ? 'border-red-500' : 'border-neutral-200'
                }`}
                placeholder="Enter task title"
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-150"
                placeholder="Enter task description (optional)"
                disabled={isSubmitting}
              ></textarea>
            </div>

            {/* Category - hidden for subtasks */}
            {!isSubtask && (
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-neutral-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-150 ${
                    errors.categoryId ? 'border-red-500' : 'border-neutral-200'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-500">{errors.categoryId}</p>
                )}
              </div>
            )}

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-neutral-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-150"
                disabled={isSubmitting}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Assignees - Multi-select */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Assignees
              </label>

              {/* Selected assignees as chips */}
              {formData.assigneeIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.assigneeIds.map((userId) => {
                    const user = getUserById(userId);
                    if (!user) return null;
                    return (
                      <span
                        key={userId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-full text-sm border border-teal-200"
                      >
                        <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="max-w-[100px] truncate">{user.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignee(userId)}
                          className="ml-0.5 p-0.5 hover:bg-teal-100 rounded-full transition-colors"
                          disabled={isSubmitting}
                          aria-label={`Remove ${user.name} from assignees`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Dropdown to add more assignees */}
              <div className="relative">
                <select
                  onChange={handleAddAssignee}
                  value=""
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-150 appearance-none"
                  disabled={isSubmitting || availableUsers.length === 0}
                >
                  <option value="">
                    {availableUsers.length === 0
                      ? (formData.assigneeIds.length === 0 ? 'No users available' : 'All users assigned')
                      : 'Add assignee...'}
                  </option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Plus size={16} className="text-neutral-400" />
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-neutral-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-150"
                disabled={isSubmitting}
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 sm:py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200 text-sm sm:text-base active:scale-[0.98]"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 sm:py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting && <ButtonSpinner />}
                {isSubmitting
                  ? (isEditMode ? 'Updating...' : 'Creating...')
                  : (isEditMode ? 'Update Task' : 'Create Task')
                }
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-warning-title">
          <div className="fixed inset-0 bg-black/50" onClick={handleKeepEditing}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-scale-in">
            <h3 id="unsaved-warning-title" className="text-lg font-semibold text-neutral-900 mb-2">Unsaved Changes</h3>
            <p className="text-neutral-600 text-sm mb-6">
              You have unsaved changes. Are you sure you want to discard them?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleKeepEditing}
                className="flex-1 px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-all duration-200 text-sm"
              >
                Keep Editing
              </button>
              <button
                onClick={handleDiscardChanges}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-all duration-200 text-sm"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskModal;
