import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, User, Home, FileText, Search, PlusCircle, ClipboardList, Shield, Users, Database, BarChart3, CheckSquare, MapPin, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getNotificationsForUser } from '@/services/storageService';
import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const roleNavItems = {
  citizen: [
    { label: 'Dashboard', icon: Home, path: '/citizen' },
    { label: 'New Application', icon: PlusCircle, path: '/citizen/new-application' },
    { label: 'My Applications', icon: FileText, path: '/citizen/applications' },
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
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Land Records', icon: Database, path: '/admin/land-records' },
    { label: 'Audit Log', icon: Shield, path: '/admin/audit-log' },
    { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  ],
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) return null;
  const navItems = roleNavItems[user.role];
  const unreadCount = getNotificationsForUser(user.id).filter(n => !n.read).length;

  const handleLogout = () => { logout(); navigate('/'); };

  const roleLabel = {
    citizen: 'Citizen',
    land_officer: 'Land Officer',
    survey_officer: 'Survey Officer',
    admin: 'Administrator',
  }[user.role];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <MapPin className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {sidebarOpen && <span className="font-bold text-lg">Digi-Land</span>}
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && (
                  <span className="flex-1">{item.label}</span>
                )}
                {sidebarOpen && item.label === 'Notifications' && unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] text-xs px-1">{unreadCount}</Badge>
                )}
              </Link>
            );
          })}
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
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-6">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground hidden sm:block">Prototype — Academic Use Only</span>
        </header>
        <main className="p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
