import { act } from 'react';
import useUserStore from '../userStore';
import { workspacesAPI } from '../../utils/api';
import { toast } from 'sonner';

jest.mock('../../utils/api', () => ({
  workspacesAPI: {
    getUsers: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

const initialState = {
  users: [],
  currentWorkspaceId: null,
  isLoading: false,
  error: null,
};

const mockUsers = [
  { id: 1, name: 'Alice', email: 'alice@todoria.app' },
  { id: 2, name: 'Bob', email: 'bob@todoria.app' },
];

describe('User Store', () => {
  beforeEach(() => {
    useUserStore.setState(initialState);
    jest.clearAllMocks();
  });

  describe('fetchUsers', () => {
    it('should fetch users for a workspace', async () => {
      workspacesAPI.getUsers.mockResolvedValueOnce({
        data: { data: { users: mockUsers } },
      });

      await act(async () => {
        await useUserStore.getState().fetchUsers('ws-1');
      });

      const state = useUserStore.getState();
      expect(state.users).toEqual(mockUsers);
      expect(state.currentWorkspaceId).toBe('ws-1');
      expect(state.isLoading).toBe(false);
      expect(workspacesAPI.getUsers).toHaveBeenCalledWith('ws-1');
    });

    it('should skip fetch if already loaded for the same workspace', async () => {
      useUserStore.setState({
        users: mockUsers,
        currentWorkspaceId: 'ws-1',
      });

      await act(async () => {
        await useUserStore.getState().fetchUsers('ws-1');
      });

      expect(workspacesAPI.getUsers).not.toHaveBeenCalled();
    });

    it('should refetch if workspace changes', async () => {
      useUserStore.setState({
        users: mockUsers,
        currentWorkspaceId: 'ws-1',
      });

      workspacesAPI.getUsers.mockResolvedValueOnce({
        data: { data: { users: [{ id: 3, name: 'Charlie' }] } },
      });

      await act(async () => {
        await useUserStore.getState().fetchUsers('ws-2');
      });

      const state = useUserStore.getState();
      expect(state.users).toEqual([{ id: 3, name: 'Charlie' }]);
      expect(state.currentWorkspaceId).toBe('ws-2');
      expect(workspacesAPI.getUsers).toHaveBeenCalledWith('ws-2');
    });

    it('should clear users when workspaceId is null', async () => {
      useUserStore.setState({ users: mockUsers, currentWorkspaceId: 'ws-1' });

      await act(async () => {
        await useUserStore.getState().fetchUsers(null);
      });

      const state = useUserStore.getState();
      expect(state.users).toEqual([]);
      expect(state.isLoading).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      workspacesAPI.getUsers.mockRejectedValueOnce({
        response: { data: { message: 'Forbidden' } },
      });

      await act(async () => {
        await useUserStore.getState().fetchUsers('ws-1');
      });

      const state = useUserStore.getState();
      expect(state.error).toBe('Forbidden');
      expect(state.isLoading).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Forbidden');
    });

    it('should use fallback error message when no response message', async () => {
      workspacesAPI.getUsers.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useUserStore.getState().fetchUsers('ws-1');
      });

      const state = useUserStore.getState();
      expect(state.error).toBe('Failed to fetch workspace users');
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch workspace users');
    });
  });

  describe('refreshUsers', () => {
    it('should force refresh even if already loaded', async () => {
      useUserStore.setState({
        users: mockUsers,
        currentWorkspaceId: 'ws-1',
      });

      workspacesAPI.getUsers.mockResolvedValueOnce({
        data: { data: { users: [{ id: 3, name: 'Charlie' }] } },
      });

      await act(async () => {
        await useUserStore.getState().refreshUsers('ws-1');
      });

      const state = useUserStore.getState();
      expect(state.users).toEqual([{ id: 3, name: 'Charlie' }]);
      expect(workspacesAPI.getUsers).toHaveBeenCalledWith('ws-1');
    });

    it('should clear users when workspaceId is null', async () => {
      useUserStore.setState({ users: mockUsers });

      await act(async () => {
        await useUserStore.getState().refreshUsers(null);
      });

      expect(useUserStore.getState().users).toEqual([]);
    });

    it('should handle errors on refresh', async () => {
      workspacesAPI.getUsers.mockRejectedValueOnce({
        response: { data: { message: 'Server error' } },
      });

      await act(async () => {
        await useUserStore.getState().refreshUsers('ws-1');
      });

      expect(useUserStore.getState().error).toBe('Server error');
      expect(toast.error).toHaveBeenCalledWith('Server error');
    });
  });

  describe('clearUsers', () => {
    it('should reset all state', () => {
      useUserStore.setState({
        users: mockUsers,
        currentWorkspaceId: 'ws-1',
        isLoading: true,
        error: 'some error',
      });

      act(() => {
        useUserStore.getState().clearUsers();
      });

      const state = useUserStore.getState();
      expect(state.users).toEqual([]);
      expect(state.currentWorkspaceId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
