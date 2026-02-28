/* eslint-disable import/first */
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));

const mockToggleComplete = jest.fn();
const mockCategories = [{ id: 1, name: 'To Do' }];

jest.mock('../../store/taskStore', () => () => ({
  toggleComplete: mockToggleComplete,
}));

jest.mock('../../store/categoryStore', () => () => ({
  categories: mockCategories,
}));

import { renderHook, act } from '@testing-library/react';
import { useTaskActions } from '../useTaskActions';

describe('useTaskActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToggleComplete.mockResolvedValue(undefined);
  });

  const mockTask = { id: 42, title: 'Test task', status: 'todo' };

  it('should return handleToggleComplete, togglingTaskIds, and isToggling', () => {
    const { result } = renderHook(() => useTaskActions());

    expect(result.current).toHaveProperty('handleToggleComplete');
    expect(typeof result.current.handleToggleComplete).toBe('function');

    expect(result.current).toHaveProperty('togglingTaskIds');
    expect(result.current.togglingTaskIds).toBeInstanceOf(Set);

    expect(result.current).toHaveProperty('isToggling');
    expect(typeof result.current.isToggling).toBe('function');
  });

  it('should call toggleComplete from taskStore with task and categories', async () => {
    const { result } = renderHook(() => useTaskActions());

    await act(async () => {
      await result.current.handleToggleComplete(mockTask);
    });

    expect(mockToggleComplete).toHaveBeenCalledTimes(1);
    expect(mockToggleComplete).toHaveBeenCalledWith(mockTask, mockCategories);
  });

  it('should prevent double-toggling the same task (guard via togglingTaskIds)', async () => {
    let resolveToggle;
    mockToggleComplete.mockImplementation(
      () => new Promise((resolve) => { resolveToggle = resolve; })
    );

    const { result } = renderHook(() => useTaskActions());

    // Start the first toggle (will hang until we resolve)
    let firstTogglePromise;
    await act(async () => {
      firstTogglePromise = result.current.handleToggleComplete(mockTask);
    });

    // Attempt a second toggle on the same task while the first is still in progress
    await act(async () => {
      await result.current.handleToggleComplete(mockTask);
    });

    // toggleComplete should have been called only once
    expect(mockToggleComplete).toHaveBeenCalledTimes(1);

    // Clean up: resolve the pending toggle
    await act(async () => {
      resolveToggle();
      await firstTogglePromise;
    });
  });

  it('should remove task ID from togglingTaskIds after toggle completes', async () => {
    const { result } = renderHook(() => useTaskActions());

    await act(async () => {
      await result.current.handleToggleComplete(mockTask);
    });

    expect(result.current.togglingTaskIds.has(mockTask.id)).toBe(false);
    expect(result.current.isToggling(mockTask.id)).toBe(false);
  });

  it('should remove task ID from togglingTaskIds even if toggleComplete throws', async () => {
    mockToggleComplete.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTaskActions());

    await act(async () => {
      // The hook uses finally, so the error should still propagate.
      // We catch it here to prevent unhandled rejection in the test.
      try {
        await result.current.handleToggleComplete(mockTask);
      } catch {
        // expected
      }
    });

    expect(result.current.togglingTaskIds.has(mockTask.id)).toBe(false);
    expect(result.current.isToggling(mockTask.id)).toBe(false);
  });

  it('isToggling should return true while toggle is in progress', async () => {
    let resolveToggle;
    mockToggleComplete.mockImplementation(
      () => new Promise((resolve) => { resolveToggle = resolve; })
    );

    const { result } = renderHook(() => useTaskActions());

    let togglePromise;
    await act(async () => {
      togglePromise = result.current.handleToggleComplete(mockTask);
    });

    // While the toggle is still pending, isToggling should return true
    expect(result.current.isToggling(mockTask.id)).toBe(true);
    expect(result.current.togglingTaskIds.has(mockTask.id)).toBe(true);

    // Resolve and verify it clears
    await act(async () => {
      resolveToggle();
      await togglePromise;
    });

    expect(result.current.isToggling(mockTask.id)).toBe(false);
  });

  it('isToggling should return false when no toggle is in progress', () => {
    const { result } = renderHook(() => useTaskActions());

    expect(result.current.isToggling(mockTask.id)).toBe(false);
    expect(result.current.isToggling(999)).toBe(false);
    expect(result.current.isToggling('nonexistent')).toBe(false);
  });
});
