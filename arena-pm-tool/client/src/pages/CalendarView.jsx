import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import useTaskStore from '../store/taskStore';
import useHolidayStore from '../store/holidayStore';
import TaskModal from '../components/TaskModal';
import { PageLoader } from '../components/Loader';
import { Button } from 'components/ui/button';

function CalendarView() {
  const { tasks, isLoading: loading, fetchTasks, updateTask } = useTaskStore();
  const holidayFetchRef = useRef(null);
  const { fetchHolidays, getHolidayByDate } = useHolidayStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [mobileViewMode, setMobileViewMode] = useState('day'); // 'day', '3day', 'week'
  const [isDragging, setIsDragging] = useState(false);

  // Get calendar data
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Get the start of the week (Monday) for a given date
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    // Adjust to Monday (day 1), treating Sunday (day 0) as day 7
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  };

  // Generate array of week days with their data
  const weekDays = useMemo(() => {
    const weekStart = getWeekStart(currentDate);
    const days = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);

      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');

      days.push({
        date: date,
        dayNumber: date.getDate(),
        dayOfWeek: date.getDay(), // 0-6 (Sun-Sat)
        dateKey: `${yyyy}-${mm}-${dd}`,
        month: date.getMonth(),
        year: date.getFullYear()
      });
    }

    return days;
  }, [currentDate]);

  // Check if a Date object is today
  const isTodayDate = (dateToCheck) => {
    const today = new Date();
    return (
      dateToCheck.getDate() === today.getDate() &&
      dateToCheck.getMonth() === today.getMonth() &&
      dateToCheck.getFullYear() === today.getFullYear()
    );
  };

  // Get tasks for a specific date key (YYYY-MM-DD)
  const getTasksForDateKey = (dateKey) => {
    return tasksByDate[dateKey] || [];
  };

  // Get header title based on view mode
  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return `${monthNames[month]} ${year}`;
    } else {
      // Show week range: "Jan 19 - 25, 2026"
      const weekStart = weekDays[0];
      const weekEnd = weekDays[6];

      if (weekStart.month === weekEnd.month) {
        return `${monthNamesShort[weekStart.month]} ${weekStart.dayNumber} - ${weekEnd.dayNumber}, ${weekEnd.year}`;
      } else if (weekStart.year === weekEnd.year) {
        return `${monthNamesShort[weekStart.month]} ${weekStart.dayNumber} - ${monthNamesShort[weekEnd.month]} ${weekEnd.dayNumber}, ${weekEnd.year}`;
      } else {
        return `${monthNamesShort[weekStart.month]} ${weekStart.dayNumber}, ${weekStart.year} - ${monthNamesShort[weekEnd.month]} ${weekEnd.dayNumber}, ${weekEnd.year}`;
      }
    }
  };

  // Get mobile header title
  const getMobileHeaderTitle = () => {
    if (mobileViewMode === 'day') {
      const d = currentDate;
      return `${dayNames[d.getDay()]}, ${monthNamesShort[d.getMonth()]} ${d.getDate()}`;
    } else if (mobileViewMode === '3day') {
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + 2);
      if (currentDate.getMonth() === endDate.getMonth()) {
        return `${monthNamesShort[currentDate.getMonth()]} ${currentDate.getDate()} - ${endDate.getDate()}`;
      }
      return `${monthNamesShort[currentDate.getMonth()]} ${currentDate.getDate()} - ${monthNamesShort[endDate.getMonth()]} ${endDate.getDate()}`;
    }
    return getHeaderTitle();
  };

  // Navigation functions - view-aware
  const goToPrevious = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      const days = mobileViewMode === 'day' ? 1 : mobileViewMode === '3day' ? 3 : 7;
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - days);
      setCurrentDate(newDate);
    } else if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      const days = mobileViewMode === 'day' ? 1 : mobileViewMode === '3day' ? 3 : 7;
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + days);
      setCurrentDate(newDate);
    } else if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Fetch holidays for visible years - debounced to avoid rapid API calls during navigation
  useEffect(() => {
    if (holidayFetchRef.current) {
      clearTimeout(holidayFetchRef.current);
    }

    holidayFetchRef.current = setTimeout(() => {
      // For month view, fetch current month's year
      fetchHolidays(year);

      // For week view, might span two years (December/January)
      if (viewMode === 'week' && weekDays.length > 0) {
        const weekStartYear = weekDays[0]?.year;
        const weekEndYear = weekDays[6]?.year;
        if (weekStartYear && weekStartYear !== year) fetchHolidays(weekStartYear);
        if (weekEndYear && weekEndYear !== year) fetchHolidays(weekEndYear);
      }
    }, 300);

    return () => {
      if (holidayFetchRef.current) {
        clearTimeout(holidayFetchRef.current);
      }
    };
  }, [year, viewMode, weekDays, fetchHolidays]);

  // Group tasks by due date - memoized for performance
  // Only include parent tasks (exclude subtasks which have parentTaskId)
  const tasksByDate = useMemo(() => {
    const grouped = {};

    if (Array.isArray(tasks)) {
      tasks.forEach(task => {
        // Skip subtasks - they shouldn't appear directly in the calendar
        if (task.parentTaskId) return;

        if (task.dueDate) {
          // Extract YYYY-MM-DD from the date string directly
          const dateKey = task.dueDate.split('T')[0];
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          grouped[dateKey].push(task);
        }
      });
    }

    return grouped;
  }, [tasks]);

  // Get tasks for a specific day
  const getTasksForDay = useCallback((day) => {
    // Create YYYY-MM-DD format key
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateKey = `${year}-${mm}-${dd}`;
    return tasksByDate[dateKey] || [];
  }, [month, year, tasksByDate]);

  // Handle task click
  const handleTaskClick = (task) => {
    // Prevent opening modal if we just finished dragging
    if (isDragging) return;

    setSelectedTask(task);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setSelectedDate(null);
    // Refetch tasks to get updated data
    fetchTasks();
  };

  // Handle day click (for creating new task)
  const handleDayClick = (day) => {
    // Create a date string in YYYY-MM-DD format for the clicked day
    // Use local date methods to avoid timezone conversion issues
    const clickedDate = new Date(year, month, day);
    const yyyy = clickedDate.getFullYear();
    const mm = String(clickedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(clickedDate.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;

    setSelectedDate(dateString);
    setSelectedTask(null); // Ensure we're creating, not editing
    setIsModalOpen(true);
  };

  // Get priority color - priority-tinted card style
  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-50 text-red-800 border-red-200',
      high: 'bg-orange-50 text-orange-800 border-orange-200',
      medium: 'bg-amber-50 text-amber-800 border-amber-200',
      low: 'bg-green-50 text-green-800 border-green-200',
    };
    return colors[priority] || 'bg-gray-50 text-gray-800 border-gray-200';
  };

  // Get priority left-border color for task card indicator
  const getPriorityBorderColor = (priority) => {
    const colors = {
      urgent: 'border-l-red-500',
      high: 'border-l-orange-500',
      medium: 'border-l-amber-500',
      low: 'border-l-green-500',
    };
    return colors[priority] || 'border-l-gray-400';
  };

  // Get status label
  const getStatusLabel = (status) => {
    const labels = {
      todo: 'To Do',
      in_progress: 'In Progress',
      completed: 'Done',
    };
    return labels[status] || status;
  };

  // Get status dot color
  const getStatusDotColor = (status) => {
    const colors = {
      todo: 'bg-gray-400',
      in_progress: 'bg-blue-500',
      completed: 'bg-green-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  // Check if date is today
  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Get holiday for a specific day in the current month
  const getHolidayForDay = (day) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateKey = `${year}-${mm}-${dd}`;
    return getHolidayByDate(dateKey);
  };

  // Drag and drop handlers with optimistic UI and error recovery
  const handleDragStart = useCallback((e, task) => {
    setIsDragging(true);
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation(); // Prevent click event
  }, []);

  const handleDragOver = useCallback((e, day) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(day);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDay(null);
  }, []);

  const handleDrop = useCallback(async (e, day) => {
    e.preventDefault();
    setDragOverDay(null);

    if (!draggedTask) return;

    // Create simple YYYY-MM-DD date string
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateString = `${year}-${mm}-${dd}`;

    try {
      // Update task with new due date using Zustand store
      await updateTask(draggedTask.id, { due_date: dateString });
    } catch (error) {
      // Revert on failure - refetch to restore previous state
      await fetchTasks();
    }

    setDraggedTask(null);
    // Small delay before allowing clicks again
    setTimeout(() => setIsDragging(false), 100);
  }, [draggedTask, month, year, updateTask, fetchTasks]);

  const handleDragEnd = useCallback(() => {
    setDraggedTask(null);
    setDragOverDay(null);
    // Small delay before allowing clicks again
    setTimeout(() => setIsDragging(false), 100);
  }, []);

  // Generate calendar days
  const calendarDays = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Get all tasks for current month (used by mobile month view - now removed, kept for potential future use)
  // eslint-disable-next-line no-unused-vars
  const tasksInMonth = useMemo(() => {
    const monthTasks = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTasks = getTasksForDay(day);
      if (dayTasks.length > 0) {
        monthTasks.push({ day, tasks: dayTasks });
      }
    }
    return monthTasks;
  }, [daysInMonth, getTasksForDay]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <h2 className="text-lg sm:text-2xl font-semibold text-foreground">
            <span className="hidden md:inline">{getHeaderTitle()}</span>
            <span className="md:hidden">{getMobileHeaderTitle()}</span>
          </h2>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
              title={viewMode === 'month' ? 'Previous month' : 'Previous week'}
              aria-label={viewMode === 'month' ? 'Previous month' : 'Previous week'}
            >
              <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
              title={viewMode === 'month' ? 'Next month' : 'Next week'}
              aria-label={viewMode === 'month' ? 'Next month' : 'Next week'}
            >
              <ChevronRight size={18} className="sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop View Mode Toggle */}
          <div className="hidden md:flex bg-muted rounded-full p-1 gap-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm transition-all duration-200 rounded-full ${
                viewMode === 'week'
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 text-sm transition-all duration-200 rounded-full ${
                viewMode === 'month'
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Month
            </button>
          </div>

          {/* Mobile View Mode Toggle */}
          <div className="flex md:hidden bg-muted rounded-full p-1 gap-1">
            <button
              onClick={() => setMobileViewMode('day')}
              className={`px-2.5 py-1.5 text-xs transition-all duration-200 rounded-full ${
                mobileViewMode === 'day'
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setMobileViewMode('3day')}
              className={`px-2.5 py-1.5 text-xs transition-all duration-200 rounded-full ${
                mobileViewMode === '3day'
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              3 Day
            </button>
            <button
              onClick={() => setMobileViewMode('week')}
              className={`px-2.5 py-1.5 text-xs transition-all duration-200 rounded-full ${
                mobileViewMode === 'week'
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Week
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Desktop Calendar Grid - Month View */}
      {viewMode === 'month' && (
      <div className="hidden md:flex flex-1 bg-card rounded-2xl border border-border shadow-card overflow-hidden flex-col">
        {/* Day names header */}
        <div className="grid grid-cols-7 border-b border-border">
          {dayNames.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 auto-rows-fr flex-1" style={{ minHeight: '500px' }}>
          {calendarDays.map((day, index) => {
            const holiday = day ? getHolidayForDay(day) : null;

            return (
              <div
                key={index}
                className={`border-r border-b border-border last:border-r-0 p-2.5 transition-all duration-150 ${
                  day ? 'bg-card hover:bg-muted/50' : 'bg-muted/40'
                } ${holiday ? 'bg-red-50/50' : ''} ${isToday(day) ? 'ring-1 ring-inset ring-primary/20 bg-accent/30' : ''} ${
                  dragOverDay === day ? 'bg-accent/60 ring-2 ring-inset ring-primary/40' : ''
                }`}
                onDragOver={day ? (e) => handleDragOver(e, day) : undefined}
                onDragLeave={day ? handleDragLeave : undefined}
                onDrop={day ? (e) => handleDrop(e, day) : undefined}
              >
                {day && (
                  <div
                    className="h-full flex flex-col"
                    style={{ pointerEvents: 'none' }}
                  >
                    <div
                      className="flex items-center justify-between mb-2"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <div
                        className={`text-sm font-medium ${
                          isToday(day)
                            ? 'flex items-center justify-center w-7 h-7 bg-primary text-primary-foreground rounded-full'
                            : 'text-foreground'
                        }`}
                      >
                        {day}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(day);
                        }}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg p-1 transition-all duration-150"
                        title="Add task"
                        aria-label={`Add task on day ${day}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    {/* Holiday label */}
                    {holiday && (
                      <div className="text-xs text-red-600 font-medium truncate mb-1.5" title={holiday.localName || holiday.name}>
                        {holiday.localName || holiday.name}
                      </div>
                    )}

                    {/* Task cards */}
                    <div
                      className="space-y-1.5 overflow-hidden flex-1"
                      style={{ pointerEvents: 'auto' }}
                    >
                      {(() => {
                        const dayTasks = getTasksForDay(day);
                        const maxVisible = holiday ? 2 : 3;
                        const visibleTasks = dayTasks.slice(0, maxVisible);
                        const remainingCount = dayTasks.length - maxVisible;

                        return (
                          <>
                            {visibleTasks.map((task) => (
                              <div
                                key={task.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, task)}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleTaskClick(task)}
                                className={`text-xs font-medium py-1.5 px-2 rounded-md border border-l-[3px] ${getPriorityBorderColor(task.priority)} cursor-move hover:shadow-sm hover:opacity-90 transition-all duration-150 ${getPriorityColor(task.priority)}`}
                                title={`${task.title}\n${task.description || ''}\nPriority: ${task.priority || 'none'}\nStatus: ${task.status}`}
                              >
                                <div className="line-clamp-2 leading-snug">{task.title}</div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDotColor(task.status)}`} />
                                  <span className="text-[10px] text-muted-foreground truncate">{getStatusLabel(task.status)}</span>
                                </div>
                              </div>
                            ))}
                            {remainingCount > 0 && (
                              <div className="text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2 py-0.5 transition-colors">
                                +{remainingCount} more
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Desktop Week View Grid */}
      {viewMode === 'week' && (
        <div className="hidden md:flex flex-1 bg-card rounded-2xl border border-border shadow-card overflow-hidden flex-col">
          {/* Day headers with dates */}
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map((day, index) => {
              const holiday = getHolidayByDate(day.dateKey);

              return (
                <div
                  key={index}
                  className={`py-3 text-center border-r border-border last:border-r-0 ${
                    holiday ? 'bg-red-50/50' : ''
                  } ${isTodayDate(day.date) ? 'bg-accent/30' : ''}`}
                >
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {dayNames[day.dayOfWeek]}
                  </div>
                  <div
                    className={`text-lg font-medium mt-1 ${
                      isTodayDate(day.date)
                        ? 'flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full mx-auto'
                        : 'text-foreground'
                    }`}
                  >
                    {day.dayNumber}
                  </div>
                  {/* Holiday indicator dot */}
                  {holiday && (
                    <div className="w-2 h-2 rounded-full bg-red-400 mx-auto mt-1" title={holiday.localName || holiday.name} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Week days columns with tasks */}
          <div className="grid grid-cols-7 flex-1" style={{ minHeight: '500px' }}>
            {weekDays.map((day, index) => {
              const dayTasks = getTasksForDateKey(day.dateKey);
              const holiday = getHolidayByDate(day.dateKey);

              return (
                <div
                  key={index}
                  className={`border-r border-border last:border-r-0 flex flex-col transition-all duration-150 ${
                    holiday ? 'bg-red-50/50' : ''
                  } ${isTodayDate(day.date) ? 'bg-accent/30' : 'bg-card'} ${
                    dragOverDay === day.dateKey ? 'bg-accent/60 ring-2 ring-inset ring-primary/40' : ''
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverDay(day.dateKey);
                  }}
                  onDragLeave={() => setDragOverDay(null)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverDay(null);
                    if (!draggedTask) return;
                    await updateTask(draggedTask.id, { due_date: day.dateKey });
                    setDraggedTask(null);
                    setTimeout(() => setIsDragging(false), 100);
                  }}
                >
                  {/* Holiday label at top of column */}
                  {holiday && (
                    <div className="px-2 py-1 text-xs text-red-600 font-medium bg-red-50 border-b border-red-100 truncate" title={holiday.localName || holiday.name}>
                      {holiday.localName || holiday.name}
                    </div>
                  )}

                  {/* + Add task button at top of each column */}
                  <button
                    onClick={() => {
                      setSelectedDate(day.dateKey);
                      setSelectedTask(null);
                      setIsModalOpen(true);
                    }}
                    className="w-full p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-150 border-b border-border flex items-center justify-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add task</span>
                  </button>

                  {/* Tasks for this day */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleTaskClick(task)}
                        className={`text-xs font-medium py-1.5 px-2 rounded-md border border-l-[3px] ${getPriorityBorderColor(task.priority)} cursor-move hover:shadow-sm hover:opacity-90 transition-all duration-150 ${getPriorityColor(task.priority)}`}
                        title={`${task.title}\n${task.description || ''}\nPriority: ${task.priority || 'none'}\nStatus: ${task.status}`}
                      >
                        <div className="line-clamp-2 leading-snug">{task.title}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDotColor(task.status)}`} />
                          <span className="text-[10px] text-muted-foreground truncate">{getStatusLabel(task.status)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Calendar Views */}
      <div className="md:hidden flex-1 flex flex-col">
        {/* Day View */}
        {mobileViewMode === 'day' && (
          <div className="flex-1 flex flex-col">
            {/* Day header */}
            <div className="bg-card rounded-lg border border-border overflow-hidden mb-4">
              <div className={`px-4 py-4 text-center ${isTodayDate(currentDate) ? 'bg-accent' : ''}`}>
                <div className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
                  {dayNames[currentDate.getDay()]}
                </div>
                <div className={`text-3xl font-semibold mt-1 ${
                  isTodayDate(currentDate) ? 'text-primary' : 'text-foreground'
                }`}>
                  {currentDate.getDate()}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </div>
                {(() => {
                  const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                  const dd = String(currentDate.getDate()).padStart(2, '0');
                  const dateKey = `${currentDate.getFullYear()}-${mm}-${dd}`;
                  const holiday = getHolidayByDate(dateKey);
                  return holiday ? (
                    <div className="text-xs text-red-600 font-medium mt-1">
                      {holiday.localName || holiday.name}
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Tasks for this day */}
            <div className="bg-card rounded-lg border border-border overflow-hidden flex-1">
              <div className="px-4 py-3 border-b border-border bg-background flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">Tasks</h3>
                <button
                  onClick={() => {
                    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(currentDate.getDate()).padStart(2, '0');
                    setSelectedDate(`${currentDate.getFullYear()}-${mm}-${dd}`);
                    setSelectedTask(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              </div>
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {(() => {
                  const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                  const dd = String(currentDate.getDate()).padStart(2, '0');
                  const dateKey = `${currentDate.getFullYear()}-${mm}-${dd}`;
                  const dayTasks = tasksByDate[dateKey] || [];

                  if (dayTasks.length > 0) {
                    return dayTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className={`w-full text-left px-4 py-3 transition-all duration-150 hover:opacity-80 ${getPriorityColor(task.priority)}`}
                      >
                        <div className="font-medium text-sm">{task.title}</div>
                        {task.description && (
                          <div className="text-xs opacity-75 mt-1 line-clamp-2">{task.description}</div>
                        )}
                        {task.assigneeName && (
                          <div className="text-xs opacity-75 mt-1">
                            Assigned to {task.assigneeName}
                          </div>
                        )}
                      </button>
                    ));
                  }
                  return (
                    <div className="px-4 py-8 text-center text-muted-foreground">
                      <Calendar size={32} className="mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm">No tasks for this day</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* 3-Day View */}
        {mobileViewMode === '3day' && (
          <div className="flex-1 flex flex-col gap-3">
            {[0, 1, 2].map((offset) => {
              const dayDate = new Date(currentDate);
              dayDate.setDate(currentDate.getDate() + offset);
              const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
              const dd = String(dayDate.getDate()).padStart(2, '0');
              const dateKey = `${dayDate.getFullYear()}-${mm}-${dd}`;
              const dayTasks = tasksByDate[dateKey] || [];
              const holiday = getHolidayByDate(dateKey);
              const isCurrentDay = isTodayDate(dayDate);

              return (
                <div key={dateKey} className="bg-card rounded-lg border border-border overflow-hidden">
                  {/* Day header */}
                  <div className={`px-4 py-2.5 border-b border-border flex items-center justify-between ${
                    isCurrentDay ? 'bg-accent' : 'bg-background'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
                        {dayNames[dayDate.getDay()]}, {monthNamesShort[dayDate.getMonth()]} {dayDate.getDate()}
                      </span>
                      {isCurrentDay && (
                        <span className="text-xs px-1.5 py-0.5 bg-accent text-primary rounded-full">Today</span>
                      )}
                      {holiday && (
                        <span className="text-xs text-red-600 font-medium">{holiday.localName || holiday.name}</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDate(dateKey);
                        setSelectedTask(null);
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-muted-foreground hover:text-primary"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Tasks */}
                  {dayTasks.length > 0 ? (
                    <div className="divide-y divide-border">
                      {dayTasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => handleTaskClick(task)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 hover:opacity-80 ${getPriorityColor(task.priority)}`}
                        >
                          <div className="font-medium">{task.title}</div>
                          {task.assigneeName && (
                            <div className="text-xs opacity-75 mt-0.5">
                              Assigned to {task.assigneeName}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-center text-muted-foreground text-sm">
                      No tasks
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Week View (mobile) */}
        {mobileViewMode === 'week' && (
          <>
            {/* Compact week selector */}
            <div className="bg-card rounded-lg border border-border overflow-hidden mb-4">
              <div className="grid grid-cols-7 border-b border-border">
                {weekDays.map((day, index) => {
                  const dayTasks = getTasksForDateKey(day.dateKey);
                  const hasTask = dayTasks.length > 0;
                  const holiday = getHolidayByDate(day.dateKey);

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedDate(day.dateKey);
                        setSelectedTask(null);
                        setIsModalOpen(true);
                      }}
                      className={`p-2 text-center transition-all duration-150 ${
                        holiday ? 'bg-red-50/70' : ''
                      } ${isTodayDate(day.date) ? 'bg-accent/50' : ''}`}
                    >
                      <span className="text-xs text-muted-foreground block">
                        {dayNamesShort[day.dayOfWeek]}
                      </span>
                      <span
                        className={`text-sm font-medium block ${
                          isTodayDate(day.date)
                            ? 'flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full mx-auto'
                            : holiday
                            ? 'text-red-600'
                            : 'text-foreground'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                      {hasTask && (
                        <div className="flex justify-center mt-1 gap-0.5">
                          {dayTasks.slice(0, 3).map((task, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 md:w-1.5 md:h-1.5 rounded-full ${
                                task.priority === 'urgent' ? 'bg-red-600'
                                  : task.priority === 'high' ? 'bg-orange-600'
                                  : task.priority === 'medium' ? 'bg-amber-500'
                                  : 'bg-green-600'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      {holiday && !hasTask && (
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mx-auto mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tasks List for Week */}
            <div className="bg-card rounded-lg border border-border overflow-hidden flex-1">
              <div className="px-4 py-3 border-b border-border bg-background">
                <h3 className="font-semibold text-foreground text-sm">Tasks this week</h3>
              </div>
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {(() => {
                  const tasksInWeek = weekDays
                    .map((day) => ({
                      day,
                      tasks: getTasksForDateKey(day.dateKey),
                    }))
                    .filter(({ tasks }) => tasks.length > 0);

                  if (tasksInWeek.length > 0) {
                    return tasksInWeek.map(({ day, tasks: dayTasks }) => (
                      <div key={day.dateKey} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar size={14} className="text-muted-foreground" />
                          <span
                            className={`text-sm font-medium ${
                              isTodayDate(day.date) ? 'text-foreground' : 'text-foreground'
                            }`}
                          >
                            {dayNames[day.dayOfWeek]}, {monthNamesShort[day.month]} {day.dayNumber}
                            {isTodayDate(day.date) && <span className="ml-1 text-xs">(Today)</span>}
                          </span>
                        </div>
                        <div className="space-y-2 pl-5">
                          {dayTasks.map((task) => (
                            <button
                              key={task.id}
                              onClick={() => handleTaskClick(task)}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all duration-150 hover:opacity-80 ${getPriorityColor(task.priority)}`}
                            >
                              <div className="font-medium truncate">{task.title}</div>
                              {task.assigneeName && (
                                <div className="text-xs opacity-75 mt-0.5">
                                  Assigned to {task.assigneeName}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ));
                  } else {
                    return (
                      <div className="px-4 py-8 text-center text-muted-foreground">
                        <Calendar size={32} className="mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm">No tasks scheduled this week</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        task={selectedTask}
        initialDueDate={selectedDate}
      />
    </div>
  );
}

export default CalendarView;
