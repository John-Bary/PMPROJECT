import { useState, useEffect } from 'react';
import { X, Mail, Shield, Check, Copy, Link, UserPlus } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ButtonSpinner } from './Loader';
import toast from 'react-hot-toast';

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
    const baseUrl = window.location.origin;
    return `${baseUrl}/invite/${token}`;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      ></div>

      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
          <div className="p-4 sm:p-6">
            {/* Mobile drag handle indicator */}
            <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-4 sm:hidden"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
                {successData ? 'Invitation Sent!' : 'Invite Team Member'}
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all duration-150"
                disabled={isSubmitting}
              >
                <X size={24} />
              </button>
            </div>

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
                    <input
                      type="text"
                      value={successData.inviteLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-600 truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all duration-200 ${
                        copied
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-teal-500 text-white hover:bg-teal-600'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expiration Notice */}
                <p className="text-xs text-neutral-500 text-center">
                  This invitation will expire in 7 days
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 sm:py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200 text-sm sm:text-base active:scale-[0.98]"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={handleInviteAnother}
                    className="flex-1 px-4 py-2.5 sm:py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base active:scale-[0.98]"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Invite Another</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleSubmit}>
                {/* Email */}
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (error) setError('');
                      }}
                      className={`w-full pl-10 pr-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-150 text-base sm:text-sm ${
                        error ? 'border-red-300' : 'border-neutral-200'
                      }`}
                      placeholder="colleague@company.com"
                      required
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-4 w-4" />
                      <span>Role</span>
                    </div>
                  </label>
                  <div className="space-y-2">
                    {ROLE_OPTIONS.map((role) => (
                      <label
                        key={role.value}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-150 ${
                          formData.role === role.value
                            ? 'border-teal-500 bg-teal-50/50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={formData.role === role.value}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="mt-0.5 w-4 h-4 text-teal-600 border-neutral-300 focus:ring-teal-500"
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
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 sm:py-2 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200 text-sm sm:text-base active:scale-[0.98]"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 sm:py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base active:scale-[0.98]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <ButtonSpinner />}
                    {isSubmitting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InviteMemberModal;
