import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Loader2 } from 'lucide-react';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from 'components/ui/card';

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, isLoading } = useAuthStore();

  const inviteToken = searchParams.get('invite');
  const prefillEmail = searchParams.get('email') || '';

  const [formData, setFormData] = useState({
    name: '',
    email: prefillEmail,
    password: '',
    confirmPassword: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: '',
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one digit';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the Terms of Service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const { confirmPassword, ...registerData } = formData;
    const result = await register({ ...registerData, tos_accepted: acceptedTerms });

    if (result.success) {
      // If invite token present, redirect to accept-invite flow
      if (inviteToken) {
        navigate(`/accept-invite?token=${encodeURIComponent(inviteToken)}`, { replace: true });
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            {/* Invite Banner */}
            {inviteToken && (
              <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-3 mb-4 text-center">
                <p className="text-sm text-neutral-700">
                  Create an account to accept your workspace invitation
                </p>
              </div>
            )}
            <CardTitle className="text-xl">Todoria</CardTitle>
            <CardDescription>Create your account</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name" className="mb-2">
                  Full Name
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? 'border-red-500' : ''}
                  placeholder="John Doe"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="mb-2">
                  Email Address
                </Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="your@email.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="mb-2">
                  Password
                </Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? 'border-red-500' : ''}
                  placeholder="Must include uppercase, lowercase, and a digit"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="mb-2">
                  Confirm Password
                </Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                  placeholder="Re-enter your password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Terms of Service */}
              <div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      if (errors.terms) setErrors({ ...errors, terms: '' });
                    }}
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
                  />
                  <span className="text-sm text-neutral-600">
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" className="text-neutral-900 hover:text-neutral-700 underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" target="_blank" className="text-neutral-900 hover:text-neutral-700 underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.terms && <p className="mt-1 text-sm text-red-600">{errors.terms}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            {/* Login Link */}
            <p className="mt-6 text-center text-sm text-neutral-600">
              Already have an account?{' '}
              <Link
                to={inviteToken ? `/login?invite=${encodeURIComponent(inviteToken)}` : '/login'}
                className="text-neutral-900 hover:text-neutral-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Register;
