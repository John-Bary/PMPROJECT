import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Loader2 } from 'lucide-react';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from 'components/ui/card';

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading } = useAuthStore();

  // Get return URL from query params (for invitation flow, etc.)
  const returnUrl = searchParams.get('returnUrl');
  const inviteToken = searchParams.get('invite');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData);
    if (result.success) {
      // If invite token present, redirect to accept-invite flow
      if (inviteToken) {
        navigate(`/accept-invite?token=${encodeURIComponent(inviteToken)}`, { replace: true });
      } else {
        // Redirect to return URL if provided, otherwise dashboard
        const redirectTo = returnUrl || '/dashboard';
        navigate(redirectTo, { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            {/* Invite Banner */}
            {inviteToken && (
              <div className="bg-accent border border-border rounded-lg p-3 mb-4 text-center">
                <p className="text-sm text-foreground">
                  Sign in to accept your workspace invitation
                </p>
              </div>
            )}
            <CardTitle className="text-xl">Todoria</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  required
                  placeholder="enter your email address"
                />
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
                  required
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-foreground hover:text-foreground font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Register Link */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                to={inviteToken ? `/register?invite=${encodeURIComponent(inviteToken)}` : '/register'}
                className="text-foreground hover:text-foreground font-medium"
              >
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Login;
