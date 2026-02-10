import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react';
import { Button } from 'components/ui/button';

function ErrorPage({ statusCode, title, message, onRetry }) {
  const navigate = useNavigate();
  const location = useLocation();

  const resolvedStatus = statusCode || location.state?.statusCode || 404;
  const isNotFound = resolvedStatus === 404;

  const heading = title || (isNotFound ? 'Page not found' : 'Something went wrong');
  const description =
    message ||
    location.state?.message ||
    (isNotFound
      ? 'We could not find the page you were looking for.'
      : 'The page failed to load. Please try again or return home.');

  const handleHome = () => navigate('/dashboard');
  const handleRetry = () => {
    if (typeof onRetry === 'function') {
      onRetry();
    } else {
      navigate(0);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white shadow-sm rounded-xl border border-neutral-200 p-8 text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
          <AlertTriangle size={28} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-red-600 tracking-wide">
            {isNotFound ? 'Error 404' : `Error ${resolvedStatus || 500}`}
          </p>
          <h1 className="text-xl font-semibold text-neutral-900">{heading}</h1>
          <p className="text-neutral-600 leading-relaxed">{description}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleHome}>
            <Home size={18} />
            Go to dashboard
          </Button>
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCcw size={18} />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;
