import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getApplications, refreshAppData } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApplicationStatus, TransferType } from '@/types';
import { Link } from 'react-router-dom';

export default function AssignedVerificationsPage() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [, setRefresh] = useState(0);
  const transferTypes: TransferType[] = ['Sale', 'Inheritance', 'Gift', 'Court Order', 'Government Acquisition'];
  const statuses: ApplicationStatus[] = ['Pending', 'Under Review', 'Clarification Requested', 'Verified', 'Approved', 'Rejected'];
  const assigned = getApplications().filter(app =>
    user?.role === 'admin'
      ? app.assignedSurveyOfficerId || app.status === 'Under Review' || app.status === 'Verified'
      : app.assignedSurveyOfficerId === user?.id,
  )
    .filter(app => typeFilter === 'all' || app.transferType === typeFilter)
    .filter(app => statusFilter === 'all' || app.status === statusFilter);

  useEffect(() => {
    void refreshAppData().then(() => setRefresh(refresh => refresh + 1));
  }, []);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Assigned Verifications</h1>
        <p className="page-description">{user?.role === 'admin' ? `${assigned.length} verification case(s)` : `${assigned.length} cases assigned`}</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:max-w-2xl sm:flex-row sm:flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Filter by application type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Application Types</SelectItem>
            {transferTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {assigned.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No cases assigned.</CardContent></Card>
        ) : assigned.map(app => (
          <Link key={app.id} to={`/survey/verifications/${app.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="responsive-list-row py-4">
                <div>
                  <p className="font-semibold">{app.id} — {app.applicantName}</p>
                  <p className="text-sm text-muted-foreground">{app.transferType} • Plot: {app.plotNumber} • {app.district}, {app.upazila}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
