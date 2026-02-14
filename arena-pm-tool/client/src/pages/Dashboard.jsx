import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutGrid, Calendar, List, Menu, Settings, Users, CreditCard, LogOut, PanelLeftClose, PanelLeft, Plus, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import WorkspaceSwitcher from '../components/WorkspaceSwitcher';
import { Button } from 'components/ui/button';
import { Sheet, SheetContent, SheetTitle } from 'components/ui/sheet';
import { Avatar, AvatarFallback } from 'components/ui/avatar';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

// Lazy load view components for better performance
const TaskList = lazy(() => import('../components/TaskList'));
const CalendarView = lazy(() => import('./CalendarView'));
const ListView = lazy(() => import('./ListView'));

// Lightweight loader for view transitions
const ViewLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

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
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
        ) : (
          <span className="text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
            Todoria
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          </span>
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
                className={`flex items-center ${isSidebarCollapsed && !mobile ? 'justify-center' : 'gap-3 px-3'} h-11 sm:h-9 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-accent text-primary font-medium border-l-[3px] border-primary'
                    : 'text-muted-foreground hover:bg-background border-l-[3px] border-transparent'
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
            className={`flex items-center ${isSidebarCollapsed && !mobile ? 'justify-center' : 'gap-3 px-3'} h-11 sm:h-9 rounded-lg text-sm text-muted-foreground hover:bg-background transition-all duration-150`}
          >
            <Settings size={18} />
            {(!isSidebarCollapsed || mobile) && <span>Settings</span>}
          </Link>
          <Link
            to="/user/team"
            onClick={mobile ? () => setIsMobileMenuOpen(false) : undefined}
            title={isSidebarCollapsed && !mobile ? 'Team' : undefined}
            className={`flex items-center ${isSidebarCollapsed && !mobile ? 'justify-center' : 'gap-3 px-3'} h-11 sm:h-9 rounded-lg text-sm text-muted-foreground hover:bg-background transition-all duration-150`}
          >
            <Users size={18} />
            {(!isSidebarCollapsed || mobile) && <span>Team</span>}
          </Link>
          <Link
            to="/billing"
            onClick={mobile ? () => setIsMobileMenuOpen(false) : undefined}
            title={isSidebarCollapsed && !mobile ? 'Billing' : undefined}
            className={`flex items-center ${isSidebarCollapsed && !mobile ? 'justify-center' : 'gap-3 px-3'} h-11 sm:h-9 rounded-lg text-sm text-muted-foreground hover:bg-background transition-all duration-150`}
          >
            <CreditCard size={18} />
            {(!isSidebarCollapsed || mobile) && <span>Billing</span>}
          </Link>
        </div>

        {/* User row */}
        <div className={`flex items-center ${isSidebarCollapsed && !mobile ? 'justify-center' : 'gap-3 px-3'} h-10`}>
          <Avatar className="w-8 h-8" title={user?.name || 'User'}>
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          {(!isSidebarCollapsed || mobile) && (
            <>
              <span className="text-sm text-foreground font-medium truncate flex-1">
                {user?.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Logout"
                title="Logout"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {isLoggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
              </Button>
            </>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        {!mobile && (
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} h-11 sm:h-9 w-full rounded-lg text-sm text-muted-foreground hover:text-muted-foreground hover:bg-background transition-all duration-150 mt-1`}
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
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col ${isSidebarCollapsed ? 'w-16' : 'w-[260px]'} bg-card border-r border-border transition-all duration-200 shrink-0`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile sidebar - Sheet component */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-[260px] p-0 md:hidden flex flex-col">
          <VisuallyHidden.Root>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden.Root>
          {sidebarContent(true)}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden min-h-14 pt-safe-top bg-card border-b border-border flex items-center px-5 pl-safe-left pr-safe-right shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="-ml-2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </Button>
          <span className="text-lg font-bold tracking-tight text-foreground ml-2 flex items-center gap-1.5">
            Todoria
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          </span>
          <div className="flex-1" />
          <Button
            onClick={() => setShowMobileAddTask(true)}
            size="icon"
            className="mr-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm h-9 w-9"
            aria-label="Add task"
          >
            <Plus size={18} />
          </Button>
          <Avatar className="w-8 h-8" title={user?.name || 'User'}>
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-5 md:px-6 lg:px-8 py-3 sm:py-6 lg:py-8 pb-safe-bottom pl-safe-left pr-safe-right">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Suspense fallback={<ViewLoader />}>
                  {activeView === 'board' ? (
                    <TaskList mobileAddTask={showMobileAddTask} onMobileAddTaskClose={() => setShowMobileAddTask(false)} />
                  ) : activeView === 'list' ? (
                    <ListView mobileAddTask={showMobileAddTask} onMobileAddTaskClose={() => setShowMobileAddTask(false)} />
                  ) : (
                    <CalendarView mobileAddTask={showMobileAddTask} onMobileAddTaskClose={() => setShowMobileAddTask(false)} />
                  )}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
