import { useAuth } from '@/contexts/AuthContext';
import { getApplications } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SurveyDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const assigned = getApplications().filter(a => a.assignedSurveyOfficerId === user.id);
  const completed = assigned.filter(a => a.verificationNotes.some(v => v.isVerified));
  const pending = assigned.filter(a => !a.verificationNotes.some(v => v.isVerified));

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Survey Officer Dashboard</h1>
        <p className="page-description">Verify land and plot details for assigned cases</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard title="Assigned Cases" value={assigned.length} icon={MapPin} />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle2} />
        <StatCard title="Pending" value={pending.length} icon={Clock} />
      </div>

      <Card>
        <CardHeader><CardTitle>Assigned Verifications</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assigned cases.</p>
            ) : assigned.map(app => (
              <Link key={app.id} to={`/survey/verifications/${app.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{app.id} — {app.applicantName}</p>
                  <p className="text-xs text-muted-foreground">Plot: {app.plotNumber} • {app.district}</p>
                </div>
                <StatusBadge status={app.status} />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
