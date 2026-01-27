import { useState, useEffect } from 'react';
import { X, Mail, Shield } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ButtonSpinner } from './Loader';

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member', description: 'Can view and edit tasks' },
  { value: 'viewer', label: 'Viewer', description: 'Can only view content' },
  { value: 'admin', label: 'Admin', description: 'Full access to workspace settings' },
];

function InviteMemberModal({ isOpen, onClose }) {
  const { inviteUser } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'member',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({ email: '', role: 'member' });
      setError('');
    }
  }, [isOpen]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
        onClose();
      } else {
        setError(result.error || 'Failed to send invitation');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ email: '', role: 'member' });
      setError('');
      onClose();
    }
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
                Invite Team Member
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all duration-150"
                disabled={isSubmitting}
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 sm:py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all duration-150 text-base sm:text-sm"
                    placeholder="colleague@company.com"
                    required
                    disabled={isSubmitting}
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
                      }`}
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default InviteMemberModal;
