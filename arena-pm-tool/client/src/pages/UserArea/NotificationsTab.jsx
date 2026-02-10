import { useState, useEffect } from 'react';
import { Mail, Bell, Loader2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const NotificationsTab = () => {
  const { user, isLoading, updateNotifications } = useAuthStore();

  const [formData, setFormData] = useState({
    emailNotificationsEnabled: true,
    emailDigestMode: 'immediate',
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        emailNotificationsEnabled: user.emailNotificationsEnabled ?? true,
        emailDigestMode: user.emailDigestMode || 'immediate',
      });
    }
  }, [user]);

  // Check for changes
  useEffect(() => {
    if (user) {
      const originalEnabled = user.emailNotificationsEnabled ?? true;
      const originalMode = user.emailDigestMode || 'immediate';
      const changed =
        formData.emailNotificationsEnabled !== originalEnabled ||
        formData.emailDigestMode !== originalMode;
      setHasChanges(changed);
    }
  }, [formData, user]);

  const handleToggle = () => {
    setFormData((prev) => ({
      ...prev,
      emailNotificationsEnabled: !prev.emailNotificationsEnabled,
    }));
  };

  const handleDigestModeChange = (mode) => {
    setFormData((prev) => ({
      ...prev,
      emailDigestMode: mode,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateNotifications(formData);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900">Notifications</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Manage how and when you receive email notifications.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Notifications Toggle */}
        <div className="bg-white border border-[#E8EBF0] rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-neutral-50 rounded-lg">
              <Mail className="h-6 w-6 text-neutral-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-neutral-900">Email Notifications</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Receive email reminders about upcoming task due dates.
                  </p>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={handleToggle}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2 ${
                    formData.emailNotificationsEnabled ? 'bg-primary-600' : 'bg-neutral-200'
                  }`}
                  role="switch"
                  aria-checked={formData.emailNotificationsEnabled}
                  aria-label="Enable email notifications"
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.emailNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Digest Mode Selection */}
        <div
          className={`bg-white border border-[#E8EBF0] rounded-xl p-6 transition-opacity ${
            formData.emailNotificationsEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-neutral-50 rounded-lg">
              <Bell className="h-6 w-6 text-neutral-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-neutral-900">Notification Frequency</h3>
              <p className="mt-1 text-sm text-neutral-500 mb-4">
                Choose how often you want to receive task reminder emails.
              </p>

              <div className="space-y-3">
                {/* Immediate Option */}
                <label
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    formData.emailDigestMode === 'immediate'
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-[#E8EBF0] hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="digestMode"
                    value="immediate"
                    checked={formData.emailDigestMode === 'immediate'}
                    onChange={() => handleDigestModeChange('immediate')}
                    className="mt-1 h-4 w-4 text-primary-600 border-neutral-300 focus:ring-primary-500/20"
                  />
                  <div>
                    <span className="text-neutral-900 font-medium">Immediate</span>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      Receive individual email reminders for each task as it approaches its due date.
                    </p>
                  </div>
                </label>

                {/* Daily Digest Option */}
                <label
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    formData.emailDigestMode === 'daily_digest'
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-[#E8EBF0] hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="digestMode"
                    value="daily_digest"
                    checked={formData.emailDigestMode === 'daily_digest'}
                    onChange={() => handleDigestModeChange('daily_digest')}
                    className="mt-1 h-4 w-4 text-primary-600 border-neutral-300 focus:ring-primary-500/20"
                  />
                  <div>
                    <span className="text-neutral-900 font-medium">Daily Digest</span>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      Receive a single daily email summarizing all your upcoming tasks.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-neutral-50 border border-[#E8EBF0] rounded-xl p-4">
          <p className="text-sm text-neutral-500">
            Email reminders are sent for tasks due within the next 2 days. The reminder schedule runs daily at 9:00 AM.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!hasChanges || isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Notification Settings</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotificationsTab;
