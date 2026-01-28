import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutGrid, Calendar, List, Menu, X, Settings, Users } from 'lucide-react';
import useAuthStore from '../store/authStore';
import TaskList from '../components/TaskList';
import CalendarView from './CalendarView';
import ListView from './ListView';
import WorkspaceSwitcher from '../components/WorkspaceSwitcher';
import { ButtonSpinner } from '../components/Loader';

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeView, setActiveView] = useState('board'); // 'board', 'list', or 'calendar'
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate('/login');
    setIsLoggingOut(false);
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'board', label: 'Task Board', icon: LayoutGrid },
    { id: 'list', label: 'List', icon: List },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 -ml-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all duration-150"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Arena PM</h1>
              <p className="text-xs sm:text-sm text-neutral-600 hidden sm:block">Welcome, {user?.name}!</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Workspace Switcher */}
            <div className="hidden md:block">
              <WorkspaceSwitcher />
            </div>
            <Link
              to="/user/team"
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all duration-150"
              aria-label="Team Settings"
              title="Team Settings"
            >
              <Users size={20} />
            </Link>
            <Link
              to="/user"
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all duration-150"
              aria-label="Settings"
              title="Settings"
            >
              <Settings size={20} />
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isLoggingOut}
            >
              {isLoggingOut && <ButtonSpinner />}
              <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              <span className="sm:hidden">{isLoggingOut ? '...' : 'Exit'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Desktop */}
      <div className="bg-white border-b border-neutral-150 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-4 lg:gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeView === item.id
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-150 shadow-md animate-fade-in">
          <nav className="max-w-7xl mx-auto px-4 py-2">
            {/* Mobile Workspace Switcher */}
            <div className="py-2 mb-2 border-b border-neutral-150">
              <WorkspaceSwitcher className="w-full" />
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                className={`flex items-center gap-3 w-full py-3 px-3 rounded-lg font-medium text-sm transition-all duration-150 ${
                  activeView === item.id
                    ? 'bg-teal-50 text-teal-600'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
            <div className="border-t border-neutral-150 mt-2 pt-2">
              <Link
                to="/user/team"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 w-full py-3 px-3 rounded-lg font-medium text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-all duration-150"
              >
                <Users size={20} />
                Team Settings
              </Link>
              <Link
                to="/user"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 w-full py-3 px-3 rounded-lg font-medium text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-all duration-150"
              >
                <Settings size={20} />
                Settings
              </Link>
              <p className="px-3 py-2 text-xs text-neutral-500">Logged in as {user?.name}</p>
            </div>
          </nav>
        </div>
      )}

      {/* Mobile View Indicator */}
      <div className="md:hidden bg-white border-b border-neutral-150 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          {navItems.find(item => item.id === activeView)?.icon && (
            <span className="text-teal-600">
              {(() => {
                const Icon = navItems.find(item => item.id === activeView)?.icon;
                return Icon ? <Icon size={16} /> : null;
              })()}
            </span>
          )}
          <span className="font-medium">{navItems.find(item => item.id === activeView)?.label}</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {activeView === 'board' ? (
          <>
            <div className="mb-4 sm:mb-6 hidden md:block">
              <h2 className="text-xl font-semibold text-neutral-900">Task Board</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Manage your tasks across different categories
              </p>
            </div>
            <TaskList />
          </>
        ) : activeView === 'list' ? (
          <>
            <ListView />
          </>
        ) : (
          <>
            <div className="mb-4 sm:mb-6 hidden md:block">
              <h2 className="text-xl font-semibold text-neutral-900">Calendar View</h2>
              <p className="text-sm text-neutral-500 mt-1">
                View your tasks organized by due date
              </p>
            </div>
            <CalendarView />
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
