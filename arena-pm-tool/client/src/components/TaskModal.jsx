import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import useTaskStore from '../store/taskStore';
import useCategoryStore from '../store/categoryStore';
import useUserStore from '../store/userStore';
import useWorkspaceStore from '../store/workspaceStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from 'components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from 'components/ui/alert-dialog';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Textarea } from 'components/ui/textarea';
import { Label } from 'components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'components/ui/select';

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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Task' : isSubtask ? 'Add Subtask' : 'Create New Task'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the task details below.' : isSubtask ? 'Add a subtask to the parent task.' : 'Fill in the details to create a new task.'}
            </DialogDescription>
          </DialogHeader>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Task Title <span className="text-red-500">*</span>
              </Label>
              <Input
                ref={titleInputRef}
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={errors.title ? 'border-red-500' : ''}
                placeholder="Enter task title"
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Enter task description (optional)"
                disabled={isSubmitting}
              />
            </div>

            {/* Category - hidden for subtasks */}
            {!isSubtask && (
              <div className="space-y-2">
                <Label htmlFor="categoryId">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.categoryId ? String(formData.categoryId) : ""}
                  onValueChange={(val) => {
                    setFormData(prev => ({ ...prev, categoryId: val }));
                    if (errors.categoryId) setErrors(prev => ({ ...prev, categoryId: '' }));
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={errors.categoryId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && (
                  <p className="text-sm text-red-500">{errors.categoryId}</p>
                )}
              </div>
            )}

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignees - Multi-select */}
            <div className="space-y-2">
              <Label>
                Assignees
              </Label>

              {/* Selected assignees as chips */}
              {formData.assigneeIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.assigneeIds.map((userId) => {
                    const user = getUserById(userId);
                    if (!user) return null;
                    return (
                      <span
                        key={userId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm border border-neutral-200"
                      >
                        <span className="w-5 h-5 rounded-full bg-neutral-600 text-white text-xs flex items-center justify-center font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="max-w-[100px] truncate">{user.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignee(userId)}
                          className="ml-0.5 p-0.5 hover:bg-neutral-200 rounded-full transition-colors"
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
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all duration-150 appearance-none"
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
            <div className="space-y-2">
              <Label htmlFor="dueDate">
                Due Date
              </Label>
              <Input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
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
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting
                  ? (isEditMode ? 'Updating...' : 'Creating...')
                  : (isEditMode ? 'Update Task' : 'Create Task')
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes. Are you sure you want to discard them?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeepEditing}>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges} className="bg-red-600 hover:bg-red-700">Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskModal;
