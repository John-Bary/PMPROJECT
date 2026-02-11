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
import { Button } from 'components/ui/button';
import { Badge } from 'components/ui/badge';
import { Card, CardContent } from 'components/ui/card';
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

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-neutral-100 text-neutral-500 border-neutral-200';
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
        <h2 className="text-2xl font-semibold text-foreground">My Tasks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage all tasks assigned to you.
        </p>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex bg-muted border border-border rounded-lg p-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'open', label: 'Open' },
              { value: 'completed', label: 'Completed' },
            ].map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(option.value)}
                className={statusFilter === option.value ? '' : 'text-muted-foreground hover:text-foreground'}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Sort by Due Date */}
        <Button variant="outline" onClick={toggleSortOrder}>
          <ArrowUpDown className="h-4 w-4" />
          <span className="text-sm">
            Due Date: {sortOrder === 'asc' ? 'Earliest First' : 'Latest First'}
          </span>
        </Button>
      </div>

      {/* Task List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">No tasks assigned to you</p>
              <p className="text-sm mt-1">
                {statusFilter === 'completed'
                  ? 'You have no completed tasks.'
                  : statusFilter === 'open'
                  ? 'You have no open tasks.'
                  : 'Tasks assigned to you will appear here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tasks.map((task) => {
                const dueInfo = formatDueDate(task.dueDate);

                return (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task.id)}
                    className="flex items-center gap-4 px-4 py-4 hover:bg-muted cursor-pointer transition-colors group"
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0">{getStatusIcon(task.status)}</div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4
                          className={`font-medium truncate ${
                            task.status === 'completed'
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          }`}
                        >
                          {task.title}
                        </h4>

                        {/* Priority Badge */}
                        <Badge
                          variant="outline"
                          className={`flex-shrink-0 capitalize ${getPriorityVariant(task.priority)}`}
                        >
                          {task.priority}
                        </Badge>
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 mt-1">
                        {/* Category */}
                        {task.categoryName && (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
                                : 'text-muted-foreground'
                            }`}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            {dueInfo.text}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Go to task icon */}
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Count */}
      {!isLoading && !error && tasks.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default MyTasksTab;
