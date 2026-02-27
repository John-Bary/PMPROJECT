import { act } from 'react';
import useWorkspaceStore from '../workspaceStore';
import { workspacesAPI } from '../../utils/api';
import { toast } from 'sonner';

// Mock the API module
jest.mock('../../utils/api', () => ({
  workspacesAPI: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getMembers: jest.fn(),
    invite: jest.fn(),
    acceptInvitation: jest.fn(),
    getInvitations: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
    cancelInvitation: jest.fn(),
  },
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock localStorage — use plain functions (not jest.fn) because CRA's resetMocks: true
// clears jest.fn implementations between tests. We spy on methods individually when needed.
const localStorageMock = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const WORKSPACE_STORAGE_KEY = 'todoria_current_workspace_id';

// Helper: default initial state for resetting
const initialState = {
  workspaces: [],
  currentWorkspace: null,
  currentWorkspaceId: null,
  members: [],
  invitations: [],
  isLoading: false,
  isSwitching: false,
  isInitialized: false,
  error: null,
};

// Helper: build a mock API workspace object (server format)
const mockApiWorkspace = (overrides = {}) => ({
  id: 'ws-1',
  name: 'Test Workspace',
  ownerId: 'user-1',
  createdAt: '2025-01-01T00:00:00Z',
  userRole: 'admin',
  memberCount: 3,
  ...overrides,
});

// Helper: the transformed workspace the store produces
const transformedWorkspace = (apiWs) => ({
  id: apiWs.id,
  name: apiWs.name,
  owner_id: apiWs.ownerId,
  created_at: apiWs.createdAt,
  workspace_members: [{ user_id: null, role: apiWs.userRole }],
  userRole: apiWs.userRole,
  memberCount: apiWs.memberCount,
});

describe('Workspace Store', () => {
  beforeEach(() => {
    useWorkspaceStore.setState(initialState);
    jest.clearAllMocks();
    localStorageMock.store = {};
  });

  // ─── initialize ────────────────────────────────────────────
  describe('initialize', () => {
    it('should set isLoading to true during initialization', async () => {
      workspacesAPI.getAll.mockImplementation(() => new Promise(() => {})); // never resolves

      // eslint-disable-next-line no-unused-vars
      const promise = useWorkspaceStore.getState().initialize();

      expect(useWorkspaceStore.getState().isLoading).toBe(true);
    });

    it('should fetch workspaces, transform them and select the first one', async () => {
      const apiWs = mockApiWorkspace();
      workspacesAPI.getAll.mockResolvedValue({
        data: { data: { workspaces: [apiWs] } },
      });
      workspacesAPI.getMembers.mockResolvedValue({
        data: { data: { members: [] } },
      });

      await act(async () => {
        await useWorkspaceStore.getState().initialize();
      });

      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toHaveLength(1);
      expect(state.workspaces[0]).toEqual(transformedWorkspace(apiWs));
      expect(state.currentWorkspace).toEqual(transformedWorkspace(apiWs));
      expect(state.currentWorkspaceId).toBe('ws-1');
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
      expect(localStorageMock.store[WORKSPACE_STORAGE_KEY]).toBe('ws-1');
    });

    it('should restore stored workspace if it exists in the fetched list', async () => {
      // Seed localStorage with a stored workspace ID before initializing
      localStorageMock.store[WORKSPACE_STORAGE_KEY] = 'ws-2';

      const ws1 = mockApiWorkspace({ id: 'ws-1', name: 'First' });
      const ws2 = mockApiWorkspace({ id: 'ws-2', name: 'Second' });
      workspacesAPI.getAll.mockResolvedValue({
        data: { data: { workspaces: [ws1, ws2] } },
      });
      workspacesAPI.getMembers.mockResolvedValue({
        data: { data: { members: [] } },
      });

      await act(async () => {
        await useWorkspaceStore.getState().initialize();
      });

      expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('ws-2');
    });

    it('should fall back to first workspace if stored workspace ID is not in list', async () => {
      localStorageMock.store[WORKSPACE_STORAGE_KEY] = 'ws-deleted';
      const ws1 = mockApiWorkspace({ id: 'ws-1', name: 'First' });
      workspacesAPI.getAll.mockResolvedValue({
        data: { data: { workspaces: [ws1] } },
      });
      workspacesAPI.getMembers.mockResolvedValue({
        data: { data: { members: [] } },
      });

      await act(async () => {
        await useWorkspaceStore.getState().initialize();
      });

      expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('ws-1');
    });

    it('should handle empty workspaces list', async () => {
      workspacesAPI.getAll.mockResolvedValue({
        data: { data: { workspaces: [] } },
      });

      await act(async () => {
        await useWorkspaceStore.getState().initialize();
      });

      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toEqual([]);
      expect(state.currentWorkspace).toBeNull();
      expect(state.currentWorkspaceId).toBeNull();
      expect(state.isInitialized).toBe(true);
    });

    it('should fetch members for the selected workspace', async () => {
      const apiWs = mockApiWorkspace();
      workspacesAPI.getAll.mockResolvedValue({
        data: { data: { workspaces: [apiWs] } },
      });
      workspacesAPI.getMembers.mockResolvedValue({
        data: { data: { members: [] } },
      });

      await act(async () => {
        await useWorkspaceStore.getState().initialize();
      });

      expect(workspacesAPI.getMembers).toHaveBeenCalledWith('ws-1');
    });

    it('should handle initialization error', async () => {
      const error = new Error('Network failure');
      workspacesAPI.getAll.mockRejectedValue(error);

      await act(async () => {
        await useWorkspaceStore.getState().initialize();
      });

      const state = useWorkspaceStore.getState();
      expect(state.error).toBe('Network failure');
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
    });
  });

  // ─── switchWorkspace ───────────────────────────────────────
  describe('switchWorkspace', () => {
    const ws1 = transformedWorkspace(mockApiWorkspace({ id: 'ws-1', name: 'First' }));
    const ws2 = transformedWorkspace(mockApiWorkspace({ id: 'ws-2', name: 'Second' }));

    beforeEach(() => {
      useWorkspaceStore.setState({
        workspaces: [ws1, ws2],
        currentWorkspace: ws1,
        currentWorkspaceId: 'ws-1',
      });
      workspacesAPI.getMembers.mockResolvedValue({
        data: { data: { members: [] } },
      });
    });

    it('should switch to the target workspace', async () => {
      await act(async () => {
        const result = await useWorkspaceStore.getState().switchWorkspace('ws-2');
        expect(result.success).toBe(true);
        expect(result.workspace).toEqual(ws2);
      });

      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspaceId).toBe('ws-2');
      expect(state.currentWorkspace).toEqual(ws2);
      expect(localStorageMock.store[WORKSPACE_STORAGE_KEY]).toBe('ws-2');
      expect(toast.success).toHaveBeenCalledWith('Switched to "Second"');
    });

    it('should set isSwitching while switching', async () => {
      let switchingDuringFetch = false;
      workspacesAPI.getMembers.mockImplementation(() => {
        switchingDuringFetch = useWorkspaceStore.getState().isSwitching;
        return Promise.resolve({ data: { data: { members: [] } } });
      });

      await act(async () => {
        await useWorkspaceStore.getState().switchWorkspace('ws-2');
      });

      expect(switchingDuringFetch).toBe(true);
      expect(useWorkspaceStore.getState().isSwitching).toBe(false);
    });

    it('should clear members and invitations when switching', async () => {
      useWorkspaceStore.setState({
        members: [{ id: 'm-1' }],
        invitations: [{ id: 'inv-1' }],
      });

      let membersDuringFetch;
      workspacesAPI.getMembers.mockImplementation(() => {
        membersDuringFetch = useWorkspaceStore.getState().members;
        return Promise.resolve({ data: { data: { members: [] } } });
      });

      await act(async () => {
        await useWorkspaceStore.getState().switchWorkspace('ws-2');
      });

      expect(membersDuringFetch).toEqual([]);
      expect(useWorkspaceStore.getState().invitations).toEqual([]);
    });

    it('should return error if workspace not found', async () => {
      await act(async () => {
        const result = await useWorkspaceStore.getState().switchWorkspace('ws-nonexistent');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Workspace not found');
      });

      expect(toast.error).toHaveBeenCalledWith('Workspace not found');
    });

    it('should fetch members for the new workspace', async () => {
      await act(async () => {
        await useWorkspaceStore.getState().switchWorkspace('ws-2');
      });

      expect(workspacesAPI.getMembers).toHaveBeenCalledWith('ws-2');
    });
  });

  // ─── getCurrentWorkspace / getCurrentWorkspaceId ───────────
  describe('getters', () => {
    it('getCurrentWorkspace should return currentWorkspace', () => {
      const ws = { id: 'ws-1', name: 'Test' };
      useWorkspaceStore.setState({ currentWorkspace: ws });
      expect(useWorkspaceStore.getState().getCurrentWorkspace()).toEqual(ws);
    });

    it('getCurrentWorkspaceId should return currentWorkspaceId', () => {
      useWorkspaceStore.setState({ currentWorkspaceId: 'ws-42' });
      expect(useWorkspaceStore.getState().getCurrentWorkspaceId()).toBe('ws-42');
    });
  });

  // ─── fetchWorkspaces ──────────────────────────────────────
  describe('fetchWorkspaces', () => {
    it('should fetch and transform workspaces', async () => {
      const apiWs = mockApiWorkspace();
      workspacesAPI.getAll.mockResolvedValue({
        data: { data: { workspaces: [apiWs] } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().fetchWorkspaces();
        expect(result.success).toBe(true);
        expect(result.workspaces).toHaveLength(1);
      });

      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toHaveLength(1);
      expect(state.isLoading).toBe(false);
    });

    it('should set isLoading during fetch', async () => {
      workspacesAPI.getAll.mockImplementation(() => new Promise(() => {}));

      // eslint-disable-next-line no-unused-vars
      const promise = useWorkspaceStore.getState().fetchWorkspaces();

      expect(useWorkspaceStore.getState().isLoading).toBe(true);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Fetch failed');
      workspacesAPI.getAll.mockRejectedValue(error);

      await act(async () => {
        const result = await useWorkspaceStore.getState().fetchWorkspaces();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Fetch failed');
      });

      expect(useWorkspaceStore.getState().error).toBe('Fetch failed');
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch workspaces');
    });
  });

  // ─── createWorkspace ──────────────────────────────────────
  describe('createWorkspace', () => {
    it('should create a workspace, add it to list and show toast', async () => {
      const apiWs = {
        id: 'ws-new',
        name: 'New Workspace',
        ownerId: 'user-1',
        createdAt: '2025-06-01T00:00:00Z',
      };
      workspacesAPI.create.mockResolvedValue({
        data: { data: { workspace: apiWs } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().createWorkspace('New Workspace');
        expect(result.success).toBe(true);
        expect(result.workspace.id).toBe('ws-new');
        expect(result.workspace.userRole).toBe('admin');
        expect(result.workspace.memberCount).toBe(1);
      });

      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toHaveLength(1);
      expect(state.isLoading).toBe(false);
      expect(toast.success).toHaveBeenCalledWith('Workspace "New Workspace" created');
    });

    it('should set isLoading during creation', async () => {
      workspacesAPI.create.mockImplementation(() => new Promise(() => {}));

      // eslint-disable-next-line no-unused-vars
      const promise = useWorkspaceStore.getState().createWorkspace('Test');

      expect(useWorkspaceStore.getState().isLoading).toBe(true);
    });

    it('should handle creation error with API message', async () => {
      workspacesAPI.create.mockRejectedValue({
        message: 'Server error',
        response: { data: { message: 'Plan limit reached' } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().createWorkspace('Another');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Plan limit reached');
      });

      expect(toast.error).toHaveBeenCalledWith('Plan limit reached');
      expect(useWorkspaceStore.getState().isLoading).toBe(false);
    });

    it('should fall back to error.message when no API message', async () => {
      workspacesAPI.create.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        const result = await useWorkspaceStore.getState().createWorkspace('Another');
        expect(result.error).toBe('Network error');
      });
    });
  });

  // ─── updateWorkspace ──────────────────────────────────────
  describe('updateWorkspace', () => {
    const ws1 = transformedWorkspace(mockApiWorkspace({ id: 'ws-1', name: 'Original' }));

    beforeEach(() => {
      useWorkspaceStore.setState({
        workspaces: [ws1],
        currentWorkspace: ws1,
        currentWorkspaceId: 'ws-1',
      });
    });

    it('should update workspace name in workspaces list and currentWorkspace', async () => {
      workspacesAPI.update.mockResolvedValue({
        data: { data: { workspace: { id: 'ws-1', name: 'Updated' } } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().updateWorkspace('ws-1', { name: 'Updated' });
        expect(result.success).toBe(true);
      });

      const state = useWorkspaceStore.getState();
      expect(state.workspaces[0].name).toBe('Updated');
      expect(state.currentWorkspace.name).toBe('Updated');
      expect(toast.success).toHaveBeenCalledWith('Workspace updated');
    });

    it('should not update currentWorkspace if updating a different workspace', async () => {
      const ws2 = transformedWorkspace(mockApiWorkspace({ id: 'ws-2', name: 'Other' }));
      useWorkspaceStore.setState({
        workspaces: [ws1, ws2],
        currentWorkspace: ws1,
        currentWorkspaceId: 'ws-1',
      });

      workspacesAPI.update.mockResolvedValue({
        data: { data: { workspace: { id: 'ws-2', name: 'Other Updated' } } },
      });

      await act(async () => {
        await useWorkspaceStore.getState().updateWorkspace('ws-2', { name: 'Other Updated' });
      });

      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspace.name).toBe('Original');
      expect(state.workspaces.find(w => w.id === 'ws-2').name).toBe('Other Updated');
    });

    it('should handle update error', async () => {
      workspacesAPI.update.mockRejectedValue({
        message: 'Server error',
        response: { data: { message: 'Not authorized' } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().updateWorkspace('ws-1', { name: 'X' });
        expect(result.success).toBe(false);
        expect(result.error).toBe('Not authorized');
      });

      expect(toast.error).toHaveBeenCalledWith('Not authorized');
    });
  });

  // ─── deleteWorkspace ──────────────────────────────────────
  describe('deleteWorkspace', () => {
    it('should delete workspace and switch to another when deleting current', async () => {
      const ws1 = transformedWorkspace(mockApiWorkspace({ id: 'ws-1', name: 'First' }));
      const ws2 = transformedWorkspace(mockApiWorkspace({ id: 'ws-2', name: 'Second' }));
      useWorkspaceStore.setState({
        workspaces: [ws1, ws2],
        currentWorkspace: ws1,
        currentWorkspaceId: 'ws-1',
      });

      workspacesAPI.delete.mockResolvedValue({});

      await act(async () => {
        const result = await useWorkspaceStore.getState().deleteWorkspace('ws-1');
        expect(result.success).toBe(true);
      });

      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toHaveLength(1);
      expect(state.currentWorkspaceId).toBe('ws-2');
      expect(state.currentWorkspace).toEqual(ws2);
      expect(localStorageMock.store[WORKSPACE_STORAGE_KEY]).toBe('ws-2');
      expect(toast.success).toHaveBeenCalledWith('Workspace deleted');
    });

    it('should clear everything when deleting the last workspace', async () => {
      const ws1 = transformedWorkspace(mockApiWorkspace({ id: 'ws-1' }));
      useWorkspaceStore.setState({
        workspaces: [ws1],
        currentWorkspace: ws1,
        currentWorkspaceId: 'ws-1',
      });

      workspacesAPI.delete.mockResolvedValue({});

      await act(async () => {
        await useWorkspaceStore.getState().deleteWorkspace('ws-1');
      });

      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toEqual([]);
      expect(state.currentWorkspace).toBeNull();
      expect(state.currentWorkspaceId).toBeNull();
      expect(localStorageMock.store[WORKSPACE_STORAGE_KEY]).toBeUndefined();
    });

    it('should just remove from list when deleting a non-current workspace', async () => {
      const ws1 = transformedWorkspace(mockApiWorkspace({ id: 'ws-1', name: 'First' }));
      const ws2 = transformedWorkspace(mockApiWorkspace({ id: 'ws-2', name: 'Second' }));
      useWorkspaceStore.setState({
        workspaces: [ws1, ws2],
        currentWorkspace: ws1,
        currentWorkspaceId: 'ws-1',
      });

      workspacesAPI.delete.mockResolvedValue({});

      await act(async () => {
        await useWorkspaceStore.getState().deleteWorkspace('ws-2');
      });

      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toHaveLength(1);
      expect(state.currentWorkspaceId).toBe('ws-1');
    });

    it('should handle delete error', async () => {
      const ws1 = transformedWorkspace(mockApiWorkspace({ id: 'ws-1' }));
      useWorkspaceStore.setState({
        workspaces: [ws1],
        currentWorkspace: ws1,
        currentWorkspaceId: 'ws-1',
      });

      workspacesAPI.delete.mockRejectedValue({
        message: 'err',
        response: { data: { message: 'Cannot delete workspace' } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().deleteWorkspace('ws-1');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Cannot delete workspace');
      });

      expect(toast.error).toHaveBeenCalledWith('Cannot delete workspace');
    });
  });

  // ─── fetchMembers ─────────────────────────────────────────
  describe('fetchMembers', () => {
    it('should fetch and transform members', async () => {
      const apiMembers = [
        {
          memberId: 'm-1',
          userId: 'u-1',
          role: 'admin',
          joinedAt: '2025-01-01T00:00:00Z',
          email: 'alice@test.com',
          name: 'Alice',
          avatarUrl: null,
        },
      ];
      workspacesAPI.getMembers.mockResolvedValue({
        data: { data: { members: apiMembers } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().fetchMembers('ws-1');
        expect(result.success).toBe(true);
        expect(result.members).toHaveLength(1);
      });

      const state = useWorkspaceStore.getState();
      expect(state.members).toHaveLength(1);
      expect(state.members[0]).toEqual({
        id: 'm-1',
        user_id: 'u-1',
        role: 'admin',
        joined_at: '2025-01-01T00:00:00Z',
        user: {
          id: 'u-1',
          email: 'alice@test.com',
          name: 'Alice',
          avatarUrl: null,
        },
      });
    });

    it('should handle fetch members error', async () => {
      workspacesAPI.getMembers.mockRejectedValue(new Error('Unauthorized'));

      await act(async () => {
        const result = await useWorkspaceStore.getState().fetchMembers('ws-1');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });
    });
  });

  // ─── inviteUser ───────────────────────────────────────────
  describe('inviteUser', () => {
    it('should return error when no workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      await act(async () => {
        const result = await useWorkspaceStore.getState().inviteUser('bob@test.com');
        expect(result.success).toBe(false);
        expect(result.error).toBe('No workspace selected');
      });
    });

    it('should send invitation, add to invitations list and show toast', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: 'ws-1' });

      const apiInvitation = {
        id: 'inv-1',
        email: 'bob@test.com',
        role: 'member',
        token: 'tok-abc',
        expiresAt: '2025-07-01T00:00:00Z',
        createdAt: '2025-06-01T00:00:00Z',
      };
      workspacesAPI.invite.mockResolvedValue({
        data: { data: { invitation: apiInvitation } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().inviteUser('bob@test.com', 'member');
        expect(result.success).toBe(true);
        expect(result.invitation.email).toBe('bob@test.com');
      });

      const state = useWorkspaceStore.getState();
      expect(state.invitations).toHaveLength(1);
      expect(state.invitations[0]).toEqual({
        id: 'inv-1',
        email: 'bob@test.com',
        role: 'member',
        token: 'tok-abc',
        expires_at: '2025-07-01T00:00:00Z',
        created_at: '2025-06-01T00:00:00Z',
      });
      expect(workspacesAPI.invite).toHaveBeenCalledWith('ws-1', 'bob@test.com', 'member');
      expect(toast.success).toHaveBeenCalledWith('Invitation sent to bob@test.com');
    });

    it('should handle invitation error', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: 'ws-1' });
      workspacesAPI.invite.mockRejectedValue({
        message: 'err',
        response: { data: { message: 'User already a member' } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().inviteUser('existing@test.com');
        expect(result.success).toBe(false);
        expect(result.error).toBe('User already a member');
      });

      expect(toast.error).toHaveBeenCalledWith('User already a member');
    });
  });

  // ─── acceptInvitation ─────────────────────────────────────
  describe('acceptInvitation', () => {
    it('should accept invitation, refresh workspaces and switch to joined workspace', async () => {
      workspacesAPI.acceptInvitation.mockResolvedValue({
        data: {
          message: 'Joined workspace',
          data: { workspaceId: 'ws-joined', needsOnboarding: false },
        },
      });

      // fetchWorkspaces is called internally — mock getAll to return the joined workspace
      const apiWs = mockApiWorkspace({ id: 'ws-joined', name: 'Joined' });
      workspacesAPI.getAll.mockResolvedValue({
        data: { data: { workspaces: [apiWs] } },
      });
      workspacesAPI.getMembers.mockResolvedValue({
        data: { data: { members: [] } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().acceptInvitation('tok-abc');
        expect(result.success).toBe(true);
        expect(result.workspaceId).toBe('ws-joined');
        expect(result.needsOnboarding).toBe(false);
      });

      expect(workspacesAPI.acceptInvitation).toHaveBeenCalledWith('tok-abc');
      expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('ws-joined');
      expect(toast.success).toHaveBeenCalledWith('Joined workspace');
    });

    it('should not fetch members when needsOnboarding is true', async () => {
      workspacesAPI.acceptInvitation.mockResolvedValue({
        data: {
          message: 'Joined workspace',
          data: { workspaceId: 'ws-joined', needsOnboarding: true },
        },
      });

      const apiWs = mockApiWorkspace({ id: 'ws-joined', name: 'Joined' });
      workspacesAPI.getAll.mockResolvedValue({
        data: { data: { workspaces: [apiWs] } },
      });
      workspacesAPI.getMembers.mockResolvedValue({
        data: { data: { members: [] } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().acceptInvitation('tok-abc');
        expect(result.needsOnboarding).toBe(true);
      });

      // getMembers should only have been called from fetchWorkspaces' internal call, not the acceptInvitation
      // Since fetchWorkspaces does NOT call fetchMembers, getMembers should NOT be called at all
      expect(workspacesAPI.getMembers).not.toHaveBeenCalled();
    });

    it('should handle accept invitation error', async () => {
      workspacesAPI.acceptInvitation.mockRejectedValue({
        message: 'err',
        response: { data: { message: 'Invitation expired' } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().acceptInvitation('tok-expired');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invitation expired');
      });

      expect(toast.error).toHaveBeenCalledWith('Invitation expired');
    });
  });

  // ─── fetchInvitations ─────────────────────────────────────
  describe('fetchInvitations', () => {
    it('should bail out when no workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      await act(async () => {
        const result = await useWorkspaceStore.getState().fetchInvitations();
        expect(result).toBeUndefined();
      });

      expect(workspacesAPI.getInvitations).not.toHaveBeenCalled();
    });

    it('should fetch and transform invitations', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: 'ws-1' });
      const apiInvitations = [
        {
          id: 'inv-1',
          email: 'bob@test.com',
          role: 'member',
          expiresAt: '2025-07-01T00:00:00Z',
          createdAt: '2025-06-01T00:00:00Z',
          invitedByName: 'Alice',
        },
      ];
      workspacesAPI.getInvitations.mockResolvedValue({
        data: { data: { invitations: apiInvitations } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().fetchInvitations();
        expect(result.success).toBe(true);
        expect(result.invitations).toHaveLength(1);
      });

      const state = useWorkspaceStore.getState();
      expect(state.invitations).toHaveLength(1);
      expect(state.invitations[0]).toEqual({
        id: 'inv-1',
        email: 'bob@test.com',
        role: 'member',
        expires_at: '2025-07-01T00:00:00Z',
        created_at: '2025-06-01T00:00:00Z',
        invited_by_name: 'Alice',
      });
    });

    it('should handle fetch invitations error', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: 'ws-1' });
      workspacesAPI.getInvitations.mockRejectedValue(new Error('Forbidden'));

      await act(async () => {
        const result = await useWorkspaceStore.getState().fetchInvitations();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Forbidden');
      });
    });
  });

  // ─── removeMember ─────────────────────────────────────────
  describe('removeMember', () => {
    it('should return error when no workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      await act(async () => {
        const result = await useWorkspaceStore.getState().removeMember('m-1');
        expect(result.success).toBe(false);
        expect(result.error).toBe('No workspace selected');
      });
    });

    it('should remove member from list and show toast', async () => {
      useWorkspaceStore.setState({
        currentWorkspaceId: 'ws-1',
        members: [
          { id: 'm-1', user_id: 'u-1', role: 'member' },
          { id: 'm-2', user_id: 'u-2', role: 'admin' },
        ],
      });
      workspacesAPI.removeMember.mockResolvedValue({});

      await act(async () => {
        const result = await useWorkspaceStore.getState().removeMember('m-1');
        expect(result.success).toBe(true);
      });

      const state = useWorkspaceStore.getState();
      expect(state.members).toHaveLength(1);
      expect(state.members.find(m => m.id === 'm-1')).toBeUndefined();
      expect(workspacesAPI.removeMember).toHaveBeenCalledWith('ws-1', 'm-1');
      expect(toast.success).toHaveBeenCalledWith('Member removed');
    });

    it('should handle remove member error', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: 'ws-1' });
      workspacesAPI.removeMember.mockRejectedValue({
        message: 'err',
        response: { data: { message: 'Cannot remove owner' } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().removeMember('m-1');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Cannot remove owner');
      });

      expect(toast.error).toHaveBeenCalledWith('Cannot remove owner');
    });
  });

  // ─── updateMemberRole ─────────────────────────────────────
  describe('updateMemberRole', () => {
    it('should return error when no workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      await act(async () => {
        const result = await useWorkspaceStore.getState().updateMemberRole('m-1', 'admin');
        expect(result.success).toBe(false);
        expect(result.error).toBe('No workspace selected');
      });
    });

    it('should update member role in list and show toast', async () => {
      useWorkspaceStore.setState({
        currentWorkspaceId: 'ws-1',
        members: [
          { id: 'm-1', user_id: 'u-1', role: 'member' },
        ],
      });
      workspacesAPI.updateMemberRole.mockResolvedValue({});

      await act(async () => {
        const result = await useWorkspaceStore.getState().updateMemberRole('m-1', 'admin');
        expect(result.success).toBe(true);
      });

      expect(useWorkspaceStore.getState().members[0].role).toBe('admin');
      expect(workspacesAPI.updateMemberRole).toHaveBeenCalledWith('ws-1', 'm-1', 'admin');
      expect(toast.success).toHaveBeenCalledWith('Member role updated');
    });

    it('should handle update role error', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: 'ws-1' });
      workspacesAPI.updateMemberRole.mockRejectedValue({
        message: 'err',
        response: { data: { message: 'Forbidden' } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().updateMemberRole('m-1', 'admin');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Forbidden');
      });

      expect(toast.error).toHaveBeenCalledWith('Forbidden');
    });
  });

  // ─── cancelInvitation ─────────────────────────────────────
  describe('cancelInvitation', () => {
    it('should return error when no workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      await act(async () => {
        const result = await useWorkspaceStore.getState().cancelInvitation('inv-1');
        expect(result.success).toBe(false);
        expect(result.error).toBe('No workspace selected');
      });
    });

    it('should remove invitation from list and show toast', async () => {
      useWorkspaceStore.setState({
        currentWorkspaceId: 'ws-1',
        invitations: [
          { id: 'inv-1', email: 'bob@test.com' },
          { id: 'inv-2', email: 'carol@test.com' },
        ],
      });
      workspacesAPI.cancelInvitation.mockResolvedValue({});

      await act(async () => {
        const result = await useWorkspaceStore.getState().cancelInvitation('inv-1');
        expect(result.success).toBe(true);
      });

      const state = useWorkspaceStore.getState();
      expect(state.invitations).toHaveLength(1);
      expect(state.invitations.find(i => i.id === 'inv-1')).toBeUndefined();
      expect(workspacesAPI.cancelInvitation).toHaveBeenCalledWith('ws-1', 'inv-1');
      expect(toast.success).toHaveBeenCalledWith('Invitation cancelled');
    });

    it('should handle cancel invitation error', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: 'ws-1' });
      workspacesAPI.cancelInvitation.mockRejectedValue({
        message: 'err',
        response: { data: { message: 'Invitation not found' } },
      });

      await act(async () => {
        const result = await useWorkspaceStore.getState().cancelInvitation('inv-1');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invitation not found');
      });

      expect(toast.error).toHaveBeenCalledWith('Invitation not found');
    });
  });

  // ─── isCurrentUserAdmin ───────────────────────────────────
  describe('isCurrentUserAdmin', () => {
    it('should return false when no currentWorkspace', () => {
      useWorkspaceStore.setState({ currentWorkspace: null, members: [] });
      expect(useWorkspaceStore.getState().isCurrentUserAdmin('u-1')).toBe(false);
    });

    it('should return false when no userId provided', () => {
      useWorkspaceStore.setState({
        currentWorkspace: { id: 'ws-1', userRole: 'admin' },
      });
      expect(useWorkspaceStore.getState().isCurrentUserAdmin(null)).toBe(false);
    });

    it('should return true when workspace userRole is admin', () => {
      useWorkspaceStore.setState({
        currentWorkspace: { id: 'ws-1', userRole: 'admin' },
        members: [],
      });
      expect(useWorkspaceStore.getState().isCurrentUserAdmin('u-1')).toBe(true);
    });

    it('should fallback to members array and return true for admin member', () => {
      useWorkspaceStore.setState({
        currentWorkspace: { id: 'ws-1', userRole: 'member' },
        members: [
          { id: 'm-1', user_id: 'u-1', role: 'admin' },
        ],
      });
      expect(useWorkspaceStore.getState().isCurrentUserAdmin('u-1')).toBe(true);
    });

    it('should return false when user is a regular member', () => {
      useWorkspaceStore.setState({
        currentWorkspace: { id: 'ws-1', userRole: 'member' },
        members: [
          { id: 'm-1', user_id: 'u-1', role: 'member' },
        ],
      });
      expect(useWorkspaceStore.getState().isCurrentUserAdmin('u-1')).toBe(false);
    });
  });

  // ─── clear ────────────────────────────────────────────────
  describe('clear', () => {
    it('should reset all state and clear localStorage', () => {
      useWorkspaceStore.setState({
        workspaces: [{ id: 'ws-1' }],
        currentWorkspace: { id: 'ws-1' },
        currentWorkspaceId: 'ws-1',
        members: [{ id: 'm-1' }],
        invitations: [{ id: 'inv-1' }],
        isLoading: true,
        isSwitching: true,
        isInitialized: true,
        error: 'some error',
      });

      act(() => {
        useWorkspaceStore.getState().clear();
      });

      const state = useWorkspaceStore.getState();
      expect(state.workspaces).toEqual([]);
      expect(state.currentWorkspace).toBeNull();
      expect(state.currentWorkspaceId).toBeNull();
      expect(state.members).toEqual([]);
      expect(state.invitations).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.isSwitching).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
      expect(localStorageMock.store[WORKSPACE_STORAGE_KEY]).toBeUndefined();
    });
  });
});
