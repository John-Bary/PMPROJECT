// Workspace State Management with Zustand
import { create } from 'zustand';
import supabase, { isSupabaseConfigured } from '../utils/supabase';
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
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - workspace features disabled');
      set({ isInitialized: true });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Fetch user's workspaces
      const { data: workspaces, error: workspacesError } = await supabase
        .from('workspaces')
        .select(`
          *,
          workspace_members!inner (
            user_id,
            role
          )
        `)
        .order('created_at', { ascending: true });

      if (workspacesError) throw workspacesError;

      // Get stored workspace ID from localStorage
      const storedWorkspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY);

      // Determine which workspace to set as current
      let currentWorkspace = null;
      let currentWorkspaceId = null;

      if (workspaces && workspaces.length > 0) {
        // Try to use stored workspace if it exists and user has access
        if (storedWorkspaceId) {
          currentWorkspace = workspaces.find(w => w.id === storedWorkspaceId);
        }

        // Fall back to first workspace if stored one not found
        if (!currentWorkspace) {
          currentWorkspace = workspaces[0];
        }

        currentWorkspaceId = currentWorkspace.id;
        localStorage.setItem(WORKSPACE_STORAGE_KEY, currentWorkspaceId);
      }

      set({
        workspaces: workspaces || [],
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
    if (!isSupabaseConfigured()) return;

    set({ isLoading: true, error: null });

    try {
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({
        workspaces: workspaces || [],
        isLoading: false,
      });

      return { success: true, workspaces };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      toast.error('Failed to fetch workspaces');
      return { success: false, error: error.message };
    }
  },

  // Create a new workspace
  createWorkspace: async (name) => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase not configured');
      return { success: false, error: 'Supabase not configured' };
    }

    set({ isLoading: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({ name, owner_id: user.id })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      // Update local state
      set((state) => ({
        workspaces: [...state.workspaces, workspace],
        isLoading: false,
      }));

      toast.success(`Workspace "${name}" created`);
      return { success: true, workspace };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      toast.error(error.message || 'Failed to create workspace');
      return { success: false, error: error.message };
    }
  },

  // Update workspace
  updateWorkspace: async (workspaceId, data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };

    try {
      const { data: workspace, error } = await supabase
        .from('workspaces')
        .update(data)
        .eq('id', workspaceId)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        workspaces: state.workspaces.map(w =>
          w.id === workspaceId ? { ...w, ...workspace } : w
        ),
        currentWorkspace: state.currentWorkspaceId === workspaceId
          ? { ...state.currentWorkspace, ...workspace }
          : state.currentWorkspace,
      }));

      toast.success('Workspace updated');
      return { success: true, workspace };
    } catch (error) {
      toast.error(error.message || 'Failed to update workspace');
      return { success: false, error: error.message };
    }
  },

  // Delete workspace
  deleteWorkspace: async (workspaceId) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };

    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) throw error;

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
      toast.error(error.message || 'Failed to delete workspace');
      return { success: false, error: error.message };
    }
  },

  // Fetch workspace members
  fetchMembers: async (workspaceId) => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data: members, error } = await supabase
        .from('workspace_members')
        .select(`
          *,
          user:user_id (
            id,
            email
          )
        `)
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      set({ members: members || [] });
      return { success: true, members };
    } catch (error) {
      console.error('Failed to fetch members:', error);
      return { success: false, error: error.message };
    }
  },

  // Invite user to workspace
  inviteUser: async (email, role = 'member') => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };

    const { currentWorkspaceId } = get();
    if (!currentWorkspaceId) {
      return { success: false, error: 'No workspace selected' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: invitation, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: currentWorkspaceId,
          email,
          role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        invitations: [...state.invitations, invitation],
      }));

      toast.success(`Invitation sent to ${email}`);
      return { success: true, invitation };
    } catch (error) {
      toast.error(error.message || 'Failed to send invitation');
      return { success: false, error: error.message };
    }
  },

  // Accept invitation (via RPC function)
  acceptInvitation: async (token) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };

    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        invitation_token: token,
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error);
        return { success: false, error: data.error };
      }

      // Refresh workspaces to include the new one
      await get().fetchWorkspaces();

      toast.success('Successfully joined workspace');
      return { success: true, workspaceId: data.workspace_id };
    } catch (error) {
      toast.error(error.message || 'Failed to accept invitation');
      return { success: false, error: error.message };
    }
  },

  // Fetch invitations for current workspace
  fetchInvitations: async () => {
    if (!isSupabaseConfigured()) return;

    const { currentWorkspaceId } = get();
    if (!currentWorkspaceId) return;

    try {
      const { data: invitations, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', currentWorkspaceId)
        .is('accepted_at', null);

      if (error) throw error;

      set({ invitations: invitations || [] });
      return { success: true, invitations };
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove member from workspace
  removeMember: async (memberId) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      set((state) => ({
        members: state.members.filter(m => m.id !== memberId),
      }));

      toast.success('Member removed');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Failed to remove member');
      return { success: false, error: error.message };
    }
  },

  // Update member role
  updateMemberRole: async (memberId, role) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };

    try {
      const { data: member, error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        members: state.members.map(m =>
          m.id === memberId ? { ...m, role } : m
        ),
      }));

      toast.success('Member role updated');
      return { success: true, member };
    } catch (error) {
      toast.error(error.message || 'Failed to update member role');
      return { success: false, error: error.message };
    }
  },

  // Cancel/delete invitation
  cancelInvitation: async (invitationId) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase not configured' };

    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      set((state) => ({
        invitations: state.invitations.filter(i => i.id !== invitationId),
      }));

      toast.success('Invitation cancelled');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Failed to cancel invitation');
      return { success: false, error: error.message };
    }
  },

  // Get user's role in current workspace
  getCurrentUserRole: () => {
    // This would need the current user's ID to filter
    // For now, return from workspace_members join
    return null;
  },

  // Check if user is admin of current workspace
  isCurrentUserAdmin: (userId) => {
    const { currentWorkspace, members } = get();
    if (!currentWorkspace || !userId) return false;

    // Find the current user in members and check their role
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
