import { useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { User, Settings, Bell, CheckSquare, ArrowLeft, Users, Shield, Activity } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import ProfileTab from './ProfileTab';
import PreferencesTab from './PreferencesTab';
import NotificationsTab from './NotificationsTab';
import MyTasksTab from './MyTasksTab';
import AccountTab from './AccountTab';
import ActivityTab from './ActivityTab';
import TeamSettings from '../../components/TeamSettings';

const UserArea = () => {
  const { user, fetchProfile } = useAuthStore();
  useEffect(() => {
    // Fetch full profile on mount to ensure we have all user data
    fetchProfile();
  }, [fetchProfile]);

  const navItems = [
    { path: '/user/profile', label: 'Profile', icon: User },
    { path: '/user/preferences', label: 'Preferences', icon: Settings },
    { path: '/user/notifications', label: 'Notifications', icon: Bell },
    { path: '/user/tasks', label: 'My Tasks', icon: CheckSquare },
    { path: '/user/team', label: 'Team', icon: Users },
    { path: '/user/activity', label: 'Activity', icon: Activity },
    { path: '/user/account', label: 'Billing & Account', icon: Shield },
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
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#E8EBF0] bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Back to Dashboard */}
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </NavLink>

            {/* Title */}
            <h1 className="text-lg font-semibold text-neutral-900">Settings</h1>

            {/* Spacer for mobile */}
            <div className="lg:hidden w-9" />

            {/* User info (desktop) */}
            <div className="hidden lg:flex items-center gap-3">
              {user?.avatarUrl ? (
                <img
                  src={`${apiBaseUrl}${user.avatarUrl}`}
                  alt="Avatar"
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                  {getInitials(user?.firstName, user?.lastName, user?.name)}
                </div>
              )}
              <span className="text-sm text-neutral-700">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.name}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Horizontal Tab Bar */}
      <div className="lg:hidden sticky top-16 z-30 bg-white border-b border-[#E8EBF0]">
        <div className="flex overflow-x-auto scrollbar-hide px-4 gap-1 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

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
                        ? 'bg-primary-50 text-primary-600 border border-primary-200'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 border border-transparent'
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
              <Route path="team" element={<TeamSettings />} />
              <Route path="activity" element={<ActivityTab />} />
              <Route path="account" element={<AccountTab />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default UserArea;
