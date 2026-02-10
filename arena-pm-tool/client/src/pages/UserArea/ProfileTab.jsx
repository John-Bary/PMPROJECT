import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
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
        <h2 className="text-2xl font-semibold text-neutral-900">Profile</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your personal information.
        </p>
      </div>

      {/* Avatar Section - hidden for MVP */}

      {/* Name Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={errors.firstName ? 'border-red-500' : ''}
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-400">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={errors.lastName ? 'border-red-500' : ''}
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-400">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="mt-6 space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                type="email"
                id="email"
                value={user?.email || ''}
                disabled
              />
              <p className="text-sm text-neutral-400">
                Email cannot be changed.
              </p>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex justify-end">
              <Button
                type="submit"
                disabled={!hasChanges || isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileTab;
