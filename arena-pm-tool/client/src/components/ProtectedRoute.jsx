import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    const returnUrl = currentPath && currentPath !== '/'
      ? `?returnUrl=${encodeURIComponent(currentPath)}`
      : '';
    return <Navigate to={`/login${returnUrl}`} replace />;
  }

  return children;
}

export default ProtectedRoute;
