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
  Loader2
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import InviteMemberModal from './InviteMemberModal';
import { formatDistanceToNow } from 'date-fns';
import { Button } from 'components/ui/button';
import { Badge } from 'components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Avatar, AvatarFallback } from 'components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from 'components/ui/alert-dialog';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', icon: ShieldCheck },
  { value: 'member', label: 'Member', icon: Shield },
  { value: 'viewer', label: 'Viewer', icon: Eye },
];

const getRoleInfo = (role) => {
  return ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[1];
};

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
    <div className="flex items-center justify-between py-3 px-4 hover:bg-muted rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-primary-foreground font-medium">
            {member.user?.email?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {member.user?.email || 'Unknown User'}
            </span>
            {isCurrentUser && (
              <Badge variant="secondary" className="text-xs">
                You
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <RoleIcon className="h-3.5 w-3.5" />
            <span className="capitalize">{member.role}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isAdmin && !isCurrentUser && (
        <div className="flex items-center gap-2">
          {/* Role Dropdown */}
          <Select
            value={member.role}
            onValueChange={handleRoleChange}
            disabled={isChangingRole}
          >
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(member)}
            className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
            title="Remove member"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
    <div className={`flex items-center justify-between py-3 px-4 rounded-lg ${isExpired ? 'bg-accent' : 'hover:bg-muted'} transition-colors`}>
      <div className="flex items-center gap-3">
        {/* Email Icon */}
        <Avatar className="h-10 w-10">
          <AvatarFallback className={isExpired ? 'bg-input text-muted-foreground' : 'bg-amber-100 text-amber-600'}>
            <Mail className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isExpired ? 'text-muted-foreground' : 'text-foreground'}`}>
              {invitation.email}
            </span>
            {isExpired && (
              <Badge variant="secondary" className="text-xs text-muted-foreground">
                Expired
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{roleInfo.label}</span>
            <span className="text-neutral-300">&#8226;</span>
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCancel(invitation)}
          className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
          title="Cancel invitation"
        >
          <X className="h-4 w-4" />
        </Button>
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
          <h2 className="text-2xl font-semibold text-foreground">Team Members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentWorkspace?.name ? `Manage members of "${currentWorkspace.name}"` : 'Manage your team members and invitations'}
          </p>
        </div>

        {/* Invite Button (Admin Only) */}
        {isAdmin && (
          <Button onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Members Section */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">
              Members ({members.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No members found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
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
        </CardContent>
      </Card>

      {/* Pending Invitations Section */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            </div>
          ) : pendingInvitations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pending invitations</p>
              {isAdmin && (
                <p className="mt-1 text-sm">
                  Click "Invite Member" to send new invitations
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
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
        </CardContent>
      </Card>

      {/* Role Permissions Info (for non-admins) */}
      {!isAdmin && (
        <Card className="bg-muted">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground">Role Permissions</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Only workspace admins can invite members, change roles, or remove team members.
                  Contact an admin if you need to make changes to the team.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* Confirmation AlertDialog */}
      <AlertDialog open={confirmModal.isOpen} onOpenChange={(open) => { if (!open) closeConfirmModal(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmModal.type === 'remove-member'
                ? 'Remove Team Member'
                : 'Cancel Invitation'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmModal.type === 'remove-member'
                ? `Are you sure you want to remove ${confirmModal.data?.user?.email || 'this member'} from the workspace? They will lose access to all workspace content.`
                : `Are you sure you want to cancel the invitation to ${confirmModal.data?.email}? They will no longer be able to join this workspace.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isActionLoading}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmModal.type === 'remove-member'
                ? 'Remove Member'
                : 'Cancel Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TeamSettings;
