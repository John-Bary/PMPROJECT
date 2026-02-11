// Workspace Selection Page
// Full-page workspace selection and management UI
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Users,
  ChevronRight,
  Clock,
  ShieldCheck,
  Shield,
  Eye,
  Settings,
  LogOut,
  Search,
  LayoutGrid,
  List,
  Trash2,
  Edit2,
  MoreHorizontal,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import useAuthStore from '../store/authStore';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import { Button } from 'components/ui/button';
import { Card, CardContent } from 'components/ui/card';
import { Avatar, AvatarFallback } from 'components/ui/avatar';
import { Input } from 'components/ui/input';
import { Badge } from 'components/ui/badge';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from 'components/ui/alert-dialog';

// Role configuration for badges
const roleConfig = {
  admin: { label: 'Admin', icon: ShieldCheck, color: 'text-foreground', bg: 'bg-accent', border: 'border-input' },
  member: { label: 'Member', icon: Shield, color: 'text-foreground', bg: 'bg-muted', border: 'border-border' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
};

// Role badge component
const RoleBadge = ({ role }) => {
  const config = roleConfig[role] || roleConfig.member;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.bg} ${config.color} ${config.border}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// Workspace card component
function WorkspaceCard({ workspace, isSelected, onSelect, onEdit, onDelete, currentUserId }) {
  const [showMenu, setShowMenu] = useState(false);
  const isOwner = workspace.owner_id === currentUserId;
  const isAdmin = workspace.userRole === 'admin';

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'W';
  };

  return (
    <Card
      className={`relative group cursor-pointer hover:shadow-lg ${
        isSelected
          ? 'border-primary ring-2 ring-ring/20 shadow-md border-2'
          : 'border-border hover:border-input'
      }`}
      onClick={() => onSelect(workspace.id)}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md z-10">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <CardContent className="p-5">
        {/* Header with avatar and menu */}
        <div className="flex items-start justify-between mb-4">
          <Avatar className="w-14 h-14 rounded-xl text-lg">
            <AvatarFallback className="rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              {getInitials(workspace.name)}
            </AvatarFallback>
          </Avatar>

          {/* Actions menu */}
          {isAdmin && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div className="absolute right-0 top-8 z-20 w-40 bg-card rounded-lg shadow-sm border border-border py-1 animate-fade-in">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onEdit(workspace);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Rename
                    </button>
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onDelete(workspace);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Workspace name */}
        <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
          {workspace.name}
        </h3>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {workspace.memberCount || 1} {workspace.memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* Role badge */}
        <div className="flex items-center justify-between">
          <RoleBadge role={workspace.userRole} />
          {isOwner && (
            <span className="text-xs text-muted-foreground font-medium">Owner</span>
          )}
        </div>
      </CardContent>

      {/* Quick select button on hover */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-2 bg-gradient-to-t from-card via-card to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(workspace.id);
          }}
          className="w-full"
        >
          <span>Open Workspace</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

// Delete confirmation modal
function DeleteConfirmModal({ workspace, isOpen, onClose, onConfirm, isDeleting }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">
            Delete Workspace
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Are you sure you want to delete <strong>"{workspace?.name}"</strong>? This action cannot be undone and will remove all tasks, categories, and member data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-3">
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Rename workspace modal
function RenameModal({ workspace, isOpen, onClose, onConfirm, isLoading }) {
  const [name, setName] = useState(workspace?.name || '');

  useEffect(() => {
    if (workspace) setName(workspace.name);
  }, [workspace]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== workspace?.name) {
      onConfirm(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-card rounded-xl shadow-sm w-full max-w-md animate-scale-in">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Rename Workspace</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Workspace Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workspace name"
              disabled={isLoading}
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !name.trim() || name.trim() === workspace?.name}
                className="flex-1"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main WorkspaceSelectionPage component
function WorkspaceSelectionPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    workspaces,
    currentWorkspaceId,
    switchWorkspace,
    updateWorkspace,
    deleteWorkspace,
    isLoading,
  } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Filter workspaces by search
  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle workspace selection
  const handleSelectWorkspace = async (workspaceId) => {
    const result = await switchWorkspace(workspaceId);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  // Handle workspace deletion
  const handleDelete = async () => {
    if (!selectedWorkspace) return;
    setIsDeleting(true);
    const result = await deleteWorkspace(selectedWorkspace.id);
    setIsDeleting(false);
    if (result.success) {
      setIsDeleteModalOpen(false);
      setSelectedWorkspace(null);
    }
  };

  // Handle workspace rename
  const handleRename = async (newName) => {
    if (!selectedWorkspace) return;
    setIsRenaming(true);
    const result = await updateWorkspace(selectedWorkspace.id, { name: newName });
    setIsRenaming(false);
    if (result.success) {
      setIsRenameModalOpen(false);
      setSelectedWorkspace(null);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate('/login');
  };

  // Show empty state if no workspaces
  if (!isLoading && workspaces.length === 0) {
    return (
      <div className="min-h-screen bg-muted">
        {/* Simple header */}
        <header className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-foreground">Todoria</h1>
            <Button
              variant="ghost"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </header>

        {/* Empty state */}
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Welcome to Todoria, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Get started by creating your first workspace. Workspaces help you organize projects and collaborate with your team.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
            <Plus className="w-5 h-5" />
            Create Your First Workspace
          </Button>

          <div className="mt-12 grid sm:grid-cols-3 gap-6 text-left">
            <Card>
              <CardContent className="p-5">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center mb-3">
                  <LayoutGrid className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Organize Tasks</h3>
                <p className="text-sm text-muted-foreground">Create categories and manage tasks with drag & drop.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Collaborate</h3>
                <p className="text-sm text-muted-foreground">Invite team members and assign tasks together.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Track Progress</h3>
                <p className="text-sm text-muted-foreground">Use calendar and list views to stay on schedule.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <CreateWorkspaceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-foreground">Todoria</h1>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/user')}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Select a Workspace</h2>
          <p className="text-muted-foreground">Choose a workspace to continue or create a new one.</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-card border border-input rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                title="Grid view"
                className="h-8 w-8"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                title="List view"
                className="h-8 w-8"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Create button */}
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Workspace</span>
            </Button>
          </div>
        </div>

        {/* Workspace grid/list */}
        {filteredWorkspaces.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No workspaces found matching "{searchQuery}"</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                isSelected={workspace.id === currentWorkspaceId}
                onSelect={handleSelectWorkspace}
                onEdit={(ws) => {
                  setSelectedWorkspace(ws);
                  setIsRenameModalOpen(true);
                }}
                onDelete={(ws) => {
                  setSelectedWorkspace(ws);
                  setIsDeleteModalOpen(true);
                }}
                currentUserId={user?.id}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              {filteredWorkspaces.map((workspace, index) => (
                <div
                  key={workspace.id}
                  onClick={() => handleSelectWorkspace(workspace.id)}
                  className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-muted transition-colors ${
                    index !== filteredWorkspaces.length - 1 ? 'border-b border-border' : ''
                  } ${workspace.id === currentWorkspaceId ? 'bg-accent' : ''}`}
                >
                  <Avatar className="w-12 h-12 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-bold">
                      {workspace.name?.charAt(0)?.toUpperCase() || 'W'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{workspace.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {workspace.memberCount || 1} member{workspace.memberCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <RoleBadge role={workspace.userRole} />
                  {workspace.id === currentWorkspaceId && (
                    <span className="text-xs text-muted-foreground font-medium">Current</span>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <DeleteConfirmModal
        workspace={selectedWorkspace}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedWorkspace(null);
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <RenameModal
        workspace={selectedWorkspace}
        isOpen={isRenameModalOpen}
        onClose={() => {
          setIsRenameModalOpen(false);
          setSelectedWorkspace(null);
        }}
        onConfirm={handleRename}
        isLoading={isRenaming}
      />
    </div>
  );
}

export default WorkspaceSelectionPage;
