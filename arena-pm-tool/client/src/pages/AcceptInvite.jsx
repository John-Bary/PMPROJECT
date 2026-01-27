import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, UserPlus, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import useAuthStore from '../store/authStore';

function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { isAuthenticated } = useAuthStore();
  const { acceptInvitation } = useWorkspace();

  const [status, setStatus] = useState('loading'); // loading, success, error, no-token
  const [errorMessage, setErrorMessage] = useState('');
  const [workspaceId, setWorkspaceId] = useState(null);
  const [countdown, setCountdown] = useState(3);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      const returnUrl = `/accept-invite?token=${token}`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
    }
  }, [isAuthenticated, token, navigate]);

  // Process invitation when component mounts
  useEffect(() => {
    if (!isAuthenticated) return;

    if (!token) {
      setStatus('no-token');
      return;
    }

    const processInvitation = async () => {
      setStatus('loading');

      try {
        const result = await acceptInvitation(token);

        if (result.success) {
          setStatus('success');
          setWorkspaceId(result.workspaceId);
        } else {
          setStatus('error');
          setErrorMessage(getErrorMessage(result.error));
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage(getErrorMessage(err.message));
      }
    };

    processInvitation();
  }, [token, isAuthenticated, acceptInvitation]);

  // Countdown and redirect on success
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

  // Don't render anything while redirecting to login
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Processing Invitation
              </h2>
              <p className="text-neutral-400">
                Please wait while we add you to the workspace...
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
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
                You've successfully joined the workspace.
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
          )}

          {/* Error State */}
          {status === 'error' && (
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
          )}

          {/* No Token State */}
          {status === 'no-token' && (
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
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-neutral-500 mt-6">
          Need help?{' '}
          <a href="mailto:support@arena.com" className="text-teal-500 hover:text-teal-400">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

export default AcceptInvite;
