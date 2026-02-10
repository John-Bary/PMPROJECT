import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { authAPI } from '../utils/api';
import { ButtonSpinner } from '../components/Loader';
import { toast } from 'sonner';

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
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 sm:p-8">
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
              <button
                onClick={handleCheckVerification}
                disabled={isChecking}
                className="w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
              >
                {isChecking && <ButtonSpinner />}
                {isChecking ? 'Checking...' : "I've Verified My Email"}
              </button>

              <button
                onClick={handleResend}
                disabled={isResending}
                className="w-full bg-neutral-100 text-neutral-700 py-2.5 px-4 rounded-lg hover:bg-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
              >
                {isResending && <ButtonSpinner />}
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="mt-4 text-sm text-neutral-500 hover:text-neutral-700 transition"
            >
              Sign out and use a different account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPending;
