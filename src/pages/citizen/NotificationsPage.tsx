import { useAuth } from '@/contexts/AuthContext';
import { getNotificationsForUser, markNotificationRead, markAllNotificationsRead } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const typeIcons = { info: Info, success: CheckCircle2, warning: AlertCircle, error: XCircle };

export default function NotificationsPage() {
  const { user } = useAuth();
  const [, setRefresh] = useState(0);
  if (!user) return null;

  const notifs = getNotificationsForUser(user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleMarkAll = () => { markAllNotificationsRead(user.id); setRefresh(r => r + 1); };
  const handleMark = (id: string) => { markNotificationRead(id); setRefresh(r => r + 1); };

  return (
    <DashboardLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-description">{notifs.filter(n => !n.read).length} unread</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleMarkAll}>Mark All Read</Button>
      </div>

      <div className="space-y-2">
        {notifs.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No notifications.</CardContent></Card>
        ) : notifs.map(n => {
          const Icon = typeIcons[n.type];
          return (
            <Card key={n.id} className={cn(!n.read && 'border-primary/30 bg-primary/5')}>
              <CardContent className="flex items-start gap-3 py-4">
                <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', n.type === 'success' && 'text-success', n.type === 'warning' && 'text-warning', n.type === 'error' && 'text-destructive', n.type === 'info' && 'text-info')} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.read && <Button variant="ghost" size="sm" onClick={() => handleMark(n.id)}>Mark Read</Button>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
