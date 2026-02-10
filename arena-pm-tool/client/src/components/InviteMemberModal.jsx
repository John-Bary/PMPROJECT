import { useState, useEffect } from 'react';
import { Mail, Shield, Check, Copy, Link, UserPlus, Loader2 } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from 'components/ui/dialog';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member', description: 'Can view and edit tasks' },
  { value: 'viewer', label: 'Viewer', description: 'Can only view content' },
  { value: 'admin', label: 'Admin', description: 'Full access to workspace settings' },
];

// Map common Supabase errors to user-friendly messages
const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred';

  const errorStr = error.toLowerCase();

  if (errorStr.includes('duplicate') || errorStr.includes('unique') || errorStr.includes('already exists')) {
    return 'An invitation has already been sent to this email address';
  }
  if (errorStr.includes('invalid email') || errorStr.includes('email format')) {
    return 'Please enter a valid email address';
  }
  if (errorStr.includes('permission') || errorStr.includes('authorized')) {
    return 'You do not have permission to invite members';
  }
  if (errorStr.includes('workspace')) {
    return 'Please select a workspace first';
  }

  return error;
};

function InviteMemberModal({ isOpen, onClose }) {
  const { inviteUser, currentWorkspace } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'member',
  });
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({ email: '', role: 'member' });
      setError('');
      setSuccessData(null);
      setCopied(false);
    }
  }, [isOpen]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const generateInviteLink = (token) => {
    return `${window.location.origin}/invite/${token}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const email = formData.email.trim().toLowerCase();

    if (!email) {
      setError('Email address is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await inviteUser(email, formData.role);

      if (result.success) {
        setSuccessData({
          email,
          role: formData.role,
          invitation: result.invitation,
          inviteLink: generateInviteLink(result.invitation.token),
        });
      } else {
        setError(getErrorMessage(result.error));
      }
    } catch (err) {
      setError(getErrorMessage(err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!successData?.inviteLink) return;

    try {
      await navigator.clipboard.writeText(successData.inviteLink);
      setCopied(true);
      toast.success('Invite link copied to clipboard');

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ email: '', role: 'member' });
      setError('');
      setSuccessData(null);
      setCopied(false);
      onClose();
    }
  };

  const handleInviteAnother = () => {
    setFormData({ email: '', role: 'member' });
    setError('');
    setSuccessData(null);
    setCopied(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {successData ? 'Invitation Sent!' : 'Invite Team Member'}
          </DialogTitle>
          <DialogDescription>
            {successData ? 'The invitation has been sent successfully.' : 'Invite a team member to your workspace.'}
          </DialogDescription>
        </DialogHeader>

        {/* Success State */}
        {successData ? (
          <div className="space-y-4">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center">
              <p className="text-neutral-700">
                An invitation has been sent to
              </p>
              <p className="font-semibold text-neutral-900 mt-1">
                {successData.email}
              </p>
              <p className="text-sm text-neutral-500 mt-2">
                They will be added as a <span className="font-medium capitalize">{successData.role}</span> to{' '}
                <span className="font-medium">{currentWorkspace?.name || 'this workspace'}</span>
              </p>
            </div>

            {/* Invite Link Section */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                <Link className="h-4 w-4" />
                <span>Invite Link</span>
              </div>
              <p className="text-xs text-neutral-500 mb-3">
                Share this link with the invitee if they don't receive the email
              </p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={successData.inviteLink}
                  readOnly
                  className="flex-1 text-sm text-neutral-600 truncate"
                />
                <Button
                  onClick={handleCopyLink}
                  variant={copied ? 'outline' : 'default'}
                  className={copied ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100' : ''}
                  size="sm"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Expiration Notice */}
            <p className="text-xs text-neutral-500 text-center">
              This invitation will expire in 7 days
            </p>

            {/* Action Buttons */}
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Done
              </Button>
              <Button
                type="button"
                onClick={handleInviteAnother}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                <span>Invite Another</span>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-4 space-y-2">
              <Label htmlFor="email">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <Input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (error) setError('');
                  }}
                  className={`pl-10 ${error ? 'border-red-300' : ''}`}
                  placeholder="colleague@company.com"
                  required
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="mb-6">
              <Label className="mb-2 block">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  <span>Role</span>
                </div>
              </Label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((role) => (
                  <label
                    key={role.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-150 ${
                      formData.role === role.value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={formData.role === role.value}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="mt-0.5 w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-600"
                      disabled={isSubmitting}
                    />
                    <div>
                      <div className="font-medium text-neutral-900">{role.label}</div>
                      <div className="text-sm text-neutral-500">{role.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Buttons */}
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InviteMemberModal;
