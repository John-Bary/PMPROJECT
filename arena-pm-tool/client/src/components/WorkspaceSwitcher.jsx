// Workspace Switcher Component
// Dropdown to switch between workspaces
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, Settings, Users, Check, ShieldCheck, Shield, Eye, LayoutGrid, Loader2 } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import useWorkspaceStore from '../store/workspaceStore';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from 'components/ui/dropdown-menu';
import { Badge } from 'components/ui/badge';

// Role badge component
const RoleBadge = ({ role }) => {
  const roleConfig = {
    admin: { label: 'Admin', icon: ShieldCheck, color: 'text-foreground', bg: 'bg-accent' },
    member: { label: 'Member', icon: Shield, color: 'text-muted-foreground', bg: 'bg-accent' },
    viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground', bg: 'bg-accent' },
  };

  const config = roleConfig[role] || roleConfig.member;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs border-0 rounded ${config.bg} ${config.color}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </Badge>
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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleSwitch = async (workspaceId) => {
    if (workspaceId !== currentWorkspace?.id) {
      await switchWorkspace(workspaceId);
    }
  };

  // Don't render if no workspaces
  if (!workspaces || workspaces.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <DropdownMenu>
        {/* Trigger Button */}
        <DropdownMenuTrigger asChild>
          <button
            disabled={isLoading || isSwitching}
            className="flex items-center gap-2 px-3 py-2 w-full bg-card hover:bg-muted
                       border border-border rounded-lg transition-colors duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none"
            aria-label={`Switch workspace, current: ${currentWorkspace?.name || 'none'}`}
          >
            {isSwitching ? (
              <Loader2 size={16} className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                {currentWorkspace?.name?.charAt(0)?.toUpperCase() || 'W'}
              </div>
            )}
            <span className="flex-1 text-left text-sm text-foreground truncate font-medium">
              {isSwitching ? 'Switching...' : (currentWorkspace?.name || 'Select Workspace')}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        {/* Dropdown Menu */}
        <DropdownMenuContent align="start" className="w-72">
          {/* Header */}
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            Your Workspaces
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Workspace List */}
          <div className="max-h-64 overflow-y-auto">
            {workspaces.map((workspace) => {
              const role = getUserRole(workspace);
              return (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => handleSwitch(workspace.id)}
                  className={`flex items-center gap-3 px-2 py-1.5 cursor-pointer rounded-md transition-colors duration-150 ${
                    workspace.id === currentWorkspace?.id ? 'bg-accent' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center
                                 text-sm font-semibold text-primary-foreground flex-shrink-0">
                    {workspace.name?.charAt(0)?.toUpperCase() || 'W'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">{workspace.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={role} />
                      <span className="text-xs text-muted-foreground">
                        {workspace.memberCount || 1} member{(workspace.memberCount || 1) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {workspace.id === currentWorkspace?.id && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator />

          {/* Actions */}
          <DropdownMenuItem
            onClick={() => navigate('/workspaces')}
            className="flex items-center gap-3 px-2 py-1.5 cursor-pointer text-foreground rounded-md transition-colors duration-150 hover:bg-accent"
          >
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">View all workspaces</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-3 px-2 py-1.5 cursor-pointer text-foreground rounded-md transition-colors duration-150 hover:bg-accent"
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Create workspace</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate('/user/preferences')}
            className="flex items-center gap-3 px-2 py-1.5 cursor-pointer text-foreground rounded-md transition-colors duration-150 hover:bg-accent"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Workspace settings</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate('/user/team')}
            className="flex items-center gap-3 px-2 py-1.5 cursor-pointer text-foreground rounded-md transition-colors duration-150 hover:bg-accent"
          >
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Manage members</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
