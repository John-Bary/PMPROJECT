import { lazy, Suspense, useEffect } from 'react';
import analytics from './utils/analytics';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
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
import CookieConsent from './components/CookieConsent';
import { PageLoader } from './components/Loader';

// Lazy load less-frequently visited pages
const WorkspaceSelectionPage = lazy(() => import('./pages/WorkspaceSelectionPage'));
const UserArea = lazy(() => import('./pages/UserArea/UserArea'));
const WorkspaceOnboarding = lazy(() => import('./pages/WorkspaceOnboarding'));
const Billing = lazy(() => import('./pages/Billing'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const DPA = lazy(() => import('./pages/DPA'));

function App() {
  useEffect(() => {
    analytics.init();
  }, []);

  return (
    <Router>
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          classNames: {
            toast: 'font-sans rounded-xl shadow-elevated',
          },
        }}
      />

      <ErrorBoundary>
        <WorkspaceProvider>
          <CookieConsent />
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

              {/* Admin Dashboard */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
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

              {/* Legal Pages (public) */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/dpa" element={<DPA />} />

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
