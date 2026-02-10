import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutGrid, Calendar, List, Menu, X, Settings, Users, CreditCard, LogOut } from 'lucide-react';
import useAuthStore from '../store/authStore';
import TaskList from '../components/TaskList';
import CalendarView from './CalendarView';
import ListView from './ListView';
import WorkspaceSwitcher from '../components/WorkspaceSwitcher';
import PlanBadge from '../components/PlanBadge';
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
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 -ml-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all duration-150"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-lg font-semibold text-neutral-900">Todoria</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Workspace Switcher */}
            <div className="hidden md:block">
              <WorkspaceSwitcher />
            </div>
            <Link to="/billing" className="hidden sm:block" title="Billing & Plans">
              <PlanBadge plan="free" />
            </Link>
            <Link
              to="/billing"
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all duration-150 sm:hidden"
              aria-label="Billing & Plans"
              title="Billing & Plans"
            >
              <CreditCard size={20} />
            </Link>
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
              className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isLoggingOut}
              aria-label="Logout"
              title="Logout"
            >
              {isLoggingOut ? <ButtonSpinner /> : <LogOut size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Desktop */}
      <div className="bg-white border-b border-neutral-200 hidden md:block">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-4 lg:gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeView === item.id
                    ? 'border-neutral-900 text-neutral-900'
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
        <div className="md:hidden bg-white border-b border-neutral-200 shadow-sm animate-fade-in">
          <nav className="max-w-6xl mx-auto px-4 py-2">
            {/* Mobile Workspace Switcher */}
            <div className="py-2 mb-2 border-b border-neutral-200">
              <WorkspaceSwitcher className="w-full" />
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                className={`flex items-center gap-3 w-full py-3 px-3 rounded-lg font-medium text-sm transition-all duration-150 ${
                  activeView === item.id
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
            <div className="border-t border-neutral-200 mt-2 pt-2">
              <Link
                to="/billing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 w-full py-3 px-3 rounded-lg font-medium text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-all duration-150"
              >
                <CreditCard size={20} />
                Billing & Plans
                <PlanBadge plan="free" size="sm" />
              </Link>
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {activeView === 'board' ? (
          <TaskList />
        ) : activeView === 'list' ? (
          <ListView />
        ) : (
          <CalendarView />
        )}
      </main>
    </div>
  );
}

export default Dashboard;
