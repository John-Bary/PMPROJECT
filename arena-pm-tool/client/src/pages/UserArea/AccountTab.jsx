import { useState } from 'react';
import { Lock, Download, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { meAPI } from '../../utils/api';
import useAuthStore from '../../store/authStore';
import useWorkspaceStore from '../../store/workspaceStore';
import { toast } from 'sonner';

const AccountTab = () => {
  const { logout } = useAuthStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);

  // Change password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // --- Change Password ---
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validatePasswordForm = () => {
    const errors = {};
    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setIsChangingPassword(true);
    try {
      await meAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password.';
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // --- CSV Export ---
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const response = await meAPI.exportTasksCsv({
        workspace_id: activeWorkspace?.id,
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todoria-tasks-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Tasks exported successfully.');
    } catch (error) {
      toast.error('Failed to export tasks.');
    } finally {
      setIsExporting(false);
    }
  };

  // --- Delete Account ---
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm.');
      return;
    }

    setIsDeleting(true);
    try {
      await meAPI.deleteAccount({ password: deletePassword });
      toast.success('Account deleted.');
      logout();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete account.';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900">Account</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your password, export data, or delete your account.
        </p>
      </div>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-white border border-[#E8EBF0] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-neutral-500" />
          <h3 className="text-lg font-medium text-neutral-900">Change Password</h3>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-neutral-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              className={`w-full px-4 py-2.5 bg-white border rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-colors ${
                passwordErrors.currentPassword ? 'border-red-500' : 'border-[#E8EBF0]'
              }`}
              placeholder="Enter current password"
            />
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-400">{passwordErrors.currentPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              className={`w-full px-4 py-2.5 bg-white border rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-colors ${
                passwordErrors.newPassword ? 'border-red-500' : 'border-[#E8EBF0]'
              }`}
              placeholder="At least 8 characters"
            />
            {passwordErrors.newPassword && (
              <p className="mt-1 text-sm text-red-400">{passwordErrors.newPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              className={`w-full px-4 py-2.5 bg-white border rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-colors ${
                passwordErrors.confirmPassword ? 'border-red-500' : 'border-[#E8EBF0]'
              }`}
              placeholder="Confirm new password"
            />
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">{passwordErrors.confirmPassword}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isChangingPassword}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChangingPassword ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Changing...</span>
              </>
            ) : (
              <span>Change Password</span>
            )}
          </button>
        </div>
      </form>

      {/* Export Data */}
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-neutral-500" />
          <h3 className="text-lg font-medium text-neutral-900">Export Data</h3>
        </div>

        <p className="text-sm text-neutral-600 mb-4">
          Download all your tasks as a CSV file. This includes task titles, descriptions, statuses, priorities, due dates, and categories.
        </p>

        <button
          onClick={handleExportCsv}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E8EBF0] text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export Tasks as CSV</span>
            </>
          )}
        </button>
      </div>

      {/* Delete Account */}
      <div className="bg-white border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="h-5 w-5 text-red-400" />
          <h3 className="text-lg font-medium text-red-400">Delete Account</h3>
        </div>

        <p className="text-sm text-neutral-600 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete My Account</span>
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-600">Are you absolutely sure?</p>
                <p className="text-sm text-neutral-600 mt-1">
                  This will permanently delete your account, all tasks, workspaces, and data. Enter your password to confirm.
                </p>
              </div>
            </div>

            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full max-w-md px-4 py-2.5 bg-white border border-red-200 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
              placeholder="Enter your password to confirm"
            />

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || !deletePassword}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete My Account</span>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                }}
                className="px-4 py-2.5 bg-white border border-[#E8EBF0] text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountTab;
