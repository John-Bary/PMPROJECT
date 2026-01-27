// Workspace Context - Provides workspace state to all components
import { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import useWorkspaceStore from '../store/workspaceStore';
import useAuthStore from '../store/authStore';
import useTaskStore from '../store/taskStore';
import useCategoryStore from '../store/categoryStore';
import Loader from '../components/Loader';

// Create the context
const WorkspaceContext = createContext(null);

// Provider component
export function WorkspaceProvider({ children }) {
  const {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    members,
    invitations,
    isLoading,
    isInitialized,
    error,
    initialize,
    switchWorkspace,
    getCurrentWorkspace,
    getCurrentWorkspaceId,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    fetchMembers,
    inviteUser,
    acceptInvitation,
    fetchInvitations,
    removeMember,
    updateMemberRole,
    cancelInvitation,
    isCurrentUserAdmin,
    clear,
  } = useWorkspaceStore();

  const { isAuthenticated } = useAuthStore();

  // Get store actions for clearing/refetching data
  const { clearTasks, fetchTasks } = useTaskStore();
  const { clearCategories, fetchCategories } = useCategoryStore();

  // Track previous workspace ID to detect changes
  const prevWorkspaceIdRef = useRef(currentWorkspaceId);

  // Initialize workspaces when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      initialize();
    }
  }, [isAuthenticated, isInitialized, initialize]);

  // Clear workspace state when user logs out
  useEffect(() => {
    if (!isAuthenticated && isInitialized) {
      clear();
      clearTasks();
      clearCategories();
    }
  }, [isAuthenticated, isInitialized, clear, clearTasks, clearCategories]);

  // Refetch data when workspace changes
  useEffect(() => {
    if (currentWorkspaceId && currentWorkspaceId !== prevWorkspaceIdRef.current) {
      // Clear and refetch data for new workspace
      clearTasks();
      clearCategories();
      fetchTasks();
      fetchCategories();
    }
    prevWorkspaceIdRef.current = currentWorkspaceId;
  }, [currentWorkspaceId, clearTasks, clearCategories, fetchTasks, fetchCategories]);

  // Memoized switch workspace function that also triggers data refresh
  const handleSwitchWorkspace = useCallback(async (workspaceId) => {
    const result = await switchWorkspace(workspaceId);
    return result;
  }, [switchWorkspace]);

  // Context value
  const value = {
    // State
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    members,
    invitations,
    isLoading,
    isInitialized,
    error,

    // Core functions
    switchWorkspace: handleSwitchWorkspace,
    getCurrentWorkspace,
    getCurrentWorkspaceId,

    // Workspace CRUD
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,

    // Members
    fetchMembers,
    removeMember,
    updateMemberRole,

    // Invitations
    inviteUser,
    acceptInvitation,
    fetchInvitations,
    cancelInvitation,

    // Helpers
    isCurrentUserAdmin,

    // Utility
    clear,
  };

  // Show loader while initializing (only for authenticated users)
  if (isAuthenticated && !isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader size="lg" text="Loading workspaces..." />
      </div>
    );
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// Custom hook to use workspace context
export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }

  return context;
}

// Hook to get current workspace ID for filtering queries
export function useCurrentWorkspaceId() {
  const context = useContext(WorkspaceContext);
  return context?.currentWorkspaceId || null;
}

export default WorkspaceContext;
