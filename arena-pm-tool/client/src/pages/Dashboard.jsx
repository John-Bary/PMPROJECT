import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutGrid, Calendar, List, Menu, X, Settings, Users, CreditCard, LogOut, PanelLeftClose, PanelLeft, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches;
  });
  const [showMobileAddTask, setShowMobileAddTask] = useState(false);

  // Auto-collapse sidebar on tablet resize (768-1024px)
  useEffect(() => {
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1024px)');
    const handleTabletChange = (e) => {
      if (e.matches) setIsSidebarCollapsed(true);
    };
    tabletQuery.addEventListener('change', handleTabletChange);
    return () => tabletQuery.removeEventListener('change', handleTabletChange);
  }, []);

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

  const sidebarContent = (mobile = false) => (
    <>
      {/* Logo */}
      <div className={`flex items-center ${isSidebarCollapsed && !mobile ? 'justify-center px-0' : 'px-4'} h-14 shrink-0`}>
        {isSidebarCollapsed && !mobile ? (
          <span className="w-2 h-2 rounded-full bg-primary-600 inline-block" />
        ) : (
          <span className="text-lg font-bold tracking-tight text-[#0F172A] flex items-center gap-1.5">
            Todoria
            <span className="w-2 h-2 rounded-full bg-primary-600 inline-block" />
          </span>
        )}
        {mobile && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="ml-auto p-1.5 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8F9FC] rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Workspace Switcher */}
      {(!isSidebarCollapsed || mobile) && (
        <div className="px-3 mb-2">
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Views Section */}
      <div className={`${isSidebarCollapsed && !mobile ? 'px-1' : 'px-3'}`}>
        {(!isSidebarCollapsed || mobile) && (
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#94A3B8] mt-6 mb-2 px-3">
            Views
          </p>
        )}
        {isSidebarCollapsed && !mobile && <div className="mt-6 mb-2" />}
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                title={isSidebarCollapsed && !mobile ? item.label : undefined}
                className={`flex items-center ${isSidebarCollapsed && !mobile ? 'justify-center' : 'gap-3 px-3'} h-9 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-medium border-l-[3px] border-primary-600'
                    : 'text-[#64748B] hover:bg-[#F8F9FC] border-l-[3px] border-transparent'
                }`}
              >
                <item.icon size={18} />
                {(!isSidebarCollapsed || mobile) && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className={`mt-auto ${isSidebarCollapsed && !mobile ? 'px-1' : 'px-3'} pb-3`}>
        <div className="flex flex-col gap-0.5 mb-3">
          <Link
            to="/user"
            onClick={mobile ? () => setIsMobileMenuOpen(false) : undefined}
            title={isSidebarCollapsed && !mobile ? 'Settings' : undefined}
            className={`flex items-center ${isSidebarCollapsed && !mobile ? 'justify-center' : 'gap-3 px-3'} h-9 rounded-lg text-sm text-[#64748B] hover:bg-[#F8F9FC] transition-all duration-150`}
          >
            <Settings size={18} />
            {(!isSidebarCollapsed || mobile) && <span>Settings</span>}
          </Link>
          <Link
            to="/user/team"
            onClick={mobile ? () => setIsMobileMenuOpen(false) : undefined}
            title={isSidebarCollapsed && !mobile ? 'Team' : undefined}
            className={`flex items-center ${isSidebarCollapsed && !mobile ? 'justify-center' : 'gap-3 px-3'} h-9 rounded-lg text-sm text-[#64748B] hover:bg-[#F8F9FC] transition-all duration-150`}
          >
            <Users size={18} />
            {(!isSidebarCollapsed || mobile) && <span>Team</span>}
          </Link>
          <Link
            to="/billing"
            onClick={mobile ? () => setIsMobileMenuOpen(false) : undefined}
            title={isSidebarCollapsed && !mobile ? 'Billing' : undefined}
            className={`flex items-center ${isSidebarCollapsed && !mobile ? 'justify-center' : 'gap-3 px-3'} h-9 rounded-lg text-sm text-[#64748B] hover:bg-[#F8F9FC] transition-all duration-150`}
          >
            <CreditCard size={18} />
            {(!isSidebarCollapsed || mobile) && <span>Billing</span>}
          </Link>
        </div>

        {/* User row */}
        <div className={`flex items-center ${isSidebarCollapsed && !mobile ? 'justify-center' : 'gap-3 px-3'} h-10`}>
          <div
            className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium shrink-0"
            title={user?.name || 'User'}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          {(!isSidebarCollapsed || mobile) && (
            <>
              <span className="text-sm text-[#0F172A] font-medium truncate flex-1">
                {user?.name}
              </span>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8F9FC] rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Logout"
                title="Logout"
              >
                {isLoggingOut ? <ButtonSpinner /> : <LogOut size={18} />}
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        {!mobile && (
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} h-9 w-full rounded-lg text-sm text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F8F9FC] transition-all duration-150 mt-1`}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            {!isSidebarCollapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#F8F9FC]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col ${isSidebarCollapsed ? 'w-16' : 'w-16 lg:w-[260px]'} bg-white border-r border-[#E8EBF0] transition-all duration-200 shrink-0`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Sidebar */}
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-[260px] h-full bg-white flex flex-col shadow-xl"
            >
              {sidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden h-14 bg-white border-b border-[#E8EBF0] flex items-center px-4 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 -ml-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8F9FC] rounded-lg transition-all duration-150"
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          <span className="text-lg font-bold tracking-tight text-[#0F172A] ml-2 flex items-center gap-1.5">
            Todoria
            <span className="w-2 h-2 rounded-full bg-primary-600 inline-block" />
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setShowMobileAddTask(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors mr-2"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
          <div
            className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium shrink-0"
            title={user?.name || 'User'}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {activeView === 'board' ? (
                  <TaskList mobileAddTask={showMobileAddTask} onMobileAddTaskClose={() => setShowMobileAddTask(false)} />
                ) : activeView === 'list' ? (
                  <ListView mobileAddTask={showMobileAddTask} onMobileAddTaskClose={() => setShowMobileAddTask(false)} />
                ) : (
                  <CalendarView mobileAddTask={showMobileAddTask} onMobileAddTaskClose={() => setShowMobileAddTask(false)} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
