// Workspace Switcher Component
// Dropdown to switch between workspaces
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, Settings, Users, Check, ShieldCheck, Shield, Eye } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import CreateWorkspaceModal from './CreateWorkspaceModal';

// Role badge component
const RoleBadge = ({ role }) => {
  const roleConfig = {
    admin: { label: 'Admin', icon: ShieldCheck, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    member: { label: 'Member', icon: Shield, color: 'text-slate-400', bg: 'bg-slate-400/10' },
    viewer: { label: 'Viewer', icon: Eye, color: 'text-slate-500', bg: 'bg-slate-500/10' },
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

  // Get user's role in a workspace
  const getUserRole = (workspace) => {
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
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700
                   border border-slate-600 rounded-lg transition-colors min-w-[180px]
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-xs font-medium text-white">
          {currentWorkspace?.name?.charAt(0)?.toUpperCase() || 'W'}
        </div>
        <span className="flex-1 text-left text-sm text-slate-200 truncate">
          {currentWorkspace?.name || 'Select Workspace'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-600
                        rounded-lg shadow-xl z-50 py-1 overflow-hidden">
          {/* Workspace List */}
          <div className="max-h-64 overflow-y-auto">
            {workspaces.map((workspace) => {
              const role = getUserRole(workspace);
              return (
                <button
                  key={workspace.id}
                  onClick={() => handleSwitch(workspace.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700
                             transition-colors text-left
                             ${workspace.id === currentWorkspace?.id ? 'bg-slate-700/50' : ''}`}
                >
                  <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center
                                 text-sm font-medium text-white flex-shrink-0">
                    {workspace.name?.charAt(0)?.toUpperCase() || 'W'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{workspace.name}</p>
                    <RoleBadge role={role} />
                  </div>
                  {workspace.id === currentWorkspace?.id && (
                    <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-600 my-1" />

          {/* Actions */}
          <button
            onClick={() => {
              setIsOpen(false);
              setIsCreateModalOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700
                       transition-colors text-left text-slate-300"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Create Workspace</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              navigate('/user/preferences');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700
                       transition-colors text-left text-slate-300"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Workspace Settings</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              navigate('/user/team');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-700
                       transition-colors text-left text-slate-300"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm">Manage Members</span>
          </button>
        </div>
      )}

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

export default WorkspaceSwitcher;
