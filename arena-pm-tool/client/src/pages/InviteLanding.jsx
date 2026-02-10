import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, LogIn, UserPlus, Loader2, XCircle, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { workspacesAPI } from '../utils/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import useAuthStore from '../store/authStore';
import { Button } from 'components/ui/button';
import { Card, CardContent } from 'components/ui/card';
import { Badge } from 'components/ui/badge';

function InviteLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { acceptInvitation } = useWorkspace();

  const [status, setStatus] = useState('loading'); // loading, valid, expired, accepted, invalid, error, joining
  const [inviteData, setInviteData] = useState(null);
  const [joinError, setJoinError] = useState('');
  const fetchedRef = useRef(false);

  // Fetch invite info on mount
  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchInviteInfo = async () => {
      try {
        const response = await workspacesAPI.getInviteInfo(token);
        const data = response.data.data;
        setInviteData(data);
        setStatus(data.inviteStatus);
      } catch (err) {
        const errStatus = err.response?.status;
        if (errStatus === 404) {
          setStatus('invalid');
        } else {
          setStatus('error');
        }
      }
    };

    fetchInviteInfo();
  }, [token]);

  // Handle joining workspace when already logged in
  const handleJoinWorkspace = async () => {
    setStatus('joining');
    try {
      const result = await acceptInvitation(token);
      if (result.success) {
        if (result.needsOnboarding && result.workspaceId) {
          navigate(`/onboarding?workspaceId=${result.workspaceId}`, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setJoinError(result.error || 'Failed to join workspace');
        setStatus('join-error');
      }
    } catch (err) {
      setJoinError(err.message || 'Failed to join workspace');
      setStatus('join-error');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-6 sm:p-8">
            {/* Logo */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold text-neutral-900">Todoria</h1>
            </div>

            {/* Loading State */}
            {status === 'loading' && (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <Loader2 className="h-10 w-10 text-neutral-500 animate-spin" />
                </div>
                <p className="text-neutral-500">Loading invitation details...</p>
              </div>
            )}

            {/* Valid Invitation */}
            {status === 'valid' && inviteData && (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center">
                    <Users className="h-7 w-7 text-neutral-900" />
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                  You've been invited to join
                </h2>
                <p className="text-2xl font-bold text-neutral-900 mb-2">
                  {inviteData.workspaceName}
                </p>
                {inviteData.inviterName && (
                  <p className="text-sm text-neutral-500 mb-6">
                    Invited by {inviteData.inviterName}
                  </p>
                )}

                {inviteData.role && (
                  <div className="mb-6">
                    <Badge variant="secondary" className="capitalize">
                      Role: {inviteData.role}
                    </Badge>
                  </div>
                )}

                {isAuthenticated ? (
                  /* Already logged in — show direct join button */
                  <div>
                    <Button onClick={handleJoinWorkspace} className="w-full">
                      <span>Join {inviteData.workspaceName}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  /* Not logged in — show sign in / sign up choices */
                  <div className="space-y-3">
                    <Button asChild className="w-full">
                      <Link to={`/login?invite=${encodeURIComponent(token)}`}>
                        <LogIn className="h-4 w-4" />
                        <span>I have an account — Sign In</span>
                      </Link>
                    </Button>

                    <Button asChild variant="outline" className="w-full border-2 border-primary-600">
                      <Link to={`/register?invite=${encodeURIComponent(token)}${inviteData.invitedEmail ? `&email=${encodeURIComponent(inviteData.invitedEmail)}` : ''}`}>
                        <UserPlus className="h-4 w-4" />
                        <span>I'm new here — Sign Up</span>
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Joining State */}
            {status === 'joining' && (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <Loader2 className="h-10 w-10 text-neutral-500 animate-spin" />
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-1">
                  Joining workspace...
                </h2>
                <p className="text-neutral-500">Please wait while we add you to the team.</p>
              </div>
            )}

            {/* Join Error State */}
            {status === 'join-error' && (
              <div className="text-center py-6">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-7 w-7 text-red-500" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                  Could not join workspace
                </h2>
                <p className="text-neutral-500 mb-6">{joinError}</p>
                <Button asChild variant="secondary">
                  <Link to="/dashboard">
                    Go to Dashboard
                  </Link>
                </Button>
              </div>
            )}

            {/* Expired Invitation */}
            {status === 'expired' && inviteData && (
              <div className="text-center py-6">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-7 w-7 text-amber-500" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                  Invitation Expired
                </h2>
                <p className="text-neutral-500 mb-1">
                  The invitation to join <span className="font-medium text-neutral-700">{inviteData.workspaceName}</span> has expired.
                </p>
                <p className="text-sm text-neutral-400 mb-6">
                  Ask {inviteData.inviterName || 'your team admin'} to send a new invitation.
                </p>
                <Button asChild variant="secondary">
                  <Link to="/login">
                    Go to Sign In
                  </Link>
                </Button>
              </div>
            )}

            {/* Already Accepted Invitation */}
            {status === 'accepted' && inviteData && (
              <div className="text-center py-6">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-7 w-7 text-green-500" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                  Already Joined
                </h2>
                <p className="text-neutral-500 mb-6">
                  You've already joined <span className="font-medium text-neutral-700">{inviteData.workspaceName}</span>.
                </p>
                <Button asChild>
                  <Link to="/dashboard">
                    <span>Go to Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}

            {/* Invalid Token */}
            {status === 'invalid' && (
              <div className="text-center py-6">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-7 w-7 text-red-500" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                  Invalid Invitation Link
                </h2>
                <p className="text-neutral-500 mb-6">
                  This invite link is invalid or has already been used. Please check the link you received or ask your team admin to send a new invitation.
                </p>
                <Button asChild variant="secondary">
                  <Link to="/login">
                    Go to Sign In
                  </Link>
                </Button>
              </div>
            )}

            {/* Generic Error */}
            {status === 'error' && (
              <div className="text-center py-6">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-7 w-7 text-red-500" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                  Something went wrong
                </h2>
                <p className="text-neutral-500 mb-6">
                  We couldn't load the invitation details. Please try again or contact support.
                </p>
                <Button asChild variant="secondary">
                  <Link to="/login">
                    Go to Sign In
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default InviteLanding;
