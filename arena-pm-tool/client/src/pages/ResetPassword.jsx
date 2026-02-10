import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from 'components/ui/card';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      toast.error('Password must include uppercase, lowercase, and a digit.');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.resetPassword(token, formData.password);
      setIsSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-sm">
            <CardContent className="pt-6 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">Invalid Reset Link</h2>
              <p className="text-neutral-600 text-sm mb-6">
                This password reset link is invalid or missing a token. Please request a new one.
              </p>
              <Button asChild>
                <Link to="/forgot-password">Request New Link</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-sm">
            <CardContent className="pt-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">Password Reset!</h2>
              <p className="text-neutral-600 text-sm mb-6">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <Button onClick={() => navigate('/login')}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Todoria</CardTitle>
            <CardDescription>Choose a new password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="password" className="mb-2">
                  New Password
                </Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoFocus
                  minLength={8}
                  placeholder="Enter new password"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Must be 8+ characters with uppercase, lowercase, and a digit.
                </p>
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
                  required
                  minLength={8}
                  placeholder="Confirm new password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-600">
              <Link to="/login" className="text-neutral-900 hover:text-neutral-700 font-medium">
                Back to Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ResetPassword;
