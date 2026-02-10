// Workspace Switcher Component
// Dropdown to switch between workspaces
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, Settings, Users, Check, ShieldCheck, Shield, Eye, LayoutGrid, Loader2 } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import useWorkspaceStore from '../store/workspaceStore';
import CreateWorkspaceModal from './CreateWorkspaceModal';

// Role badge component
const RoleBadge = ({ role }) => {
  const roleConfig = {
    admin: { label: 'Admin', icon: ShieldCheck, color: 'text-neutral-700', bg: 'bg-neutral-100' },
    member: { label: 'Member', icon: Shield, color: 'text-neutral-600', bg: 'bg-neutral-100' },
    viewer: { label: 'Viewer', icon: Eye, color: 'text-neutral-500', bg: 'bg-neutral-100' },
  };

  const config = roleConfig[role] || roleConfig.member;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${config.bg} ${config.color}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
};

function WorkspaceSwitcher({ className = '' }) {
  const navigate = useNavigate();
  const {
    workspaces,
    currentWorkspace,
    switchWorkspace,
    isLoading,
    currentUser,
  } = useWorkspace();
  const { isSwitching } = useWorkspaceStore();

  // Get user's role in a workspace
  const getUserRole = (workspace) => {
    // First check userRole from the API response
    if (workspace.userRole) return workspace.userRole;
    // Fallback to workspace_members
    if (!workspace.workspace_members || !currentUser) return 'member';
    const membership = workspace.workspace_members.find(m => m.user_id === currentUser.id);
    return membership?.role || 'member';
  };

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = async (workspaceId) => {
    if (workspaceId !== currentWorkspace?.id) {
      await switchWorkspace(workspaceId);
    }
    setIsOpen(false);
  };

  // Don't render if no workspaces
  if (!workspaces || workspaces.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || isSwitching}
        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-neutral-50
                   border border-neutral-200 rounded-lg transition-colors min-w-[180px]
                   disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Switch workspace, current: ${currentWorkspace?.name || 'none'}`}
        aria-expanded={isOpen}
      >
        {isSwitching ? (
          <Loader2 size={16} className="w-6 h-6 animate-spin text-neutral-500" />
        ) : (
          <div className="w-6 h-6 rounded bg-primary-600 flex items-center justify-center text-xs font-medium text-white">
            {currentWorkspace?.name?.charAt(0)?.toUpperCase() || 'W'}
          </div>
        )}
        <span className="flex-1 text-left text-sm text-neutral-800 truncate font-medium">
          {isSwitching ? 'Switching...' : (currentWorkspace?.name || 'Select Workspace')}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-neutral-200
                        rounded-lg shadow-sm z-50 py-1 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-neutral-100">
            <p className="text-xs font-medium text-neutral-500">
              Your Workspaces
            </p>
          </div>

          {/* Workspace List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {workspaces.map((workspace) => {
              const role = getUserRole(workspace);
              return (
                <button
                  key={workspace.id}
                  onClick={() => handleSwitch(workspace.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50
                             transition-colors text-left
                             ${workspace.id === currentWorkspace?.id ? 'bg-neutral-100' : ''}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center
                                 text-sm font-semibold text-white flex-shrink-0">
                    {workspace.name?.charAt(0)?.toUpperCase() || 'W'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900 font-medium truncate">{workspace.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={role} />
                      <span className="text-xs text-neutral-400">
                        {workspace.memberCount || 1} member{(workspace.memberCount || 1) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {workspace.id === currentWorkspace?.id && (
                    <Check className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-100 my-1" />

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/workspaces');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50
                         transition-colors text-left text-neutral-700"
            >
              <LayoutGrid className="w-4 h-4 text-neutral-500" />
              <span className="text-sm">View All Workspaces</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                setIsCreateModalOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50
                         transition-colors text-left text-neutral-700"
            >
              <Plus className="w-4 h-4 text-neutral-500" />
              <span className="text-sm">Create Workspace</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/user/preferences');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50
                         transition-colors text-left text-neutral-700"
            >
              <Settings className="w-4 h-4 text-neutral-500" />
              <span className="text-sm">Workspace Settings</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/user/team');
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50
                         transition-colors text-left text-neutral-700"
            >
              <Users className="w-4 h-4 text-neutral-500" />
              <span className="text-sm">Manage Members</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        redirectToDashboard={false}
      />
    </div>
  );
}

export default WorkspaceSwitcher;
