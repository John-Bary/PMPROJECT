// Workspace State Management with Zustand
// Uses Express API backend for workspace operations
import { create } from 'zustand';
import { workspacesAPI } from '../utils/api';
import toast from 'react-hot-toast';

const WORKSPACE_STORAGE_KEY = 'arena_current_workspace_id';

const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  currentWorkspaceId: localStorage.getItem(WORKSPACE_STORAGE_KEY) || null,
  members: [],
  invitations: [],
  isLoading: false,
  isInitialized: false,
  error: null,

  // Initialize workspace data on app load
  initialize: async () => {
    set({ isLoading: true, error: null });

    try {
      // Fetch user's workspaces from Express API
      const response = await workspacesAPI.getAll();
      const workspaces = response.data.data.workspaces || [];

      // Transform API response to match expected format
      const transformedWorkspaces = workspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        owner_id: ws.ownerId,
        created_at: ws.createdAt,
        workspace_members: [{ user_id: null, role: ws.userRole }], // For role checking
        userRole: ws.userRole,
        memberCount: ws.memberCount,
      }));

      // Get stored workspace ID from localStorage
      const storedWorkspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY);

      // Determine which workspace to set as current
      let currentWorkspace = null;
      let currentWorkspaceId = null;

      if (transformedWorkspaces.length > 0) {
        // Try to use stored workspace if it exists and user has access
        if (storedWorkspaceId) {
          currentWorkspace = transformedWorkspaces.find(w => w.id === storedWorkspaceId);
        }

        // Fall back to first workspace if stored one not found
        if (!currentWorkspace) {
          currentWorkspace = transformedWorkspaces[0];
        }

        currentWorkspaceId = currentWorkspace.id;
        localStorage.setItem(WORKSPACE_STORAGE_KEY, currentWorkspaceId);
      }

      set({
        workspaces: transformedWorkspaces,
        currentWorkspace,
        currentWorkspaceId,
        isLoading: false,
        isInitialized: true,
      });

      // Fetch members for current workspace
      if (currentWorkspaceId) {
        get().fetchMembers(currentWorkspaceId);
      }
    } catch (error) {
      console.error('Failed to initialize workspaces:', error);
      set({
        error: error.message,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  // Switch to a different workspace
  switchWorkspace: async (workspaceId) => {
    const { workspaces } = get();
    const workspace = workspaces.find(w => w.id === workspaceId);

    if (!workspace) {
      toast.error('Workspace not found');
      return { success: false, error: 'Workspace not found' };
    }

    // Update state and localStorage
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    set({
      currentWorkspace: workspace,
      currentWorkspaceId: workspaceId,
      members: [], // Clear members, will be refetched
      invitations: [], // Clear invitations, will be refetched
    });

    // Fetch members for new workspace
    get().fetchMembers(workspaceId);

    toast.success(`Switched to "${workspace.name}"`);
    return { success: true, workspace };
  },

  // Get current workspace (getter function)
  getCurrentWorkspace: () => {
    return get().currentWorkspace;
  },

  // Get current workspace ID (for filtering queries)
  getCurrentWorkspaceId: () => {
    return get().currentWorkspaceId;
  },

  // Fetch workspaces (refresh)
  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesAPI.getAll();
      const workspaces = response.data.data.workspaces || [];

      // Transform API response
      const transformedWorkspaces = workspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        owner_id: ws.ownerId,
        created_at: ws.createdAt,
        workspace_members: [{ user_id: null, role: ws.userRole }],
        userRole: ws.userRole,
        memberCount: ws.memberCount,
      }));

      set({
        workspaces: transformedWorkspaces,
        isLoading: false,
      });

      return { success: true, workspaces: transformedWorkspaces };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      toast.error('Failed to fetch workspaces');
      return { success: false, error: error.message };
    }
  },

  // Create a new workspace
  createWorkspace: async (name) => {
    set({ isLoading: true, error: null });

    try {
      const response = await workspacesAPI.create({ name });
      const workspace = response.data.data.workspace;

      // Transform to match expected format
      const transformedWorkspace = {
        id: workspace.id,
        name: workspace.name,
        owner_id: workspace.ownerId,
        created_at: workspace.createdAt,
        workspace_members: [{ user_id: null, role: 'admin' }],
        userRole: 'admin',
        memberCount: 1,
      };

      // Update local state
      set((state) => ({
        workspaces: [...state.workspaces, transformedWorkspace],
        isLoading: false,
      }));

      toast.success(`Workspace "${name}" created`);
      return { success: true, workspace: transformedWorkspace };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create workspace';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  },

  // Update workspace
  updateWorkspace: async (workspaceId, data) => {
    try {
      const response = await workspacesAPI.update(workspaceId, data);
      const workspace = response.data.data.workspace;

      set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === workspaceId ? { ...w, name: workspace.name } : w
        ),
        currentWorkspace: state.currentWorkspaceId === workspaceId
          ? { ...state.currentWorkspace, name: workspace.name }
          : state.currentWorkspace,
      }));

      toast.success('Workspace updated');
      return { success: true, workspace };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update workspace';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  },

  // Delete workspace
  deleteWorkspace: async (workspaceId) => {
    try {
      await workspacesAPI.delete(workspaceId);

      const { workspaces, currentWorkspaceId } = get();
      const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceId);

      // If deleted workspace was current, switch to another
      if (currentWorkspaceId === workspaceId && remainingWorkspaces.length > 0) {
        const newCurrent = remainingWorkspaces[0];
        localStorage.setItem(WORKSPACE_STORAGE_KEY, newCurrent.id);
        set({
          workspaces: remainingWorkspaces,
          currentWorkspace: newCurrent,
          currentWorkspaceId: newCurrent.id,
        });
      } else if (remainingWorkspaces.length === 0) {
        localStorage.removeItem(WORKSPACE_STORAGE_KEY);
        set({
          workspaces: [],
          currentWorkspace: null,
          currentWorkspaceId: null,
        });
      } else {
        set({ workspaces: remainingWorkspaces });
      }

      toast.success('Workspace deleted');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to delete workspace';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  },

  // Fetch workspace members
  fetchMembers: async (workspaceId) => {
    try {
      const response = await workspacesAPI.getMembers(workspaceId);
      const members = response.data.data.members || [];

      // Transform to match expected format (compatible with TeamSettings)
      const transformedMembers = members.map(m => ({
        id: m.memberId,
        user_id: m.userId,
        role: m.role,
        joined_at: m.joinedAt,
        user: {
          id: m.userId,
          email: m.email,
          name: m.name,
          avatarUrl: m.avatarUrl,
        }
      }));

      set({ members: transformedMembers });
      return { success: true, members: transformedMembers };
    } catch (error) {
      console.error('Failed to fetch members:', error);
      return { success: false, error: error.message };
    }
  },

  // Invite user to workspace
  inviteUser: async (email, role = 'member') => {
    const { currentWorkspaceId, currentWorkspace } = get();
    if (!currentWorkspaceId) {
      return { success: false, error: 'No workspace selected' };
    }

    try {
      const response = await workspacesAPI.invite(currentWorkspaceId, email, role);
      const invitation = response.data.data.invitation;

      // Transform to match expected format
      const transformedInvitation = {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expires_at: invitation.expiresAt,
        created_at: invitation.createdAt,
      };

      set((state) => ({
        invitations: [...state.invitations, transformedInvitation],
      }));

      toast.success(`Invitation sent to ${email}`);
      return { success: true, invitation: transformedInvitation };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to send invitation';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  },

  // Accept invitation (via token)
  acceptInvitation: async (token) => {
    try {
      const response = await workspacesAPI.acceptInvitation(token);
      const data = response.data.data;

      // Refresh workspaces to include the new one
      await get().fetchWorkspaces();

      toast.success(response.data.message || 'Successfully joined workspace');
      return { success: true, workspaceId: data.workspaceId };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to accept invitation';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  },

  // Fetch invitations for current workspace
  fetchInvitations: async () => {
    const { currentWorkspaceId } = get();
    if (!currentWorkspaceId) return;

    try {
      const response = await workspacesAPI.getInvitations(currentWorkspaceId);
      const invitations = response.data.data.invitations || [];

      // Transform to match expected format
      const transformedInvitations = invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expires_at: inv.expiresAt,
        created_at: inv.createdAt,
        invited_by_name: inv.invitedByName,
      }));

      set({ invitations: transformedInvitations });
      return { success: true, invitations: transformedInvitations };
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove member from workspace
  removeMember: async (memberId) => {
    const { currentWorkspaceId } = get();
    if (!currentWorkspaceId) {
      return { success: false, error: 'No workspace selected' };
    }

    try {
      await workspacesAPI.removeMember(currentWorkspaceId, memberId);

      set((state) => ({
        members: state.members.filter(m => m.id !== memberId),
      }));

      toast.success('Member removed');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to remove member';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  },

  // Update member role
  updateMemberRole: async (memberId, role) => {
    const { currentWorkspaceId } = get();
    if (!currentWorkspaceId) {
      return { success: false, error: 'No workspace selected' };
    }

    try {
      await workspacesAPI.updateMemberRole(currentWorkspaceId, memberId, role);

      set((state) => ({
        members: state.members.map(m =>
          m.id === memberId ? { ...m, role } : m
        ),
      }));

      toast.success('Member role updated');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update member role';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  },

  // Cancel/delete invitation
  cancelInvitation: async (invitationId) => {
    const { currentWorkspaceId } = get();
    if (!currentWorkspaceId) {
      return { success: false, error: 'No workspace selected' };
    }

    try {
      await workspacesAPI.cancelInvitation(currentWorkspaceId, invitationId);

      set((state) => ({
        invitations: state.invitations.filter(i => i.id !== invitationId),
      }));

      toast.success('Invitation cancelled');
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to cancel invitation';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  },

  // Check if user is admin of current workspace
  isCurrentUserAdmin: (userId) => {
    const { currentWorkspace, members } = get();
    if (!currentWorkspace || !userId) return false;

    // First check from workspace's userRole (from getAll response)
    if (currentWorkspace.userRole === 'admin') return true;

    // Fallback: check from members array
    const currentMember = members.find(m => m.user_id === userId);
    return currentMember?.role === 'admin';
  },

  // Clear workspace state (on logout)
  clear: () => {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    set({
      workspaces: [],
      currentWorkspace: null,
      currentWorkspaceId: null,
      members: [],
      invitations: [],
      isLoading: false,
      isInitialized: false,
      error: null,
    });
  },
}));

export default useWorkspaceStore;
