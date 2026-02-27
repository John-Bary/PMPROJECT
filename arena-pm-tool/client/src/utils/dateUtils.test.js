import { toLocalDate, toUTCISOString, formatDueDate, formatDueDateLong, isOverdue } from './dateUtils';

// ---------------------------------------------------------------------------
// toLocalDate
// ---------------------------------------------------------------------------
describe('toLocalDate', () => {
  it('returns null for falsy values', () => {
    expect(toLocalDate(null)).toBeNull();
    expect(toLocalDate(undefined)).toBeNull();
    expect(toLocalDate('')).toBeNull();
    expect(toLocalDate(0)).toBeNull();
  });

  it('converts a UTC ISO string to a local Date with no time component', () => {
    const result = toLocalDate('2025-03-15T00:00:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(2); // March = 2
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('strips time information from a UTC date with non-midnight time', () => {
    const result = toLocalDate('2025-06-20T18:30:45.000Z');
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5); // June = 5
    expect(result.getDate()).toBe(20);
    expect(result.getHours()).toBe(0);
  });

  it('handles date-only strings (no time component)', () => {
    const result = toLocalDate('2025-01-01');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// toUTCISOString
// ---------------------------------------------------------------------------
describe('toUTCISOString', () => {
  it('returns null for falsy values', () => {
    expect(toUTCISOString(null)).toBeNull();
    expect(toUTCISOString(undefined)).toBeNull();
    expect(toUTCISOString(0)).toBeNull();
    expect(toUTCISOString('')).toBeNull();
  });

  it('converts a local Date to a UTC ISO string at midnight', () => {
    const date = new Date(2025, 2, 15); // March 15, 2025 local
    const result = toUTCISOString(date);
    expect(result).toBe('2025-03-15T00:00:00.000Z');
  });

  it('ignores the time component of the input date', () => {
    const date = new Date(2025, 5, 20, 14, 30, 45); // June 20 at 14:30:45 local
    const result = toUTCISOString(date);
    expect(result).toBe('2025-06-20T00:00:00.000Z');
  });

  it('returns a valid ISO 8601 string', () => {
    const date = new Date(2025, 0, 1);
    const result = toUTCISOString(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
  });
});

// ---------------------------------------------------------------------------
// formatDueDate
// ---------------------------------------------------------------------------
describe('formatDueDate', () => {
  it('returns null for falsy values', () => {
    expect(formatDueDate(null)).toBeNull();
    expect(formatDueDate(undefined)).toBeNull();
    expect(formatDueDate('')).toBeNull();
  });

  it('formats a date as short display (e.g. "Mar 15")', () => {
    const result = formatDueDate('2025-03-15T00:00:00.000Z');
    expect(result).toBe('Mar 15');
  });

  it('formats January 1 correctly', () => {
    const result = formatDueDate('2025-01-01T00:00:00.000Z');
    expect(result).toBe('Jan 1');
  });

  it('formats December 31 correctly', () => {
    const result = formatDueDate('2025-12-31T00:00:00.000Z');
    expect(result).toBe('Dec 31');
  });

  it('returns null for invalid date strings', () => {
    expect(formatDueDate('not-a-date')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatDueDateLong
// ---------------------------------------------------------------------------
describe('formatDueDateLong', () => {
  it('returns null for falsy values', () => {
    expect(formatDueDateLong(null)).toBeNull();
    expect(formatDueDateLong(undefined)).toBeNull();
    expect(formatDueDateLong('')).toBeNull();
  });

  it('formats a date as long display (e.g. "Mar 15, 2025")', () => {
    const result = formatDueDateLong('2025-03-15T00:00:00.000Z');
    expect(result).toBe('Mar 15, 2025');
  });

  it('formats January 1 correctly with year', () => {
    const result = formatDueDateLong('2025-01-01T00:00:00.000Z');
    expect(result).toBe('Jan 1, 2025');
  });

  it('formats a date from a different year', () => {
    const result = formatDueDateLong('2030-07-04T00:00:00.000Z');
    expect(result).toBe('Jul 4, 2030');
  });

  it('returns null for invalid date strings', () => {
    expect(formatDueDateLong('garbage')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isOverdue
// ---------------------------------------------------------------------------
describe('isOverdue', () => {
  it('returns false when dueDate is falsy', () => {
    expect(isOverdue(null, 'todo')).toBe(false);
    expect(isOverdue(undefined, 'todo')).toBe(false);
    expect(isOverdue('', 'in_progress')).toBe(false);
  });

  it('returns false when status is "completed"', () => {
    // Use a date far in the past to ensure it would otherwise be overdue
    expect(isOverdue('2000-01-01T00:00:00.000Z', 'completed')).toBe(false);
  });

  it('returns true for a past due date with non-completed status', () => {
    expect(isOverdue('2000-01-01T00:00:00.000Z', 'todo')).toBe(true);
    expect(isOverdue('2000-06-15T00:00:00.000Z', 'in_progress')).toBe(true);
  });

  it('returns false for a future due date', () => {
    // Use a date far in the future
    expect(isOverdue('2099-12-31T00:00:00.000Z', 'todo')).toBe(false);
    expect(isOverdue('2099-12-31T00:00:00.000Z', 'in_progress')).toBe(false);
  });

  it('returns false when status is "completed" even with a past due date', () => {
    expect(isOverdue('2020-01-01T00:00:00.000Z', 'completed')).toBe(false);
  });

  it('returns false when both dueDate is falsy and status is "completed"', () => {
    expect(isOverdue(null, 'completed')).toBe(false);
    expect(isOverdue(undefined, 'completed')).toBe(false);
  });
});
