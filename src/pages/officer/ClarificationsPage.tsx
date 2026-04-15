import { getApplications } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export default function ClarificationsPage() {
  const apps = getApplications().filter(a => a.status === 'Clarification Requested');

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Clarification Requests</h1>
        <p className="page-description">{apps.length} applications awaiting clarification</p>
      </div>

      <div className="space-y-3">
        {apps.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No clarification requests.</CardContent></Card>
        ) : apps.map(app => (
          <Link key={app.id} to={`/officer/applications/${app.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold">{app.id} — {app.applicantName}</p>
                  <p className="text-sm text-muted-foreground">Plot: {app.plotNumber}</p>
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
