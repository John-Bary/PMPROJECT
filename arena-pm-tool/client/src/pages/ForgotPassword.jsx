import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from 'components/ui/card';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setEmailSent(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-neutral-900 mb-2">Check your email</h2>
                <p className="text-neutral-600 text-sm mb-6">
                  If an account exists for <strong>{email}</strong>, we sent a password reset link. Check your inbox and spam folder.
                </p>
                <Button asChild variant="link">
                  <Link to="/login">
                    Back to Sign In
                  </Link>
                </Button>
              </div>
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
            <CardDescription>Reset your password</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-600 text-sm mb-6">
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="mb-2">
                  Email Address
                </Label>
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="enter your email address"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-600">
              Remember your password?{' '}
              <Link to="/login" className="text-neutral-900 hover:text-neutral-700 font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ForgotPassword;
