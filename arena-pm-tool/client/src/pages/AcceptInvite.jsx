import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, UserPlus, ArrowRight, Users, Mail } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { workspacesAPI } from '../utils/api';
import useAuthStore from '../store/authStore';

function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { isAuthenticated } = useAuthStore();
  const { acceptInvitation } = useWorkspace();

  const [status, setStatus] = useState('loading'); // loading, landing, accepting, success, error, no-token
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [inviteInfo, setInviteInfo] = useState(null);

  const returnUrl = `/accept-invite?token=${token}`;
  const encodedReturnUrl = encodeURIComponent(returnUrl);

  // Fetch invitation info for unauthenticated users
  const fetchInviteInfo = useCallback(async () => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    try {
      const response = await workspacesAPI.getInviteInfo(token);
      setInviteInfo(response.data.data);
      setStatus('landing');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.includes('expired') || msg.includes('Invalid')) {
        setErrorMessage('This invitation link is invalid or has expired. Please ask the workspace admin to send a new invitation.');
      } else {
        setErrorMessage('Could not load invitation details.');
      }
      setStatus('error');
    }
  }, [token]);

  // Process invitation for authenticated users
  const processInvitation = useCallback(async () => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    setStatus('accepting');

    try {
      const result = await acceptInvitation(token);

      if (result.success) {
        // Redirect to onboarding if needed
        if (result.needsOnboarding && result.workspaceId) {
          navigate(`/onboarding?workspaceId=${result.workspaceId}`, { replace: true });
          return;
        }

        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(getErrorMessage(result.error));
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(getErrorMessage(err.message));
    }
  }, [token, acceptInvitation, navigate]);

  // Route: unauthenticated → show landing, authenticated → process invitation
  useEffect(() => {
    if (isAuthenticated) {
      processInvitation();
    } else {
      fetchInviteInfo();
    }
  }, [isAuthenticated, processInvitation, fetchInviteInfo]);

  // Countdown and redirect on success (fallback if onboarding is skipped)
  useEffect(() => {
    if (status !== 'success') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, navigate]);

  // Map error messages to user-friendly text
  const getErrorMessage = (error) => {
    if (!error) return 'An unexpected error occurred';

    const errorStr = error.toLowerCase();

    if (errorStr.includes('expired')) {
      return 'This invitation has expired. Please ask the workspace admin to send a new invitation.';
    }
    if (errorStr.includes('already') || errorStr.includes('member')) {
      return 'You are already a member of this workspace.';
    }
    if (errorStr.includes('not found') || errorStr.includes('invalid')) {
      return 'This invitation link is invalid or has already been used.';
    }
    if (errorStr.includes('email') || errorStr.includes('mismatch')) {
      return 'This invitation was sent to a different email address.';
    }

    return error;
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Loading State */}
        {status === 'loading' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Loading Invitation
              </h2>
              <p className="text-neutral-400">
                Please wait...
              </p>
            </div>
          </div>
        )}

        {/* Landing State - Unauthenticated user sees invitation details */}
        {status === 'landing' && inviteInfo && (
          <div className="animate-fade-in">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="text-center py-4">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/10 flex items-center justify-center">
                    <Users className="h-10 w-10 text-teal-400" />
                  </div>
                </div>

                {/* Invitation message */}
                <h2 className="text-2xl font-bold text-white mb-2">
                  You&apos;re Invited!
                </h2>

                {inviteInfo.inviterName ? (
                  <p className="text-neutral-400 mb-1">
                    <span className="text-white font-medium">{inviteInfo.inviterName}</span> has invited you to join
                  </p>
                ) : (
                  <p className="text-neutral-400 mb-1">
                    You&apos;ve been invited to join
                  </p>
                )}

                <p className="text-xl font-semibold text-teal-400 mb-6">
                  {inviteInfo.workspaceName}
                </p>

                {/* Role badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800 border border-neutral-700 mb-8">
                  <span className="text-xs text-neutral-400">Role:</span>
                  <span className="text-xs font-medium text-white capitalize">{inviteInfo.role}</span>
                </div>

                {/* Invited email notice */}
                {inviteInfo.email && (
                  <div className="flex items-center gap-2 justify-center text-sm text-neutral-500 mb-8">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Sent to {inviteInfo.email}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-3">
                  <Link
                    to={`/register?returnUrl=${encodedReturnUrl}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors text-base"
                  >
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    to={`/login?returnUrl=${encodedReturnUrl}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors border border-neutral-700"
                  >
                    I Already Have an Account
                  </Link>
                </div>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-neutral-600 mt-6">
              By joining, you agree to collaborate within this workspace.
            </p>
          </div>
        )}

        {/* Accepting State */}
        {status === 'accepting' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Joining Workspace
              </h2>
              <p className="text-neutral-400">
                Please wait while we add you to the workspace...
              </p>
            </div>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Welcome to the Team!
              </h2>
              <p className="text-neutral-400 mb-6">
                You&apos;ve successfully joined the workspace.
              </p>

              <div className="bg-neutral-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-neutral-300">
                  Redirecting to dashboard in{' '}
                  <span className="font-semibold text-teal-400">{countdown}</span>{' '}
                  seconds...
                </p>
              </div>

              <button
                onClick={() => navigate('/dashboard', { replace: true })}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Invitation Failed
              </h2>
              <p className="text-neutral-400 mb-6">
                {errorMessage}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* No Token State */}
        {status === 'no-token' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <UserPlus className="h-8 w-8 text-amber-500" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Invalid Invitation Link
              </h2>
              <p className="text-neutral-400 mb-6">
                No invitation token was provided. Please check the link you received or ask the workspace admin to send a new invitation.
              </p>

              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AcceptInvite;
