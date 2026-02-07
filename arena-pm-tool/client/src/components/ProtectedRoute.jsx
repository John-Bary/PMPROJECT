import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function ProtectedRoute({ children, skipEmailCheck = false }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    const returnUrl = currentPath && currentPath !== '/'
      ? `?returnUrl=${encodeURIComponent(currentPath)}`
      : '';
    return <Navigate to={`/login${returnUrl}`} replace />;
  }

  // Redirect unverified users to verification pending page
  if (!skipEmailCheck && user && user.emailVerified === false) {
    return <Navigate to="/verify-email-pending" replace />;
  }

  return children;
}

export default ProtectedRoute;
