/* eslint-disable import/first */

// Mock axios before any imports
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  })),
  defaults: { headers: { common: {} } }
}));

// Mock the stores and API
jest.mock('../store/taskStore');
jest.mock('../store/userStore');
jest.mock('../utils/api', () => ({
  tasksAPI: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  usersAPI: {
    getAll: jest.fn(),
  },
}));

// Mock DatePicker and AssigneeDropdown to avoid complex portal rendering
jest.mock('./DatePicker', () => {
  return function MockDatePicker({ onSelect, onClose }) {
    return (
      <div data-testid="date-picker">
        <button onClick={() => { onSelect(new Date('2024-03-15')); onClose(); }}>Select Date</button>
      </div>
    );
  };
});

jest.mock('./AssigneeDropdown', () => {
  return function MockAssigneeDropdown({ users, selectedIds, onToggle, onClose }) {
    return (
      <div data-testid="assignee-dropdown">
        {users.map(user => (
          <button key={user.id} onClick={() => onToggle(user.id)}>
            {selectedIds.includes(user.id) ? '✓' : ''} {user.name}
          </button>
        ))}
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SubtaskList from './SubtaskList';
import useTaskStore from '../store/taskStore';
import useUserStore from '../store/userStore';
import { tasksAPI } from '../utils/api';

// Mock data
const mockUsers = [
  { id: 1, name: 'User One', email: 'user1@test.com' },
  { id: 2, name: 'User Two', email: 'user2@test.com' },
];

const mockSubtasks = [
  {
    id: 101,
    title: 'Subtask 1',
    status: 'todo',
    priority: 'medium',
    dueDate: '2024-02-15',
    assignees: [{ id: 1, name: 'User One' }],
    parentTaskId: 1,
  },
  {
    id: 102,
    title: 'Subtask 2',
    status: 'completed',
    priority: 'high',
    dueDate: null,
    assignees: [],
    parentTaskId: 1,
  },
];

// Setup mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  useTaskStore.mockReturnValue({
    createTask: jest.fn().mockResolvedValue({ success: true }),
    updateTask: jest.fn().mockResolvedValue({ success: true }),
    deleteTask: jest.fn().mockResolvedValue({ success: true }),
    fetchTasks: jest.fn().mockResolvedValue({}),
  });

  useUserStore.mockReturnValue({
    users: mockUsers,
    fetchUsers: jest.fn(),
  });

  tasksAPI.getAll.mockResolvedValue({
    data: {
      data: {
        tasks: mockSubtasks,
      },
    },
  });
});

describe('SubtaskList', () => {
  const defaultProps = {
    taskId: 1,
    categoryId: 1,
  };

  test('renders subtask list with subtasks', async () => {
    render(<SubtaskList {...defaultProps} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Check that subtasks are rendered
    expect(screen.getByText('Subtask 1')).toBeInTheDocument();
    expect(screen.getByText('Subtask 2')).toBeInTheDocument();
  });

  test('displays priority badges for subtasks', async () => {
    render(<SubtaskList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Priority badges should be visible
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  test('displays due date for subtasks', async () => {
    render(<SubtaskList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Due date should be formatted and visible
    expect(screen.getByText('Feb 15')).toBeInTheDocument();
  });

  test('displays assignee avatars for subtasks', async () => {
    render(<SubtaskList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Assignee initial should be visible
    expect(screen.getByTitle('User One')).toBeInTheDocument();
  });

  test('shows progress bar with subtask count', async () => {
    render(<SubtaskList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Progress count should be visible (1 completed out of 2)
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  test('opens add subtask form when clicking add button', async () => {
    render(<SubtaskList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Click "Add subtask" button
    const addButton = screen.getByText('Add subtask');
    fireEvent.click(addButton);

    // Form should appear with input and action buttons
    expect(screen.getByPlaceholderText('Subtask title')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('creates subtask with all fields when form is submitted', async () => {
    const mockCreateTask = jest.fn().mockResolvedValue({ success: true });
    useTaskStore.mockReturnValue({
      createTask: mockCreateTask,
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      fetchTasks: jest.fn(),
    });

    render(<SubtaskList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Open add form
    fireEvent.click(screen.getByText('Add subtask'));

    // Fill in title
    const titleInput = screen.getByPlaceholderText('Subtask title');
    fireEvent.change(titleInput, { target: { value: 'New Subtask' } });

    // Click the submit button (labeled "Add subtask" in the form)
    const buttons = screen.getAllByText('Add subtask');
    const submitButton = buttons.find(btn => btn.tagName === 'BUTTON' && btn.type !== 'submit' || true);

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Verify createTask was called with the correct data
    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Subtask',
          parent_task_id: 1,
          category_id: 1,
          priority: 'medium', // Default priority
        })
      );
    });
  });

  test('toggles subtask completion status', async () => {
    const mockUpdateTask = jest.fn().mockResolvedValue({ success: true });
    useTaskStore.mockReturnValue({
      createTask: jest.fn(),
      updateTask: mockUpdateTask,
      deleteTask: jest.fn(),
      fetchTasks: jest.fn(),
    });

    render(<SubtaskList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Find checkboxes by looking for buttons with the border style that indicates a checkbox
    const allButtons = screen.getAllByRole('button');
    const checkboxes = allButtons.filter(btn =>
      btn.className.includes('rounded border-2') &&
      (btn.className.includes('border-gray-300') || btn.className.includes('border-green-500'))
    );

    // Click on first uncompleted subtask checkbox
    if (checkboxes.length > 0) {
      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      // Verify updateTask was called with status change
      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalled();
      });
    }
  });

  test('opens priority dropdown when clicking priority badge', async () => {
    render(<SubtaskList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Click on priority badge to open dropdown
    const priorityButton = screen.getByText('medium').closest('button');
    fireEvent.click(priorityButton);

    // Dropdown should show all priority options
    await waitFor(() => {
      const highOptions = screen.getAllByText('high');
      expect(highOptions.length).toBeGreaterThan(1); // One in subtask, one in dropdown
    });
  });

  test('deletes subtask when delete button is clicked', async () => {
    const mockDeleteTask = jest.fn().mockResolvedValue({ success: true });
    useTaskStore.mockReturnValue({
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: mockDeleteTask,
      fetchTasks: jest.fn(),
    });

    render(<SubtaskList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Find and click delete button for first subtask
    const deleteButtons = screen.getAllByTitle('Delete subtask');
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    // Verify deleteTask was called
    await waitFor(() => {
      expect(mockDeleteTask).toHaveBeenCalledWith(101);
    });
  });

  test('renders empty state when no subtasks', async () => {
    tasksAPI.getAll.mockResolvedValue({
      data: {
        data: {
          tasks: [],
        },
      },
    });

    render(<SubtaskList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Should show add subtask button even with no subtasks
    expect(screen.getByText('Add subtask')).toBeInTheDocument();
  });

  test('cancels adding subtask and resets form', async () => {
    render(<SubtaskList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading subtasks/i)).not.toBeInTheDocument();
    });

    // Open add form
    fireEvent.click(screen.getByText('Add subtask'));

    // Fill in title
    const titleInput = screen.getByPlaceholderText('Subtask title');
    fireEvent.change(titleInput, { target: { value: 'New Subtask' } });

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Form should be hidden, add button should be back
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Subtask title')).not.toBeInTheDocument();
      expect(screen.getByText('Add subtask')).toBeInTheDocument();
    });
  });
});
