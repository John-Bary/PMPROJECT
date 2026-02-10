import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { authAPI } from '../utils/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from 'components/ui/button';
import { Card, CardContent } from 'components/ui/card';

function VerifyEmailPending() {
  const { user, logout, fetchCurrentUser } = useAuthStore();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authAPI.resendVerification();
      toast.success('Verification email sent! Check your inbox.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsChecking(true);
    try {
      await fetchCurrentUser();
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.emailVerified) {
        toast.success('Email verified! Redirecting...');
        navigate('/dashboard', { replace: true });
      } else {
        toast.error('Email not yet verified. Please check your inbox.');
      }
    } catch {
      toast.error('Failed to check verification status.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-neutral-900 mb-2">Check your email</h1>
              <p className="text-neutral-600 text-sm mb-2">
                We sent a verification link to:
              </p>
              <p className="text-neutral-900 font-medium mb-6">{user?.email}</p>

              <p className="text-neutral-500 text-sm mb-6">
                Click the link in your email to verify your account. If you don't see it, check your spam folder.
              </p>

              <div className="space-y-3">
                <Button className="w-full" onClick={handleCheckVerification} disabled={isChecking}>
                  {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isChecking ? 'Checking...' : "I've Verified My Email"}
                </Button>

                <Button variant="secondary" className="w-full" onClick={handleResend} disabled={isResending}>
                  {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </Button>
              </div>

              <button
                onClick={handleLogout}
                className="mt-4 text-sm text-neutral-500 hover:text-neutral-700 transition"
              >
                Sign out and use a different account
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VerifyEmailPending;
