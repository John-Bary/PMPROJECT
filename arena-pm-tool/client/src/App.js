import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WorkspaceSelectionPage from './pages/WorkspaceSelectionPage';
import UserArea from './pages/UserArea/UserArea';
import AcceptInvite from './pages/AcceptInvite';
import InviteLanding from './pages/InviteLanding';
import WorkspaceOnboarding from './pages/WorkspaceOnboarding';
import ErrorPage from './pages/ErrorPage';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';

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
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

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
        </WorkspaceProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
