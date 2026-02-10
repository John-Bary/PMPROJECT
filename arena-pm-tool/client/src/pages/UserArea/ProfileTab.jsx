import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const ProfileTab = () => {
  const { user, isLoading, updateProfile } = useAuthStore();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || user.name?.split(' ')[0] || '',
        lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
      });
    }
  }, [user]);

  // Check for changes
  useEffect(() => {
    if (user) {
      const originalFirstName = user.firstName || user.name?.split(' ')[0] || '';
      const originalLastName = user.lastName || user.name?.split(' ').slice(1).join(' ') || '';
      const changed =
        formData.firstName !== originalFirstName || formData.lastName !== originalLastName;
      setHasChanges(changed);
    }
  }, [formData, user]);

  const validateForm = () => {
    const newErrors = {};
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();

    if (!firstName) {
      newErrors.firstName = 'First name is required';
    } else if (firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    } else if (firstName.length > 60) {
      newErrors.firstName = 'First name must be less than 60 characters';
    }

    if (!lastName) {
      newErrors.lastName = 'Last name is required';
    } else if (lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    } else if (lastName.length > 60) {
      newErrors.lastName = 'Last name must be less than 60 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    await updateProfile({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white">Profile</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Manage your personal information.
        </p>
      </div>

      {/* Avatar Section - hidden for MVP */}

      {/* Name Form */}
      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4">Personal Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-neutral-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 bg-neutral-800 border rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent transition-colors ${
                errors.firstName ? 'border-red-500' : 'border-neutral-700'
              }`}
              placeholder="Enter your first name"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-neutral-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 bg-neutral-800 border rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent transition-colors ${
                errors.lastName ? 'border-red-500' : 'border-neutral-700'
              }`}
              placeholder="Enter your last name"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="mt-6">
          <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-400 cursor-not-allowed"
          />
          <p className="mt-1 text-sm text-neutral-500">
            Email cannot be changed.
          </p>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
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
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileTab;
