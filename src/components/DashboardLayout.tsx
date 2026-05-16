import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, User, Home, FileText, Search, PlusCircle, ClipboardList, Shield, Users, Database, BarChart3, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getNotificationsForUser } from '@/services/storageService';
import { useEffect, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { getDashboardPath } from '@/lib/featureRoutes';
import { ProjectLogo } from '@/components/ProjectLogo';

const roleNavItems = {
  citizen: [
    { label: 'Dashboard', icon: Home, path: '/citizen' },
    { label: 'New Application', icon: PlusCircle, path: '/citizen/new-application' },
    { label: 'My Applications', icon: FileText, path: '/citizen/applications' },
    { label: 'My Properties', icon: MapPin, path: '/citizen/properties' },
    { label: 'Land Search', icon: Search, path: '/citizen/land-search' },
    { label: 'Notifications', icon: Bell, path: '/citizen/notifications' },
    { label: 'Profile', icon: User, path: '/citizen/profile' },
  ],
  land_officer: [
    { label: 'Dashboard', icon: Home, path: '/officer' },
    { label: 'All Applications', icon: FileText, path: '/officer/applications' },
    { label: 'Clarifications', icon: ClipboardList, path: '/officer/clarifications' },
  ],
  survey_officer: [
    { label: 'Dashboard', icon: Home, path: '/survey' },
    { label: 'Assigned Cases', icon: MapPin, path: '/survey/verifications' },
  ],
  admin: [
    { label: 'Dashboard', icon: Home, path: '/admin' },
    { label: 'Review Applications', icon: FileText, path: '/officer/applications' },
    { label: 'Clarifications', icon: ClipboardList, path: '/officer/clarifications' },
    { label: 'Survey Cases', icon: MapPin, path: '/survey/verifications' },
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Land Records', icon: Database, path: '/admin/land-records' },
    { label: 'Audit Log', icon: Shield, path: '/admin/audit-log' },
    { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  ],
};

type NavMode = 'top' | 'side';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navMode, setNavMode] = useState<NavMode>(() => {
    if (typeof window === 'undefined') return 'top';
    return window.localStorage.getItem('digiland-nav-mode') === 'side' ? 'side' : 'top';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem('digiland-nav-mode', navMode);
  }, [navMode]);

  if (!user) return null;
  const navItems = roleNavItems[user.role];
  const homePath = getDashboardPath(user.role);
  const unreadCount = getNotificationsForUser(user.id).filter(n => !n.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const roleLabel = {
    citizen: 'Citizen',
    land_officer: 'Land Officer',
    survey_officer: 'Survey Officer',
    admin: 'Administrator',
  }[user.role];

  const renderNavItem = (
    item: (typeof roleNavItems)[keyof typeof roleNavItems][number],
    mode: NavMode,
  ) => {
    const active = location.pathname === item.path;
    const isNotifications = item.label === 'Notifications';

    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
          mode === 'top'
            ? active
              ? "bg-accent text-accent-foreground shadow-sm"
              : "text-white/70 hover:bg-white/10 hover:text-white"
            : active
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
          mode === 'top' && "shrink-0",
          mode === 'side' && "gap-3 py-2.5",
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {(mode === 'top' || sidebarOpen) && <span>{item.label}</span>}
        {(mode === 'top' || sidebarOpen) && isNotifications && unreadCount > 0 && (
          <Badge variant="destructive" className="h-5 min-w-[20px] px-1 text-xs">{unreadCount}</Badge>
        )}
      </Link>
    );
  };

  if (navMode === 'top') {
    return (
      <div className="app-surface min-h-screen">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-primary shadow-lg shadow-primary/20 backdrop-blur-xl">
          <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
            <Link to={homePath} className="flex shrink-0 items-center gap-2">
              <ProjectLogo className="animate-soft-pulse h-8 w-8 shadow-accent/25" />
              <span className="font-bold text-lg text-white">Digi-Land</span>
            </Link>

            <nav className="flex flex-1 items-center gap-1 overflow-x-auto px-2">
              {navItems.map(item => renderNavItem(item, 'top'))}
            </nav>

            <div className="hidden shrink-0 text-right sm:block">
              <p className="max-w-36 truncate text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-white/55">{roleLabel}</p>
            </div>
            <Button variant="outline" size="sm" className="bg-white/95 text-primary hover:bg-white hover:text-primary" onClick={() => setNavMode('side')}>
              <Menu className="mr-2 h-4 w-4" />
              Side Nav
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={handleLogout} aria-label="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="animate-rise-in p-4 sm:p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-surface min-h-screen flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar/95 text-sidebar-foreground shadow-xl backdrop-blur transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <ProjectLogo className="animate-soft-pulse h-8 w-8" />
          {sidebarOpen && <span className="font-bold text-lg">Digi-Land</span>}
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map(item => renderNavItem(item, 'side'))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {sidebarOpen && (
            <div className="mb-2 px-3">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/50">{roleLabel}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={cn("flex-1 transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 px-6 shadow-sm backdrop-blur-xl">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setNavMode('top')}>
            Top Nav
          </Button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground hidden sm:block">Prototype — Academic Use Only</span>
        </header>
        <main className="animate-rise-in p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
