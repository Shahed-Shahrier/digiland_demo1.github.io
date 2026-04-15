import { getApplications } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OfficerDashboard() {
  const apps = getApplications();
  const pending = apps.filter(a => a.status === 'Pending').length;
  const underReview = apps.filter(a => a.status === 'Under Review').length;
  const clarifications = apps.filter(a => a.status === 'Clarification Requested').length;
  const recent = apps.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Land Officer Dashboard</h1>
        <p className="page-description">Review and manage mutation applications</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Applications" value={apps.length} icon={FileText} />
        <StatCard title="Pending Review" value={pending} icon={Clock} />
        <StatCard title="Under Review" value={underReview} icon={FileText} />
        <StatCard title="Clarification Requested" value={clarifications} icon={AlertCircle} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Applications</CardTitle>
          <Button variant="outline" size="sm" asChild><Link to="/officer/applications">View All</Link></Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recent.map(app => (
              <Link key={app.id} to={`/officer/applications/${app.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
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
