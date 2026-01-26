import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow, parseISO } from 'date-fns';
import { meAPI } from '../../utils/api';

const MyTasksTab = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and sorting
  const [statusFilter, setStatusFilter] = useState('all'); // all, open, completed
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        sort: 'due_date',
        order: sortOrder,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await meAPI.getMyTasks(params);
      setTasks(response.data.data.tasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, sortOrder]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskClick = (taskId) => {
    // Navigate to dashboard - the task modal would need to be opened there
    // For now, just navigate to dashboard
    navigate('/dashboard');
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return null;

    try {
      const date = parseISO(dateString);

      if (isToday(date)) {
        return { text: 'Today', isUrgent: true };
      }
      if (isTomorrow(date)) {
        return { text: 'Tomorrow', isUrgent: true };
      }
      if (isPast(date)) {
        return { text: `Overdue (${format(date, 'MMM d')})`, isOverdue: true };
      }

      return { text: format(date, 'MMM d, yyyy'), isUrgent: false };
    } catch {
      return null;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    return <Circle className="h-5 w-5 text-neutral-500" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">My Tasks</h2>
        <p className="mt-1 text-sm text-neutral-400">
          View and manage all tasks assigned to you.
        </p>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <div className="flex bg-neutral-800 rounded-lg p-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'open', label: 'Open' },
              { value: 'completed', label: 'Completed' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  statusFilter === option.value
                    ? 'bg-teal-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort by Due Date */}
        <button
          onClick={toggleSortOrder}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
        >
          <ArrowUpDown className="h-4 w-4" />
          <span className="text-sm">
            Due Date: {sortOrder === 'asc' ? 'Earliest First' : 'Latest First'}
          </span>
        </button>
      </div>

      {/* Task List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-400">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <CheckCircle2 className="h-12 w-12 mb-4 text-neutral-600" />
            <p className="text-lg font-medium text-neutral-300">No tasks assigned to you</p>
            <p className="text-sm mt-1">
              {statusFilter === 'completed'
                ? 'You have no completed tasks.'
                : statusFilter === 'open'
                ? 'You have no open tasks.'
                : 'Tasks assigned to you will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {tasks.map((task) => {
              const dueInfo = formatDueDate(task.dueDate);

              return (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">{getStatusIcon(task.status)}</div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4
                        className={`font-medium truncate ${
                          task.status === 'completed'
                            ? 'text-neutral-500 line-through'
                            : 'text-white'
                        }`}
                      >
                        {task.title}
                      </h4>

                      {/* Priority Badge */}
                      <span
                        className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded border capitalize ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 mt-1">
                      {/* Category */}
                      {task.categoryName && (
                        <span className="flex items-center gap-1.5 text-sm text-neutral-400">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: task.categoryColor || '#6b7280' }}
                          />
                          {task.categoryName}
                        </span>
                      )}

                      {/* Due Date */}
                      {dueInfo && (
                        <span
                          className={`flex items-center gap-1.5 text-sm ${
                            dueInfo.isOverdue
                              ? 'text-red-400'
                              : dueInfo.isUrgent
                              ? 'text-yellow-400'
                              : 'text-neutral-400'
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          {dueInfo.text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Go to task icon */}
                  <ExternalLink className="h-4 w-4 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Count */}
      {!isLoading && !error && tasks.length > 0 && (
        <p className="text-sm text-neutral-500 text-center">
          Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default MyTasksTab;
