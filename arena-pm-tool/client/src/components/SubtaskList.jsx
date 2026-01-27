import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Check, Trash2, Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import useTaskStore from '../store/taskStore';
import useUserStore from '../store/userStore';
import { tasksAPI } from '../utils/api';
import { InlineSpinner } from './Loader';
import DatePicker from './DatePicker';
import AssigneeDropdown from './AssigneeDropdown';

function SubtaskList({ taskId, categoryId }) {
  const [subtasks, setSubtasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskPriority, setNewSubtaskPriority] = useState('medium');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [newSubtaskAssigneeIds, setNewSubtaskAssigneeIds] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [togglingIds, setTogglingIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  // Dropdown state for each subtask
  const [activePriorityDropdown, setActivePriorityDropdown] = useState(null);
  const [activeDatePicker, setActiveDatePicker] = useState(null);
  const [activeAssigneeDropdown, setActiveAssigneeDropdown] = useState(null);
  // New subtask dropdown states
  const [showNewPriorityDropdown, setShowNewPriorityDropdown] = useState(false);
  const [showNewDatePicker, setShowNewDatePicker] = useState(false);
  const [showNewAssigneeDropdown, setShowNewAssigneeDropdown] = useState(false);
  const newSubtaskInputRef = useRef(null);
  const editInputRef = useRef(null);
  const priorityDropdownRefs = useRef({});
  const datePickerRefs = useRef({});
  const assigneeDropdownRefs = useRef({});
  const newPriorityRef = useRef(null);
  const newDateRef = useRef(null);
  const newAssigneeRef = useRef(null);

  const { createTask, updateTask, deleteTask, fetchTasks } = useTaskStore();
  const { users, fetchUsers } = useUserStore();

  // Priority options
  const priorities = ['low', 'medium', 'high', 'urgent'];

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

  // Date utility functions
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

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'completed') return false;
    const dueDateObj = toLocalDate(dueDate);
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dueDateObj && dueDateObj < todayLocal;
  };

  // Fetch subtasks
  const fetchSubtasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await tasksAPI.getAll({ parent_task_id: taskId });
      // Filter to only include subtasks of this task
      const taskSubtasks = response.data.data.tasks.filter(
        t => t.parentTaskId === taskId
      );
      setSubtasks(taskSubtasks);
    } catch (error) {
      console.error('Failed to fetch subtasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchSubtasks();
    fetchUsers();
  }, [fetchSubtasks, fetchUsers]);

  // Focus new subtask input when adding
  useEffect(() => {
    if (isAddingSubtask && newSubtaskInputRef.current) {
      newSubtaskInputRef.current.focus();
    }
  }, [isAddingSubtask]);

  // Focus edit input
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const result = await createTask({
        title: newSubtaskTitle.trim(),
        parent_task_id: taskId,
        category_id: categoryId,
        priority: newSubtaskPriority,
        due_date: newSubtaskDueDate || null,
        assignee_ids: newSubtaskAssigneeIds,
      });

      if (result.success) {
        // Reset all new subtask fields
        setNewSubtaskTitle('');
        setNewSubtaskPriority('medium');
        setNewSubtaskDueDate('');
        setNewSubtaskAssigneeIds([]);
        await fetchSubtasks();
        // Also refresh parent tasks to update subtask counts
        await fetchTasks({}, { showLoading: false });
      }
    } catch (error) {
      console.error('Failed to create subtask:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    } else if (e.key === 'Escape') {
      setIsAddingSubtask(false);
      setNewSubtaskTitle('');
    }
  };

  const handleToggleComplete = async (subtask) => {
    if (togglingIds.has(subtask.id)) return;

    setTogglingIds(prev => new Set([...prev, subtask.id]));
    try {
      const newStatus = subtask.status === 'completed' ? 'todo' : 'completed';
      await updateTask(subtask.id, {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      });
      await fetchSubtasks();
      // Also refresh parent tasks to update subtask counts
      await fetchTasks({}, { showLoading: false });
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(subtask.id);
        return next;
      });
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (deletingIds.has(subtaskId)) return;

    setDeletingIds(prev => new Set([...prev, subtaskId]));
    try {
      await deleteTask(subtaskId);
      await fetchSubtasks();
      // Also refresh parent tasks to update subtask counts
      await fetchTasks({}, { showLoading: false });
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(subtaskId);
        return next;
      });
    }
  };

  const handleStartEdit = (subtask) => {
    setEditingId(subtask.id);
    setEditingTitle(subtask.title);
  };

  const handleSaveEdit = async () => {
    if (!editingTitle.trim() || !editingId) return;

    const subtask = subtasks.find(s => s.id === editingId);
    if (editingTitle.trim() !== subtask?.title) {
      try {
        await updateTask(editingId, { title: editingTitle.trim() });
        await fetchSubtasks();
      } catch (error) {
        console.error('Failed to update subtask:', error);
      }
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingTitle('');
    }
  };

  // Priority update handler
  const handlePrioritySelect = async (subtaskId, priority) => {
    try {
      await updateTask(subtaskId, { priority });
      await fetchSubtasks();
      setActivePriorityDropdown(null);
    } catch (error) {
      console.error('Failed to update subtask priority:', error);
    }
  };

  // Due date update handler
  const handleDateSelect = async (subtaskId, date) => {
    try {
      const formattedDate = toUTCISOString(date);
      await updateTask(subtaskId, { due_date: formattedDate });
      await fetchSubtasks();
      setActiveDatePicker(null);
    } catch (error) {
      console.error('Failed to update subtask due date:', error);
    }
  };

  // Assignee toggle handler (add or remove)
  const handleAssigneeToggle = async (subtaskId, userId) => {
    try {
      const subtask = subtasks.find(s => s.id === subtaskId);
      if (!subtask) return;

      const currentAssignees = subtask.assignees || [];
      const currentIds = currentAssignees.map(a => a.id);

      let newAssigneeIds;
      if (currentIds.includes(userId)) {
        // Remove assignee
        newAssigneeIds = currentIds.filter(id => id !== userId);
      } else {
        // Add assignee
        newAssigneeIds = [...currentIds, userId];
      }

      await updateTask(subtaskId, { assignee_ids: newAssigneeIds });
      await fetchSubtasks();
    } catch (error) {
      console.error('Failed to update subtask assignees:', error);
    }
  };

  // New subtask assignee handlers
  const handleNewAssigneeToggle = (userId) => {
    if (newSubtaskAssigneeIds.includes(userId)) {
      setNewSubtaskAssigneeIds(newSubtaskAssigneeIds.filter(id => id !== userId));
    } else {
      setNewSubtaskAssigneeIds([...newSubtaskAssigneeIds, userId]);
    }
  };

  const handleNewDateSelect = (date) => {
    setNewSubtaskDueDate(toUTCISOString(date));
    setShowNewDatePicker(false);
  };

  // Get user by ID
  const getUserById = (userId) => users.find(u => u.id === userId);

  const completedCount = subtasks.filter(s => s.status === 'completed').length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Subtasks</h3>
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{completedCount}/{totalCount}</span>
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Subtask List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <InlineSpinner />
          <span className="ml-2 text-sm text-gray-500">Loading subtasks...</span>
        </div>
      ) : (
        <div className="space-y-1">
          {subtasks.map((subtask) => {
            const dueDateFormatted = formatDueDate(subtask.dueDate);
            const subtaskIsOverdue = isOverdue(subtask.dueDate, subtask.status);
            const dueDateObj = toLocalDate(subtask.dueDate);

            return (
            <div
              key={subtask.id}
              className={`
                group flex flex-col gap-1 px-2 py-2 rounded-lg
                hover:bg-gray-50 transition
                ${subtask.status === 'completed' ? 'opacity-60' : ''}
              `}
            >
              {/* Top row: Checkbox, Title, Delete */}
              <div className="flex items-center gap-2">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleComplete(subtask)}
                  disabled={togglingIds.has(subtask.id)}
                  className={`
                    flex-shrink-0 w-5 h-5 rounded border-2
                    flex items-center justify-center transition-all
                    ${subtask.status === 'completed'
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                    }
                    ${togglingIds.has(subtask.id) ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                >
                  {togglingIds.has(subtask.id) ? (
                    <InlineSpinner size="xs" />
                  ) : (
                    subtask.status === 'completed' && <Check size={12} className="text-white" />
                  )}
                </button>

                {/* Title */}
                {editingId === subtask.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleEditKeyDown}
                    className="flex-1 text-sm bg-transparent border-b border-blue-500 focus:outline-none"
                  />
                ) : (
                  <span
                    onClick={() => handleStartEdit(subtask)}
                    className={`
                      flex-1 text-sm cursor-text
                      ${subtask.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-700'}
                    `}
                  >
                    {subtask.title}
                  </span>
                )}

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  disabled={deletingIds.has(subtask.id)}
                  className={`
                    flex-shrink-0 p-1 text-gray-400 hover:text-red-500
                    hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition
                    ${deletingIds.has(subtask.id) ? 'opacity-100' : ''}
                  `}
                  title="Delete subtask"
                >
                  {deletingIds.has(subtask.id) ? (
                    <InlineSpinner size="xs" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>

              {/* Bottom row: Priority, Due Date, Assignees */}
              <div className="flex items-center gap-2 ml-7 flex-wrap">
                {/* Priority Badge */}
                <div className="relative" ref={el => priorityDropdownRefs.current[subtask.id] = el}>
                  <button
                    onClick={() => setActivePriorityDropdown(activePriorityDropdown === subtask.id ? null : subtask.id)}
                    className={`px-1.5 py-0.5 rounded text-xs font-medium border hover:opacity-80 transition flex items-center gap-0.5 ${getPriorityColor(subtask.priority)}`}
                    title="Change priority"
                  >
                    {subtask.priority}
                    <ChevronDown size={10} />
                  </button>

                  {/* Priority Dropdown */}
                  {activePriorityDropdown === subtask.id && (
                    <div className="absolute left-0 mt-1 w-28 bg-white border border-neutral-150 rounded-lg shadow-lg z-50 animate-fade-in">
                      <div className="py-1">
                        {priorities.map((priority) => (
                          <button
                            key={priority}
                            onClick={() => handlePrioritySelect(subtask.id, priority)}
                            className={`w-full px-2 py-1.5 text-left text-xs font-medium hover:bg-neutral-100 flex items-center justify-between transition-all ${
                              subtask.priority === priority ? 'bg-neutral-100' : ''
                            }`}
                          >
                            <span className={`px-1.5 py-0.5 rounded border ${getPriorityColor(priority)}`}>
                              {priority}
                            </span>
                            {subtask.priority === priority && (
                              <Check size={12} className="text-teal-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Due Date */}
                <div className="relative" ref={el => datePickerRefs.current[subtask.id] = el}>
                  <button
                    onClick={() => setActiveDatePicker(activeDatePicker === subtask.id ? null : subtask.id)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 hover:bg-neutral-100 rounded transition text-xs ${
                      subtaskIsOverdue ? 'text-red-500 font-medium' : 'text-neutral-500'
                    }`}
                    title="Change due date"
                  >
                    {dueDateFormatted ? (
                      <>
                        {subtaskIsOverdue && <span>!</span>}
                        {dueDateFormatted}
                      </>
                    ) : (
                      <>
                        <Calendar size={10} />
                        <span>Date</span>
                      </>
                    )}
                  </button>

                  {activeDatePicker === subtask.id && (
                    <DatePicker
                      selected={dueDateObj}
                      onSelect={(date) => handleDateSelect(subtask.id, date)}
                      onClose={() => setActiveDatePicker(null)}
                      triggerRef={{ current: datePickerRefs.current[subtask.id] }}
                    />
                  )}
                </div>

                {/* Assignees */}
                <div className="relative" ref={el => assigneeDropdownRefs.current[subtask.id] = el} data-dropdown>
                  <button
                    onClick={() => setActiveAssigneeDropdown(activeAssigneeDropdown === subtask.id ? null : subtask.id)}
                    className="flex items-center hover:bg-neutral-100 rounded px-1 py-0.5 transition"
                    title="Manage assignees"
                  >
                    {(subtask.assignees || []).length > 0 ? (
                      <div className="flex items-center">
                        <div className="flex -space-x-1">
                          {(subtask.assignees || []).slice(0, 2).map((assignee, idx) => (
                            <div
                              key={assignee.id}
                              className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center text-white text-[9px] font-medium border border-white"
                              style={{ zIndex: 2 - idx }}
                              title={assignee.name}
                            >
                              {assignee.name.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {(subtask.assignees || []).length > 2 && (
                            <div
                              className="w-4 h-4 rounded-full bg-neutral-400 flex items-center justify-center text-white text-[9px] font-medium border border-white"
                              title={`+${(subtask.assignees || []).length - 2} more`}
                            >
                              +{(subtask.assignees || []).length - 2}
                            </div>
                          )}
                        </div>
                        <ChevronDown size={8} className="text-neutral-400 ml-0.5" />
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-neutral-400">
                        <div className="w-4 h-4 rounded-full bg-neutral-200 flex items-center justify-center text-[9px]">
                          ?
                        </div>
                        <ChevronDown size={8} className="text-neutral-400 ml-0.5" />
                      </div>
                    )}
                  </button>

                  {activeAssigneeDropdown === subtask.id && (
                    <AssigneeDropdown
                      users={users}
                      selectedIds={(subtask.assignees || []).map(a => a.id)}
                      onToggle={(userId) => handleAssigneeToggle(subtask.id, userId)}
                      onClose={() => setActiveAssigneeDropdown(null)}
                      triggerRef={{ current: assigneeDropdownRefs.current[subtask.id] }}
                      variant="multi"
                      maxHeight={180}
                    />
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Add Subtask */}
      {isAddingSubtask ? (
        <div className="mt-2 px-2 py-2 bg-gray-50 rounded-lg">
          {/* Title input row */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border-2 border-gray-200 flex-shrink-0" />
            <input
              ref={newSubtaskInputRef}
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Subtask title"
              className="flex-1 text-sm bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none py-1"
              disabled={isCreating}
            />
          </div>

          {/* Fields row: Priority, Due Date, Assignees */}
          <div className="flex items-center gap-2 mt-2 ml-7 flex-wrap">
            {/* Priority selector */}
            <div className="relative" ref={newPriorityRef}>
              <button
                onClick={() => setShowNewPriorityDropdown(!showNewPriorityDropdown)}
                className={`px-1.5 py-0.5 rounded text-xs font-medium border hover:opacity-80 transition flex items-center gap-0.5 ${getPriorityColor(newSubtaskPriority)}`}
                disabled={isCreating}
              >
                {newSubtaskPriority}
                <ChevronDown size={10} />
              </button>

              {showNewPriorityDropdown && (
                <div className="absolute left-0 mt-1 w-28 bg-white border border-neutral-150 rounded-lg shadow-lg z-50 animate-fade-in">
                  <div className="py-1">
                    {priorities.map((priority) => (
                      <button
                        key={priority}
                        onClick={() => {
                          setNewSubtaskPriority(priority);
                          setShowNewPriorityDropdown(false);
                        }}
                        className={`w-full px-2 py-1.5 text-left text-xs font-medium hover:bg-neutral-100 flex items-center justify-between transition-all ${
                          newSubtaskPriority === priority ? 'bg-neutral-100' : ''
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 rounded border ${getPriorityColor(priority)}`}>
                          {priority}
                        </span>
                        {newSubtaskPriority === priority && (
                          <Check size={12} className="text-teal-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Due date selector */}
            <div className="relative" ref={newDateRef}>
              <button
                onClick={() => setShowNewDatePicker(!showNewDatePicker)}
                className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-neutral-100 rounded transition text-xs text-neutral-500"
                disabled={isCreating}
              >
                {newSubtaskDueDate ? (
                  formatDueDate(newSubtaskDueDate)
                ) : (
                  <>
                    <Calendar size={10} />
                    <span>Date</span>
                  </>
                )}
              </button>

              {showNewDatePicker && (
                <DatePicker
                  selected={newSubtaskDueDate ? toLocalDate(newSubtaskDueDate) : null}
                  onSelect={handleNewDateSelect}
                  onClose={() => setShowNewDatePicker(false)}
                  triggerRef={newDateRef}
                />
              )}
            </div>

            {/* Assignee selector */}
            <div className="relative" ref={newAssigneeRef} data-dropdown>
              <button
                onClick={() => setShowNewAssigneeDropdown(!showNewAssigneeDropdown)}
                className="flex items-center hover:bg-neutral-100 rounded px-1 py-0.5 transition"
                disabled={isCreating}
              >
                {newSubtaskAssigneeIds.length > 0 ? (
                  <div className="flex items-center">
                    <div className="flex -space-x-1">
                      {newSubtaskAssigneeIds.slice(0, 2).map((userId, idx) => {
                        const user = getUserById(userId);
                        return user ? (
                          <div
                            key={userId}
                            className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center text-white text-[9px] font-medium border border-white"
                            style={{ zIndex: 2 - idx }}
                            title={user.name}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        ) : null;
                      })}
                      {newSubtaskAssigneeIds.length > 2 && (
                        <div className="w-4 h-4 rounded-full bg-neutral-400 flex items-center justify-center text-white text-[9px] font-medium border border-white">
                          +{newSubtaskAssigneeIds.length - 2}
                        </div>
                      )}
                    </div>
                    <ChevronDown size={8} className="text-neutral-400 ml-0.5" />
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-neutral-400">
                    <div className="w-4 h-4 rounded-full bg-neutral-200 flex items-center justify-center text-[9px]">
                      ?
                    </div>
                    <span className="ml-1">Assign</span>
                    <ChevronDown size={8} className="text-neutral-400 ml-0.5" />
                  </div>
                )}
              </button>

              {showNewAssigneeDropdown && (
                <AssigneeDropdown
                  users={users}
                  selectedIds={newSubtaskAssigneeIds}
                  onToggle={handleNewAssigneeToggle}
                  onClose={() => setShowNewAssigneeDropdown(false)}
                  triggerRef={newAssigneeRef}
                  variant="multi"
                  maxHeight={180}
                />
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 ml-7">
            <button
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim() || isCreating}
              className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isCreating ? (
                <>
                  <InlineSpinner size="xs" />
                  Adding...
                </>
              ) : (
                'Add subtask'
              )}
            </button>
            <button
              onClick={() => {
                setIsAddingSubtask(false);
                setNewSubtaskTitle('');
                setNewSubtaskPriority('medium');
                setNewSubtaskDueDate('');
                setNewSubtaskAssigneeIds([]);
                setShowNewPriorityDropdown(false);
                setShowNewDatePicker(false);
                setShowNewAssigneeDropdown(false);
              }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
              disabled={isCreating}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingSubtask(true)}
          className="flex items-center gap-2 px-2 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition mt-1 w-full"
        >
          <Plus size={16} />
          <span>Add subtask</span>
        </button>
      )}
    </div>
  );
}

export default SubtaskList;
