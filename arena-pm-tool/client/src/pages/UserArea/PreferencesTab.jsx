import { useState, useEffect } from 'react';
import { Globe, Clock, Loader2 } from 'lucide-react';
import { Button } from 'components/ui/button';
import { Card, CardContent } from 'components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'components/ui/select';
import useAuthStore from '../../store/authStore';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
];

const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Moscow', label: 'Moscow Time' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
  { value: 'Asia/Singapore', label: 'Singapore Time' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
  { value: 'Asia/Shanghai', label: 'China Standard Time' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time' },
];

const PreferencesTab = () => {
  const { user, isLoading, updatePreferences } = useAuthStore();

  const [formData, setFormData] = useState({
    language: 'en',
    timezone: 'UTC',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [detectedTimezone, setDetectedTimezone] = useState('');

  // Detect browser timezone on mount
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDetectedTimezone(tz);
    } catch (e) {
      console.error('Could not detect timezone:', e);
    }
  }, []);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        language: user.language || 'en',
        timezone: user.timezone || 'UTC',
      });
    }
  }, [user]);

  // Check for changes
  useEffect(() => {
    if (user) {
      const changed =
        formData.language !== (user.language || 'en') ||
        formData.timezone !== (user.timezone || 'UTC');
      setHasChanges(changed);
    }
  }, [formData, user]);

  const handleLanguageChange = (value) => {
    setFormData((prev) => ({ ...prev, language: value }));
  };

  const handleTimezoneChange = (value) => {
    setFormData((prev) => ({ ...prev, timezone: value }));
  };

  const handleUseDetectedTimezone = () => {
    if (detectedTimezone) {
      setFormData((prev) => ({ ...prev, timezone: detectedTimezone }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updatePreferences(formData);
  };

  // Build the full list of timezone options, including detected if not already present
  const timezoneOptions = [...COMMON_TIMEZONES];
  if (detectedTimezone && !COMMON_TIMEZONES.find((tz) => tz.value === detectedTimezone)) {
    timezoneOptions.push({ value: detectedTimezone, label: `${detectedTimezone} (Detected)` });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900">Preferences</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Customize your language and timezone settings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Language Setting */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-neutral-50 rounded-lg">
                <Globe className="h-6 w-6 text-neutral-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-neutral-900">Language</h3>
                <p className="mt-1 text-sm text-neutral-500 mb-4">
                  Select your preferred language for the interface.
                </p>

                <Select value={formData.language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timezone Setting */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-neutral-50 rounded-lg">
                <Clock className="h-6 w-6 text-neutral-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-neutral-900">Timezone</h3>
                <p className="mt-1 text-sm text-neutral-500 mb-4">
                  Set your timezone for due dates and reminders.
                </p>

                <div className="space-y-3">
                  <Select value={formData.timezone} onValueChange={handleTimezoneChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezoneOptions.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {detectedTimezone && detectedTimezone !== formData.timezone && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-sm text-neutral-600 hover:text-neutral-900"
                      onClick={handleUseDetectedTimezone}
                    >
                      Use detected timezone: {detectedTimezone}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!hasChanges || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PreferencesTab;
