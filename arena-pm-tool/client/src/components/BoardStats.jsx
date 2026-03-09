import { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ListTodo, ChevronDown, ChevronRight } from 'lucide-react';
import { isOverdue as checkIsOverdue } from '../utils/dateUtils';

function BoardStats({ tasks }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('todoria_stats_collapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('todoria_stats_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Start of week (Monday)
    const weekStart = new Date(todayStart);
    const day = weekStart.getDay();
    const diff = day === 0 ? 6 : day - 1;
    weekStart.setDate(weekStart.getDate() - diff);

    let overdue = 0;
    let dueToday = 0;
    let completedThisWeek = 0;

    tasks.forEach((task) => {
      if (checkIsOverdue(task.dueDate, task.status)) {
        overdue++;
      }

      if (task.dueDate && task.status !== 'completed') {
        const dueDate = new Date(task.dueDate);
        const dueDateLocal = new Date(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
        if (dueDateLocal >= todayStart && dueDateLocal < todayEnd) {
          dueToday++;
        }
      }

      if (task.status === 'completed' && task.completedAt) {
        const completedDate = new Date(task.completedAt);
        if (completedDate >= weekStart) {
          completedThisWeek++;
        }
      }
    });

    return {
      total: tasks.length,
      overdue,
      dueToday,
      completedThisWeek,
    };
  }, [tasks]);

  return (
    <div className="mb-4 sm:mb-6">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        aria-label={isCollapsed ? 'Show stats' : 'Hide stats'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <span className="font-medium">Stats</span>
        {isCollapsed && (
          <span className="text-muted-foreground">
            {stats.total} total{stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ''}
          </span>
        )}
      </button>

      {!isCollapsed && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5">
            <div className="p-1.5 rounded-md bg-primary/10">
              <ListTodo size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold text-foreground leading-tight">{stats.total}</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 bg-card border rounded-lg px-3 py-2.5 ${stats.overdue > 0 ? 'border-red-200 dark:border-red-900' : 'border-border'}`}>
            <div className={`p-1.5 rounded-md ${stats.overdue > 0 ? 'bg-red-100 dark:bg-red-950' : 'bg-muted'}`}>
              <AlertTriangle size={16} className={stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className={`text-lg font-semibold leading-tight ${stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{stats.overdue}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5">
            <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-950">
              <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Done this week</p>
              <p className="text-lg font-semibold text-foreground leading-tight">{stats.completedThisWeek}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5">
            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-950">
              <Clock size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due today</p>
              <p className="text-lg font-semibold text-foreground leading-tight">{stats.dueToday}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BoardStats;
