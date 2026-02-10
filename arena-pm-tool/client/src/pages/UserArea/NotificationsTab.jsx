import { useState, useEffect } from 'react';
import { Mail, Bell, Loader2 } from 'lucide-react';
import { Button } from 'components/ui/button';
import { Card, CardContent } from 'components/ui/card';
import { Switch } from 'components/ui/switch';
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

  const handleToggle = (checked) => {
    setFormData((prev) => ({
      ...prev,
      emailNotificationsEnabled: checked,
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
        <Card>
          <CardContent className="p-6">
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

                  <Switch
                    checked={formData.emailNotificationsEnabled}
                    onCheckedChange={handleToggle}
                    aria-label="Enable email notifications"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Digest Mode Selection */}
        <Card
          className={`transition-opacity ${
            formData.emailNotificationsEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'
          }`}
        >
          <CardContent className="p-6">
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
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-neutral-50">
          <CardContent className="p-4">
            <p className="text-sm text-neutral-500">
              Email reminders are sent for tasks due within the next 2 days. The reminder schedule runs daily at 9:00 AM.
            </p>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!hasChanges || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Saving...' : 'Save Notification Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NotificationsTab;
