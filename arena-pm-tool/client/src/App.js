import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import VerifyEmailPending from './pages/VerifyEmailPending';
import Dashboard from './pages/Dashboard';
import AcceptInvite from './pages/AcceptInvite';
import InviteLanding from './pages/InviteLanding';
import ErrorPage from './pages/ErrorPage';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import { PageLoader } from './components/Loader';

// Lazy load less-frequently visited pages
const WorkspaceSelectionPage = lazy(() => import('./pages/WorkspaceSelectionPage'));
const UserArea = lazy(() => import('./pages/UserArea/UserArea'));
const WorkspaceOnboarding = lazy(() => import('./pages/WorkspaceOnboarding'));
const Billing = lazy(() => import('./pages/Billing'));

function App() {
  const toastOptions = {
    duration: 3200,
    style: {
      background: '#0f172a',
      color: '#e2e8f0',
      border: '1px solid #1f2937',
      boxShadow: '0 14px 44px rgba(0, 0, 0, 0.4)',
      padding: '12px 14px',
    },
    success: {
      duration: 3000,
      iconTheme: {
        primary: '#22c55e',
        secondary: '#0f172a',
      },
      style: {
        borderColor: '#16a34a',
      },
    },
    error: {
      duration: 4200,
      iconTheme: {
        primary: '#ef4444',
        secondary: '#0f172a',
      },
      style: {
        borderColor: '#b91c1c',
      },
    },
  };

  return (
    <Router>
      <Toaster
        position="top-right"
        gutter={12}
        toastOptions={toastOptions}
      />

      <ErrorBoundary>
        <WorkspaceProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route
                path="/verify-email-pending"
                element={
                  <ProtectedRoute skipEmailCheck>
                    <VerifyEmailPending />
                  </ProtectedRoute>
                }
              />

              {/* Invite Landing Page (public - shows invite details and auth choices) */}
              <Route path="/invite/:token" element={<InviteLanding />} />

              {/* Invitation Accept Route (handles its own auth) */}
              <Route path="/accept-invite" element={<AcceptInvite />} />

              {/* Onboarding Route */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <WorkspaceOnboarding />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/workspaces"
                element={
                  <ProtectedRoute>
                    <WorkspaceSelectionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Billing Route */}
              <Route
                path="/billing"
                element={
                  <ProtectedRoute>
                    <Billing />
                  </ProtectedRoute>
                }
              />

              {/* User Area Routes */}
              <Route
                path="/user/*"
                element={
                  <ProtectedRoute>
                    <UserArea />
                  </ProtectedRoute>
                }
              />

              {/* Landing Page (public) */}
              <Route path="/" element={<LandingPage />} />

              {/* Error Routes */}
              <Route path="/error" element={<ErrorPage statusCode={500} />} />
              <Route path="*" element={<ErrorPage statusCode={404} />} />
            </Routes>
          </Suspense>
        </WorkspaceProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
