import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { User, Settings, Bell, CheckSquare, ArrowLeft, Menu, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import ProfileTab from './ProfileTab';
import PreferencesTab from './PreferencesTab';
import NotificationsTab from './NotificationsTab';
import MyTasksTab from './MyTasksTab';

const UserArea = () => {
  const { user, fetchProfile } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Fetch full profile on mount to ensure we have all user data
    fetchProfile();
  }, [fetchProfile]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: '/user/profile', label: 'Profile', icon: User },
    { path: '/user/preferences', label: 'Preferences', icon: Settings },
    { path: '/user/notifications', label: 'Notifications', icon: Bell },
    { path: '/user/tasks', label: 'My Tasks', icon: CheckSquare },
  ];

  const getInitials = (firstName, lastName, name) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const apiBaseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Back to Dashboard */}
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </NavLink>

            {/* Title */}
            <h1 className="text-lg font-semibold text-white">Settings</h1>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-neutral-400 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* User info (desktop) */}
            <div className="hidden lg:flex items-center gap-3">
              {user?.avatarUrl ? (
                <img
                  src={`${apiBaseUrl}${user.avatarUrl}`}
                  alt="Avatar"
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-medium">
                  {getInitials(user?.firstName, user?.lastName, user?.name)}
                </div>
              )}
              <span className="text-sm text-neutral-300">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.name}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-neutral-950/80 backdrop-blur-sm">
          <nav className="absolute top-16 left-0 right-0 bg-neutral-900 border-b border-neutral-800 p-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-teal-600/20 text-teal-400'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="sticky top-24 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-teal-600/20 text-teal-400 border border-teal-600/30'
                        : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white border border-transparent'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Routes>
              <Route index element={<Navigate to="/user/profile" replace />} />
              <Route path="profile" element={<ProfileTab />} />
              <Route path="preferences" element={<PreferencesTab />} />
              <Route path="notifications" element={<NotificationsTab />} />
              <Route path="tasks" element={<MyTasksTab />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default UserArea;
