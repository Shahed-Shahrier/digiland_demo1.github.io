import { useAuth } from '@/contexts/AuthContext';
import { getApplicationsForUser } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export default function MyApplicationsPage() {
  const { user } = useAuth();
  const apps = getApplicationsForUser(user);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">My Applications</h1>
        <p className="page-description">{apps.length} application(s) found</p>
      </div>

      <div className="space-y-3">
        {apps.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No applications yet.</CardContent></Card>
        ) : apps.map(app => (
          <Link key={app.id} to={`/citizen/applications/${app.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="responsive-list-row py-4">
                <div>
                  <p className="font-semibold">{app.id}</p>
                  <p className="text-sm text-muted-foreground">Plot: {app.plotNumber} • {app.district}, {app.upazila}</p>
                  <p className="text-xs text-muted-foreground">Submitted: {new Date(app.createdAt).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={app.status} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}
