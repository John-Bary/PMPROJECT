import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import useTaskStore from '../store/taskStore';
import { tasksAPI } from '../utils/api';
import { InlineSpinner } from './Loader';

function SubtaskList({ taskId, categoryId }) {
  const [subtasks, setSubtasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [togglingIds, setTogglingIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const newSubtaskInputRef = useRef(null);
  const editInputRef = useRef(null);

  const { createTask, updateTask, deleteTask, fetchTasks } = useTaskStore();

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
  }, [fetchSubtasks]);

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
        priority: 'medium',
      });

      if (result.success) {
        setNewSubtaskTitle('');
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
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className={`
                group flex items-center gap-2 px-2 py-2 rounded-lg
                hover:bg-gray-50 transition
                ${subtask.status === 'completed' ? 'opacity-60' : ''}
              `}
            >
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
          ))}
        </div>
      )}

      {/* Add Subtask */}
      {isAddingSubtask ? (
        <div className="flex items-center gap-2 mt-2 px-2">
          <div className="w-5 h-5 rounded border-2 border-gray-200 flex-shrink-0" />
          <input
            ref={newSubtaskInputRef}
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newSubtaskTitle.trim()) {
                setIsAddingSubtask(false);
              }
            }}
            placeholder="Subtask title"
            className="flex-1 text-sm bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none py-1"
            disabled={isCreating}
          />
          <button
            onClick={handleAddSubtask}
            disabled={!newSubtaskTitle.trim() || isCreating}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isCreating ? (
              <>
                <InlineSpinner size="xs" />
                Adding...
              </>
            ) : (
              'Add'
            )}
          </button>
          <button
            onClick={() => {
              setIsAddingSubtask(false);
              setNewSubtaskTitle('');
            }}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
            disabled={isCreating}
          >
            Cancel
          </button>
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
