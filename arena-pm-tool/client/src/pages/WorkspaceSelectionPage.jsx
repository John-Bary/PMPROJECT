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

// Role configuration for badges
const roleConfig = {
  admin: { label: 'Admin', icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  member: { label: 'Member', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
};

// Role badge component
const RoleBadge = ({ role }) => {
  const config = roleConfig[role] || roleConfig.member;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.color} ${config.border} border`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
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

  const getWorkspaceColor = (id) => {
    const colors = [
      'from-indigo-500 to-purple-600',
      'from-teal-500 to-emerald-600',
      'from-orange-500 to-red-600',
      'from-blue-500 to-cyan-600',
      'from-pink-500 to-rose-600',
      'from-violet-500 to-fuchsia-600',
    ];
    const index = id?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  return (
    <div
      className={`relative group bg-white rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-lg ${
        isSelected
          ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
          : 'border-neutral-200 hover:border-neutral-300'
      }`}
      onClick={() => onSelect(workspace.id)}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center shadow-md">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="p-5">
        {/* Header with avatar and menu */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getWorkspaceColor(workspace.id)} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
            {getInitials(workspace.name)}
          </div>

          {/* Actions menu */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg shadow-xl border border-neutral-200 py-1 animate-fade-in">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onEdit(workspace);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
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
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
        <h3 className="text-lg font-semibold text-neutral-900 mb-2 truncate">
          {workspace.name}
        </h3>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-sm text-neutral-500 mb-4">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {workspace.memberCount || 1} {workspace.memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* Role badge */}
        <div className="flex items-center justify-between">
          <RoleBadge role={workspace.userRole} />
          {isOwner && (
            <span className="text-xs text-neutral-400 font-medium">Owner</span>
          )}
        </div>
      </div>

      {/* Quick select button on hover */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-2 bg-gradient-to-t from-white via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(workspace.id);
          }}
          className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>Open Workspace</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Delete confirmation modal
function DeleteConfirmModal({ workspace, isOpen, onClose, onConfirm, isDeleting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md animate-scale-in">
          <div className="p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 text-center mb-2">
              Delete Workspace
            </h3>
            <p className="text-sm text-neutral-600 text-center mb-6">
              Are you sure you want to delete <strong>"{workspace?.name}"</strong>? This action cannot be undone and will remove all tasks, categories, and member data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md animate-scale-in">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900">Rename Workspace</h3>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workspace name"
              disabled={isLoading}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim() || name.trim() === workspace?.name}
                className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Saving...' : 'Save'}
              </button>
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
      <div className="min-h-screen bg-neutral-50">
        {/* Simple header */}
        <header className="bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-neutral-900">Todoria</h1>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </header>

        {/* Empty state */}
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-10 h-10 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-3">
            Welcome to Todoria, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-neutral-600 mb-8 max-w-md mx-auto">
            Get started by creating your first workspace. Workspaces help you organize projects and collaborate with your team.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-teal-600/25"
          >
            <Plus className="w-5 h-5" />
            Create Your First Workspace
          </button>

          <div className="mt-12 grid sm:grid-cols-3 gap-6 text-left">
            <div className="bg-white rounded-xl p-5 border border-neutral-200">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <LayoutGrid className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Organize Tasks</h3>
              <p className="text-sm text-neutral-500">Create categories and manage tasks with drag & drop.</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-neutral-200">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Collaborate</h3>
              <p className="text-sm text-neutral-500">Invite team members and assign tasks together.</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-neutral-200">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Track Progress</h3>
              <p className="text-sm text-neutral-500">Use calendar and list views to stay on schedule.</p>
            </div>
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
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-neutral-900">Todoria</h1>
              <span className="hidden sm:inline-block px-2.5 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full">
                {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/user')}
                className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Select a Workspace</h2>
          <p className="text-neutral-600">Choose a workspace to continue or create a new one.</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Create button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Workspace</span>
            </button>
          </div>
        </div>

        {/* Workspace grid/list */}
        {filteredWorkspaces.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">No workspaces found matching "{searchQuery}"</p>
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
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {filteredWorkspaces.map((workspace, index) => (
              <div
                key={workspace.id}
                onClick={() => handleSelectWorkspace(workspace.id)}
                className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-neutral-50 transition-colors ${
                  index !== filteredWorkspaces.length - 1 ? 'border-b border-neutral-100' : ''
                } ${workspace.id === currentWorkspaceId ? 'bg-teal-50/50' : ''}`}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold`}>
                  {workspace.name?.charAt(0)?.toUpperCase() || 'W'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-neutral-900 truncate">{workspace.name}</h3>
                  <p className="text-sm text-neutral-500">
                    {workspace.memberCount || 1} member{workspace.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <RoleBadge role={workspace.userRole} />
                {workspace.id === currentWorkspaceId && (
                  <span className="text-xs text-teal-600 font-medium">Current</span>
                )}
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              </div>
            ))}
          </div>
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
