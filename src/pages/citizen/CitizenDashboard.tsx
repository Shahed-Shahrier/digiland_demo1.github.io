import { useAuth } from '@/contexts/AuthContext';
import { getApplications, getNotificationsForUser } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle2, Bell, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CitizenDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const apps = getApplications().filter(a => a.applicantId === user.id);
  const notifs = getNotificationsForUser(user.id).filter(n => !n.read);
  const pending = apps.filter(a => a.status === 'Pending' || a.status === 'Under Review' || a.status === 'Clarification Requested').length;
  const approved = apps.filter(a => a.status === 'Approved').length;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Welcome, {user.name}</h1>
        <p className="page-description">Citizen Dashboard — Manage your land applications</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Applications" value={apps.length} icon={FileText} />
        <StatCard title="Pending" value={pending} icon={Clock} />
        <StatCard title="Approved" value={approved} icon={CheckCircle2} />
        <StatCard title="Unread Notifications" value={notifs.length} icon={Bell} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Applications</CardTitle>
            <Button variant="outline" size="sm" asChild><Link to="/citizen/applications">View All</Link></Button>
          </CardHeader>
          <CardContent>
            {apps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications yet.</p>
            ) : (
              <div className="space-y-3">
                {apps.slice(0, 5).map(app => (
                  <Link key={app.id} to={`/citizen/applications/${app.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{app.id}</p>
                      <p className="text-xs text-muted-foreground">Plot: {app.plotNumber} — {app.district}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" asChild>
              <Link to="/citizen/new-application"><PlusCircle className="mr-2 h-4 w-4" /> New Mutation Application</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/citizen/land-search"><FileText className="mr-2 h-4 w-4" /> Search Land Records</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/citizen/notifications"><Bell className="mr-2 h-4 w-4" /> View Notifications {notifs.length > 0 && `(${notifs.length})`}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
