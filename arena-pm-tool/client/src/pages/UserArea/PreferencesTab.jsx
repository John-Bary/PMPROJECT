import { useState, useEffect } from 'react';
import { Globe, Clock, Loader2 } from 'lucide-react';
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white">Preferences</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Customize your language and timezone settings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Language Setting */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-neutral-700/20 rounded-lg">
              <Globe className="h-6 w-6 text-neutral-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white">Language</h3>
              <p className="mt-1 text-sm text-neutral-400 mb-4">
                Select your preferred language for the interface.
              </p>

              <select
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full sm:w-64 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent transition-colors appearance-none cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Timezone Setting */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-neutral-700/20 rounded-lg">
              <Clock className="h-6 w-6 text-neutral-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white">Timezone</h3>
              <p className="mt-1 text-sm text-neutral-400 mb-4">
                Set your timezone for due dates and reminders.
              </p>

              <div className="space-y-3">
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent transition-colors appearance-none cursor-pointer"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                  {/* Include detected timezone if not in list */}
                  {detectedTimezone &&
                    !COMMON_TIMEZONES.find((tz) => tz.value === detectedTimezone) && (
                      <option value={detectedTimezone}>
                        {detectedTimezone} (Detected)
                      </option>
                    )}
                </select>

                {detectedTimezone && detectedTimezone !== formData.timezone && (
                  <button
                    type="button"
                    onClick={handleUseDetectedTimezone}
                    className="text-sm text-neutral-300 hover:text-neutral-200 transition-colors"
                  >
                    Use detected timezone: {detectedTimezone}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!hasChanges || isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Preferences</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PreferencesTab;
