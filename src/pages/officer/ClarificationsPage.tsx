import { getApplications, getClarifications } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export default function ClarificationsPage() {
  const clarifications = getClarifications().filter(item => item.status === 'open');
  const apps = getApplications();

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Clarification Requests</h1>
        <p className="page-description">{clarifications.length} open clarification requests</p>
      </div>

      <div className="space-y-3">
        {clarifications.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No clarification requests.</CardContent></Card>
        ) : clarifications.map(item => {
          const app = apps.find(application => application.id === item.applicationId || application.id.endsWith(item.applicationId));
          return (
          <Link key={item.id} to={`/officer/applications/${app?.id || item.applicationId}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold">{app?.id || `Application #${item.applicationId}`} — {app?.applicantName || 'Applicant'}</p>
                  <p className="text-sm text-muted-foreground">{item.requestMessage}</p>
                  {app && <p className="text-xs text-muted-foreground">Plot: {app.plotNumber}</p>}
                </div>
                {app && <StatusBadge status={app.status} />}
              </CardContent>
            </Card>
          </Link>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
