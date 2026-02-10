import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Eye,
  Trash2,
  Mail,
  Clock,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import InviteMemberModal from './InviteMemberModal';
import { formatDistanceToNow } from 'date-fns';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', icon: ShieldCheck },
  { value: 'member', label: 'Member', icon: Shield },
  { value: 'viewer', label: 'Viewer', icon: Eye },
];

const getRoleInfo = (role) => {
  return ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[1];
};

// Confirmation Modal Component
function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText, isDestructive = false, isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/20 transition-opacity"
        onClick={onClose}
      ></div>

      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative bg-white rounded-t-xl sm:rounded-xl shadow-md w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
          <div className="p-4 sm:p-6">
            {/* Mobile drag handle indicator */}
            <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-4 sm:hidden"></div>

            {/* Header with icon */}
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-100' : 'bg-amber-100'}`}>
                <AlertTriangle className={`h-6 w-6 ${isDestructive ? 'text-red-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
                <p className="mt-1 text-sm text-neutral-600">{message}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 sm:py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200 text-sm sm:text-base active:scale-[0.98]"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`flex-1 px-4 py-2.5 sm:py-2 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base active:scale-[0.98] ${
                  isDestructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Member Row Component
function MemberRow({ member, isAdmin, isCurrentUser, onRoleChange, onRemove }) {
  const [isChangingRole, setIsChangingRole] = useState(false);
  const roleInfo = getRoleInfo(member.role);
  const RoleIcon = roleInfo.icon;

  const handleRoleChange = async (newRole) => {
    if (newRole === member.role) return;
    setIsChangingRole(true);
    await onRoleChange(member.id, newRole);
    setIsChangingRole(false);
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-neutral-50 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-neutral-600 flex items-center justify-center text-white font-medium">
          {member.user?.email?.[0]?.toUpperCase() || 'U'}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-900">
              {member.user?.email || 'Unknown User'}
            </span>
            {isCurrentUser && (
              <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-900 rounded-full">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-neutral-500">
            <RoleIcon className="h-3.5 w-3.5" />
            <span className="capitalize">{member.role}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isAdmin && !isCurrentUser && (
        <div className="flex items-center gap-2">
          {/* Role Dropdown */}
          <select
            value={member.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={isChangingRole}
            className="text-sm border border-neutral-200 rounded-lg px-3 py-1.5 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 disabled:opacity-50"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          {/* Remove Button */}
          <button
            onClick={() => onRemove(member)}
            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove member"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Invitation Row Component
function InvitationRow({ invitation, isAdmin, onCancel }) {
  const roleInfo = getRoleInfo(invitation.role);
  const isExpired = new Date(invitation.expires_at) < new Date();

  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-lg ${isExpired ? 'bg-neutral-100' : 'hover:bg-neutral-50'} transition-colors`}>
      <div className="flex items-center gap-3">
        {/* Email Icon */}
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isExpired ? 'bg-neutral-200 text-neutral-400' : 'bg-amber-100 text-amber-600'}`}>
          <Mail className="h-5 w-5" />
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isExpired ? 'text-neutral-400' : 'text-neutral-900'}`}>
              {invitation.email}
            </span>
            {isExpired && (
              <span className="text-xs px-2 py-0.5 bg-neutral-200 text-neutral-500 rounded-full">
                Expired
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span className="capitalize">{roleInfo.label}</span>
            <span className="text-neutral-300">•</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {isExpired
                  ? 'Expired'
                  : `Expires ${formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}`
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isAdmin && (
        <button
          onClick={() => onCancel(invitation)}
          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Cancel invitation"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Main TeamSettings Component
function TeamSettings() {
  const {
    members,
    invitations,
    currentUser,
    currentWorkspace,
    isCurrentUserAdmin,
    fetchMembers,
    fetchInvitations,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    currentWorkspaceId
  } = useWorkspace();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, data: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const isAdmin = isCurrentUserAdmin();

  // Fetch members and invitations on mount
  useEffect(() => {
    const loadData = async () => {
      if (currentWorkspaceId) {
        setIsLoading(true);
        await Promise.all([
          fetchMembers(currentWorkspaceId),
          fetchInvitations()
        ]);
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentWorkspaceId, fetchMembers, fetchInvitations]);

  const handleRoleChange = async (memberId, newRole) => {
    await updateMemberRole(memberId, newRole);
  };

  const handleRemoveMember = (member) => {
    setConfirmModal({
      isOpen: true,
      type: 'remove-member',
      data: member
    });
  };

  const handleCancelInvitation = (invitation) => {
    setConfirmModal({
      isOpen: true,
      type: 'cancel-invitation',
      data: invitation
    });
  };

  const handleConfirm = async () => {
    setIsActionLoading(true);

    if (confirmModal.type === 'remove-member') {
      await removeMember(confirmModal.data.id);
    } else if (confirmModal.type === 'cancel-invitation') {
      await cancelInvitation(confirmModal.data.id);
    }

    setIsActionLoading(false);
    setConfirmModal({ isOpen: false, type: null, data: null });
  };

  const closeConfirmModal = () => {
    if (!isActionLoading) {
      setConfirmModal({ isOpen: false, type: null, data: null });
    }
  };

  const pendingInvitations = invitations.filter(inv => !inv.accepted_at);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Team Members</h2>
          <p className="mt-1 text-sm text-neutral-400">
            {currentWorkspace?.name ? `Manage members of "${currentWorkspace.name}"` : 'Manage your team members and invitations'}
          </p>
        </div>

        {/* Invite Button (Admin Only) */}
        {isAdmin && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Members Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2">
          <Users className="h-5 w-5 text-neutral-400" />
          <h3 className="font-medium text-white">
            Members ({members.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-neutral-500 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No members found</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800 bg-white">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isAdmin={isAdmin}
                isCurrentUser={member.user_id === currentUser?.id}
                onRoleChange={handleRoleChange}
                onRemove={handleRemoveMember}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2">
          <Mail className="h-5 w-5 text-neutral-400" />
          <h3 className="font-medium text-white">
            Pending Invitations ({pendingInvitations.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-neutral-500 animate-spin" />
          </div>
        ) : pendingInvitations.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No pending invitations</p>
            {isAdmin && (
              <p className="mt-1 text-sm">
                Click "Invite Member" to send new invitations
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-800 bg-white">
            {pendingInvitations.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                isAdmin={isAdmin}
                onCancel={handleCancelInvitation}
              />
            ))}
          </div>
        )}
      </div>

      {/* Role Permissions Info (for non-admins) */}
      {!isAdmin && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-neutral-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-neutral-300">Role Permissions</h4>
              <p className="mt-1 text-sm text-neutral-500">
                Only workspace admins can invite members, change roles, or remove team members.
                Contact an admin if you need to make changes to the team.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={handleConfirm}
        isLoading={isActionLoading}
        isDestructive={true}
        title={
          confirmModal.type === 'remove-member'
            ? 'Remove Team Member'
            : 'Cancel Invitation'
        }
        message={
          confirmModal.type === 'remove-member'
            ? `Are you sure you want to remove ${confirmModal.data?.user?.email || 'this member'} from the workspace? They will lose access to all workspace content.`
            : `Are you sure you want to cancel the invitation to ${confirmModal.data?.email}? They will no longer be able to join this workspace.`
        }
        confirmText={
          confirmModal.type === 'remove-member'
            ? 'Remove Member'
            : 'Cancel Invitation'
        }
      />
    </div>
  );
}

export default TeamSettings;
