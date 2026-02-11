import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { PageLoader } from '../components/Loader';
import useAuthStore from '../store/authStore';
import { Button } from 'components/ui/button';
import { Card, CardContent } from 'components/ui/card';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading, success, error
  const { isAuthenticated, fetchCurrentUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const verify = async () => {
      try {
        await authAPI.verifyEmail(token);
        setStatus('success');
      } catch {
        setStatus('error');
      }
    };

    verify();
  }, [token]);

  // After successful verification, refresh auth state and redirect if logged in
  useEffect(() => {
    if (status === 'success' && isAuthenticated) {
      fetchCurrentUser().then(() => {
        navigate('/dashboard', { replace: true });
      });
    }
  }, [status, isAuthenticated, fetchCurrentUser, navigate]);

  if (status === 'loading') {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-sm">
          <CardContent className="pt-6 text-center">
            {status === 'success' ? (
              <>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Email Verified!</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Your email has been successfully verified. You can now access all features.
                </p>
                {isAuthenticated ? (
                  <p className="text-muted-foreground text-sm">Redirecting to dashboard...</p>
                ) : (
                  <Button asChild>
                    <Link to="/login">Go to Login</Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Verification Failed</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  This verification link is invalid or has expired. Please request a new one.
                </p>
                <Button asChild>
                  <Link to="/login">Go to Login</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VerifyEmail;
