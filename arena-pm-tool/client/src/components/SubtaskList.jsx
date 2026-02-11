import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Check, Trash2, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import useTaskStore from '../store/taskStore';
import useUserStore from '../store/userStore';
import useWorkspaceStore from '../store/workspaceStore';
import { tasksAPI } from '../utils/api';
import { toLocalDate, toUTCISOString, formatDueDate, isOverdue as checkOverdue } from '../utils/dateUtils';
import { getPriorityColor } from '../utils/priorityStyles';
import { InlineSpinner } from './Loader';
import DatePicker from './DatePicker';
import AssigneeDropdown from './AssigneeDropdown';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Checkbox } from 'components/ui/checkbox';

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
  const { currentWorkspaceId } = useWorkspaceStore();

  // Priority options
  const priorities = ['low', 'medium', 'high', 'urgent'];


  // Fetch subtasks
  const fetchSubtasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await tasksAPI.getSubtasks(taskId);
      setSubtasks(response.data.data.subtasks);
    } catch (error) {
      console.error('Failed to fetch subtasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchSubtasks();
    if (currentWorkspaceId) {
      fetchUsers(currentWorkspaceId);
    }
  }, [fetchSubtasks, fetchUsers, currentWorkspaceId]);

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
        <h3 className="text-sm font-medium text-foreground">Subtasks</h3>
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{completedCount}/{totalCount}</span>
            <div className="w-20 h-1.5 bg-accent rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
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
          <span className="ml-2 text-sm text-muted-foreground">Loading subtasks...</span>
        </div>
      ) : (
        <div className="space-y-1">
          {subtasks.map((subtask) => {
            const dueDateFormatted = formatDueDate(subtask.dueDate);
            const subtaskIsOverdue = checkOverdue(subtask.dueDate, subtask.status);
            const dueDateObj = toLocalDate(subtask.dueDate);

            return (
            <div
              key={subtask.id}
              className={`
                group flex flex-col gap-1 px-2 py-2 rounded-lg
                hover:bg-muted transition
                ${subtask.status === 'completed' ? 'opacity-60' : ''}
              `}
            >
              {/* Top row: Checkbox, Title, Delete */}
              <div className="flex items-center gap-2">
                {/* Checkbox */}
                <Checkbox
                  checked={subtask.status === 'completed'}
                  onCheckedChange={() => handleToggleComplete(subtask)}
                  disabled={togglingIds.has(subtask.id)}
                  aria-label={subtask.status === 'completed' ? `Mark "${subtask.title}" as incomplete` : `Mark "${subtask.title}" as complete`}
                  className="flex-shrink-0"
                />

                {/* Title */}
                {editingId === subtask.id ? (
                  <Input
                    ref={editInputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleEditKeyDown}
                    className="flex-1 h-7 text-sm bg-transparent border-0 border-b border-primary rounded-none focus:ring-0 px-0"
                  />
                ) : (
                  <span
                    onClick={() => handleStartEdit(subtask)}
                    className={`
                      flex-1 text-sm cursor-text
                      ${subtask.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}
                    `}
                  >
                    {subtask.title}
                  </span>
                )}

                {/* Delete button */}
                <Button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  disabled={deletingIds.has(subtask.id)}
                  variant="ghost"
                  size="icon"
                  className={`
                    flex-shrink-0 h-7 w-7 text-muted-foreground hover:text-red-500
                    hover:bg-red-50 opacity-0 group-hover:opacity-100 transition
                    ${deletingIds.has(subtask.id) ? 'opacity-100' : ''}
                  `}
                  title="Delete subtask"
                  aria-label={`Delete subtask "${subtask.title}"`}
                >
                  {deletingIds.has(subtask.id) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </Button>
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
                    <div className="absolute left-0 mt-1 w-28 bg-card border border-border rounded-lg shadow-sm z-50 animate-fade-in">
                      <div className="py-1">
                        {priorities.map((priority) => (
                          <button
                            key={priority}
                            onClick={() => handlePrioritySelect(subtask.id, priority)}
                            className={`w-full px-2 py-1.5 text-left text-xs font-medium hover:bg-accent flex items-center justify-between transition-all ${
                              subtask.priority === priority ? 'bg-accent' : ''
                            }`}
                          >
                            <span className={`px-1.5 py-0.5 rounded border ${getPriorityColor(priority)}`}>
                              {priority}
                            </span>
                            {subtask.priority === priority && (
                              <Check size={12} className="text-primary" />
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
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition text-xs ${
                      subtaskIsOverdue
                        ? 'text-red-600 font-medium bg-red-50 border border-red-200'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                    title={subtaskIsOverdue ? 'Overdue - click to change due date' : 'Change due date'}
                  >
                    <Calendar size={10} />
                    {dueDateFormatted ? (
                      <>
                        {subtaskIsOverdue && <span className="font-semibold">Overdue</span>}
                        {subtaskIsOverdue && <span className="mx-0.5">·</span>}
                        {dueDateFormatted}
                      </>
                    ) : (
                      <span>Date</span>
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
                    className="flex items-center hover:bg-accent rounded px-1 py-0.5 transition"
                    title="Manage assignees"
                    aria-label="Manage assignees"
                  >
                    {(subtask.assignees || []).length > 0 ? (
                      <div className="flex items-center">
                        <div className="flex -space-x-1">
                          {(subtask.assignees || []).slice(0, 2).map((assignee, idx) => (
                            <div
                              key={assignee.id}
                              className="w-4 h-4 rounded-full bg-neutral-600 flex items-center justify-center text-white text-[9px] font-medium border border-white"
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
                        <ChevronDown size={8} className="text-muted-foreground ml-0.5" />
                      </div>
                    ) : (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <div className="w-4 h-4 rounded-full bg-input flex items-center justify-center text-[9px]">
                          ?
                        </div>
                        <ChevronDown size={8} className="text-muted-foreground ml-0.5" />
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
        <div className="mt-2 px-2 py-2 bg-muted rounded-lg">
          {/* Title input row */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border-2 border-border flex-shrink-0" />
            <Input
              ref={newSubtaskInputRef}
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Subtask title"
              className="flex-1 h-7 text-sm bg-transparent border-0 border-b border-input rounded-none focus:border-primary focus:ring-0 px-0"
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
                <div className="absolute left-0 mt-1 w-28 bg-card border border-border rounded-lg shadow-sm z-50 animate-fade-in">
                  <div className="py-1">
                    {priorities.map((priority) => (
                      <button
                        key={priority}
                        onClick={() => {
                          setNewSubtaskPriority(priority);
                          setShowNewPriorityDropdown(false);
                        }}
                        className={`w-full px-2 py-1.5 text-left text-xs font-medium hover:bg-accent flex items-center justify-between transition-all ${
                          newSubtaskPriority === priority ? 'bg-accent' : ''
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 rounded border ${getPriorityColor(priority)}`}>
                          {priority}
                        </span>
                        {newSubtaskPriority === priority && (
                          <Check size={12} className="text-primary" />
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
                className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-accent rounded transition text-xs text-muted-foreground"
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
                className="flex items-center hover:bg-accent rounded px-1 py-0.5 transition"
                disabled={isCreating}
                aria-label="Assign subtask"
              >
                {newSubtaskAssigneeIds.length > 0 ? (
                  <div className="flex items-center">
                    <div className="flex -space-x-1">
                      {newSubtaskAssigneeIds.slice(0, 2).map((userId, idx) => {
                        const user = getUserById(userId);
                        return user ? (
                          <div
                            key={userId}
                            className="w-4 h-4 rounded-full bg-neutral-600 flex items-center justify-center text-white text-[9px] font-medium border border-white"
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
                    <ChevronDown size={8} className="text-muted-foreground ml-0.5" />
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <div className="w-4 h-4 rounded-full bg-input flex items-center justify-center text-[9px]">
                      ?
                    </div>
                    <span className="ml-1">Assign</span>
                    <ChevronDown size={8} className="text-muted-foreground ml-0.5" />
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
            <Button
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim() || isCreating}
              size="sm"
              className="h-7 text-xs"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add subtask'
              )}
            </Button>
            <Button
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
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setIsAddingSubtask(true)}
          variant="ghost"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-1 w-full justify-start"
        >
          <Plus size={16} />
          <span>Add subtask</span>
        </Button>
      )}
    </div>
  );
}

export default SubtaskList;
