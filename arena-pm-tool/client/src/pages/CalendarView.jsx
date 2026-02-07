import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import useTaskStore from '../store/taskStore';
import useHolidayStore from '../store/holidayStore';
import TaskModal from '../components/TaskModal';
import { PageLoader } from '../components/Loader';

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

  // Navigation functions - view-aware
  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      // Move back 7 days
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      // Move forward 7 days
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

  // Get priority color - muted Apple-style colors
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]';
      case 'high':
        return 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]';
      case 'medium':
        return 'bg-[#fefce8] text-[#a16207] border-[#fef08a]';
      case 'low':
        return 'bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]';
      default:
        return 'bg-neutral-50 text-neutral-600 border-neutral-200';
    }
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

  // Get all tasks for current month (for mobile list view)
  // Must be before any early returns to comply with React hooks rules
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
          <h2 className="text-lg sm:text-2xl font-semibold text-neutral-900">
            {getHeaderTitle()}
          </h2>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={goToPrevious}
              className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-lg transition-all duration-150 text-neutral-600 hover:text-neutral-900"
              title={viewMode === 'month' ? 'Previous month' : 'Previous week'}
              aria-label={viewMode === 'month' ? 'Previous month' : 'Previous week'}
            >
              <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={goToNext}
              className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-lg transition-all duration-150 text-neutral-600 hover:text-neutral-900"
              title={viewMode === 'month' ? 'Next month' : 'Next week'}
              aria-label={viewMode === 'month' ? 'Next month' : 'Next week'}
            >
              <ChevronRight size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 ${
                viewMode === 'week'
                  ? 'bg-teal-500 text-white'
                  : 'bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Weeks
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 ${
                viewMode === 'month'
                  ? 'bg-teal-500 text-white'
                  : 'bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Month
            </button>
          </div>

          <button
            onClick={goToToday}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200"
          >
            Today
          </button>
        </div>
      </div>

      {/* Desktop Calendar Grid - Month View */}
      {viewMode === 'month' && (
      <div className="hidden md:flex flex-1 bg-white rounded-xl shadow-sm border border-neutral-150 overflow-hidden flex-col">
        {/* Day names header */}
        <div className="grid grid-cols-7 border-b border-neutral-150">
          {dayNames.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-sm font-semibold text-neutral-600 border-r border-neutral-150 last:border-r-0"
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
                className={`border-r border-b border-neutral-150 last:border-r-0 p-2 transition-all duration-150 ${
                  day ? 'bg-white hover:bg-neutral-50' : 'bg-neutral-50'
                } ${holiday ? 'bg-red-50/70' : ''} ${isToday(day) ? 'bg-teal-50/50' : ''} ${
                  dragOverDay === day ? 'bg-teal-50 border-2 border-teal-400' : ''
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
                      className="flex items-center justify-between mb-1"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <div
                        className={`text-sm font-medium ${
                          isToday(day)
                            ? 'flex items-center justify-center w-7 h-7 bg-teal-500 text-white rounded-full'
                            : 'text-neutral-900'
                        }`}
                      >
                        {day}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(day);
                        }}
                        className="text-neutral-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg p-1 transition-all duration-150"
                        title="Add task"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    {/* Holiday label */}
                    {holiday && (
                      <div className="text-xs text-red-600 font-medium truncate mb-1" title={holiday.localName || holiday.name}>
                        {holiday.localName || holiday.name}
                      </div>
                    )}

                    {/* Task pills */}
                    <div
                      className="space-y-1 overflow-hidden flex-1"
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
                                className={`text-xs px-2 py-1 rounded-md border truncate cursor-move hover:opacity-80 transition-all duration-150 ${getPriorityColor(task.priority)}`}
                                title={`${task.title}\n${task.description || ''}\nPriority: ${task.priority || 'none'}\nStatus: ${task.status}`}
                              >
                                {task.title}
                              </div>
                            ))}
                            {remainingCount > 0 && (
                              <div className="text-xs text-neutral-500 px-2 py-1">
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
        <div className="hidden md:flex flex-1 bg-white rounded-xl shadow-sm border border-neutral-150 overflow-hidden flex-col">
          {/* Day headers with dates */}
          <div className="grid grid-cols-7 border-b border-neutral-150">
            {weekDays.map((day, index) => {
              const holiday = getHolidayByDate(day.dateKey);

              return (
                <div
                  key={index}
                  className={`py-3 text-center border-r border-neutral-150 last:border-r-0 ${
                    holiday ? 'bg-red-50/50' : ''
                  } ${isTodayDate(day.date) ? 'bg-teal-50/50' : ''}`}
                >
                  <div className="text-xs font-semibold text-neutral-500 uppercase">
                    {dayNames[day.dayOfWeek]}
                  </div>
                  <div
                    className={`text-lg font-medium mt-1 ${
                      isTodayDate(day.date)
                        ? 'flex items-center justify-center w-8 h-8 bg-teal-500 text-white rounded-full mx-auto'
                        : 'text-neutral-900'
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
                  className={`border-r border-neutral-150 last:border-r-0 flex flex-col ${
                    holiday ? 'bg-red-50/70' : ''
                  } ${isTodayDate(day.date) ? 'bg-teal-50/50' : 'bg-white'} ${
                    dragOverDay === day.dateKey ? 'bg-teal-50 border-2 border-teal-400' : ''
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
                    className="w-full p-2 text-sm text-neutral-500 hover:text-teal-600 hover:bg-teal-50 transition-all duration-150 border-b border-neutral-100 flex items-center justify-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add task</span>
                  </button>

                  {/* Tasks for this day */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleTaskClick(task)}
                        className={`text-xs px-2 py-1.5 rounded-md border cursor-move hover:opacity-80 transition-all duration-150 ${getPriorityColor(task.priority)}`}
                        title={`${task.title}\n${task.description || ''}\nPriority: ${task.priority || 'none'}\nStatus: ${task.status}`}
                      >
                        <div className="truncate">{task.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Calendar View - Month */}
      {viewMode === 'month' && (
      <div className="md:hidden flex-1 flex flex-col">
        {/* Mini Calendar Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-150 overflow-hidden mb-4">
          {/* Day names header */}
          <div className="grid grid-cols-7 border-b border-neutral-150">
            {dayNamesShort.map((day, index) => (
              <div
                key={index}
                className="py-2 text-center text-xs font-semibold text-neutral-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days - compact */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const dayTasks = day ? getTasksForDay(day) : [];
              const hasTask = dayTasks.length > 0;
              const holiday = day ? getHolidayForDay(day) : null;

              return (
                <button
                  key={index}
                  onClick={() => day && handleDayClick(day)}
                  disabled={!day}
                  className={`p-2 text-center relative transition-all duration-150 ${
                    day ? 'hover:bg-neutral-50' : ''
                  } ${holiday ? 'bg-red-50/70' : ''} ${isToday(day) ? 'bg-teal-50/50' : ''}`}
                >
                  {day && (
                    <>
                      <span
                        className={`text-sm ${
                          isToday(day)
                            ? 'flex items-center justify-center w-6 h-6 bg-teal-500 text-white rounded-full mx-auto'
                            : holiday
                            ? 'text-red-600'
                            : 'text-neutral-900'
                        }`}
                      >
                        {day}
                      </span>
                      {hasTask && (
                        <div className="flex justify-center mt-1 gap-0.5">
                          {dayTasks.slice(0, 3).map((task, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                task.priority === 'high' || task.priority === 'urgent'
                                  ? 'bg-[#c2410c]'
                                  : task.priority === 'medium'
                                  ? 'bg-[#a16207]'
                                  : 'bg-neutral-400'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      {/* Holiday indicator for mobile */}
                      {holiday && !hasTask && (
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mx-auto mt-1" />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tasks List for Month */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-150 overflow-hidden flex-1">
          <div className="px-4 py-3 border-b border-neutral-150 bg-neutral-50">
            <h3 className="font-semibold text-neutral-900 text-sm">Tasks this month</h3>
          </div>
          <div className="divide-y divide-neutral-100 max-h-[400px] overflow-y-auto">
            {tasksInMonth.length > 0 ? (
              tasksInMonth.map(({ day, tasks: dayTasks }) => (
                <div key={day} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-neutral-400" />
                    <span className={`text-sm font-medium ${isToday(day) ? 'text-teal-600' : 'text-neutral-700'}`}>
                      {monthNames[month]} {day}
                      {isToday(day) && <span className="ml-1 text-xs">(Today)</span>}
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
              ))
            ) : (
              <div className="px-4 py-8 text-center text-neutral-500">
                <Calendar size={32} className="mx-auto mb-2 text-neutral-300" />
                <p className="text-sm">No tasks scheduled this month</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Mobile Week View */}
      {viewMode === 'week' && (
        <div className="md:hidden flex-1 flex flex-col">
          {/* Compact week selector */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-150 overflow-hidden mb-4">
            <div className="grid grid-cols-7 border-b border-neutral-150">
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
                    } ${isTodayDate(day.date) ? 'bg-teal-50/50' : ''}`}
                  >
                    <span className="text-xs text-neutral-500 block">
                      {dayNamesShort[day.dayOfWeek]}
                    </span>
                    <span
                      className={`text-sm font-medium block ${
                        isTodayDate(day.date)
                          ? 'flex items-center justify-center w-6 h-6 bg-teal-500 text-white rounded-full mx-auto'
                          : holiday
                          ? 'text-red-600'
                          : 'text-neutral-900'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {hasTask && (
                      <div className="flex justify-center mt-1 gap-0.5">
                        {dayTasks.slice(0, 3).map((task, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              task.priority === 'high' || task.priority === 'urgent'
                                ? 'bg-[#c2410c]'
                                : task.priority === 'medium'
                                ? 'bg-[#a16207]'
                                : 'bg-neutral-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    {/* Holiday indicator for mobile */}
                    {holiday && !hasTask && (
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mx-auto mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tasks List for Week */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-150 overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-neutral-150 bg-neutral-50">
              <h3 className="font-semibold text-neutral-900 text-sm">Tasks this week</h3>
            </div>
            <div className="divide-y divide-neutral-100 max-h-[400px] overflow-y-auto">
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
                        <Calendar size={14} className="text-neutral-400" />
                        <span
                          className={`text-sm font-medium ${
                            isTodayDate(day.date) ? 'text-teal-600' : 'text-neutral-700'
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
                    <div className="px-4 py-8 text-center text-neutral-500">
                      <Calendar size={32} className="mx-auto mb-2 text-neutral-300" />
                      <p className="text-sm">No tasks scheduled this week</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

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
