import { format } from 'date-fns';

/**
 * Convert a UTC date string to a local Date object (date-only, no time component).
 */
export const toLocalDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/**
 * Convert a local Date object to a UTC ISO string (date-only at midnight UTC).
 */
export const toUTCISOString = (date) =>
  date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString() : null;

/**
 * Format a date string as a short display date (e.g. "Jan 5").
 */
export const formatDueDate = (date) => {
  if (!date) return null;
  try {
    const localDate = toLocalDate(date);
    return localDate ? format(localDate, 'MMM d') : null;
  } catch (error) {
    return null;
  }
};

/**
 * Format a date string as a long display date (e.g. "Jan 5, 2025").
 */
export const formatDueDateLong = (date) => {
  if (!date) return null;
  try {
    const localDate = toLocalDate(date);
    return localDate ? format(localDate, 'MMM d, yyyy') : null;
  } catch (error) {
    return null;
  }
};

/**
 * Check if a due date is overdue (before today and not completed).
 */
export const isOverdue = (dueDate, status) => {
  if (!dueDate || status === 'completed') return false;
  const dueDateObj = toLocalDate(dueDate);
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return dueDateObj && dueDateObj < todayLocal;
};
