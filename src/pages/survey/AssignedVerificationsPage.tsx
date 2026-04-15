import { useAuth } from '@/contexts/AuthContext';
import { getApplications } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export default function AssignedVerificationsPage() {
  const { user } = useAuth();
  const assigned = getApplications().filter(a => a.assignedSurveyOfficerId === user?.id);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Assigned Verifications</h1>
        <p className="page-description">{assigned.length} cases assigned</p>
      </div>

      <div className="space-y-3">
        {assigned.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No cases assigned.</CardContent></Card>
        ) : assigned.map(app => (
          <Link key={app.id} to={`/survey/verifications/${app.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-semibold">{app.id} — {app.applicantName}</p>
                  <p className="text-sm text-muted-foreground">Plot: {app.plotNumber} • {app.district}, {app.upazila}</p>
                </div>
                <div className="flex items-center gap-2">
                  {app.verificationNotes.some(v => v.isVerified) && <span className="text-xs text-success font-medium">✓ Verified</span>}
                  <StatusBadge status={app.status} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}
