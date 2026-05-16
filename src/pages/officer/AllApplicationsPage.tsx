import { useState } from 'react';
import { getApplications } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ApplicationStatus, TransferType } from '@/types';

export default function AllApplicationsPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const transferTypes: TransferType[] = ['Sale', 'Inheritance', 'Gift', 'Court Order', 'Government Acquisition'];
  const apps = getApplications()
    .filter(a => statusFilter === 'all' || a.status === statusFilter)
    .filter(a => typeFilter === 'all' || a.transferType === typeFilter)
    .filter(a =>
      a.id.toLowerCase().includes(query.toLowerCase()) ||
      a.applicantName.toLowerCase().includes(query.toLowerCase()) ||
      a.applicantNid.toLowerCase().includes(query.toLowerCase()) ||
      a.plotNumber.toLowerCase().includes(query.toLowerCase())
    );

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">All Applications</h1>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative w-full sm:min-w-[220px] sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search by app ID, name, NID, or plot..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {['Pending', 'Under Review', 'Clarification Requested', 'Verified', 'Approved', 'Rejected'].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Application Types</SelectItem>
            {transferTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {apps.map(app => (
          <Link key={app.id} to={`/officer/applications/${app.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="responsive-list-row py-4">
                <div>
                  <p className="font-semibold">{app.id}</p>
                  <p className="text-sm text-muted-foreground">{app.applicantName} • Plot: {app.plotNumber} • {app.district}</p>
                  <p className="text-xs text-muted-foreground">{app.transferType} • Updated: {new Date(app.updatedAt).toLocaleDateString()}</p>
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
