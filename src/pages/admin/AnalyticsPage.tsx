import { getApplications, getUsers, getLandRecords, getAuditLogs } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsPage() {
  const apps = getApplications();
  const users = getUsers();
  const records = getLandRecords();
  const logs = getAuditLogs();

  const statusData = ['Pending', 'Under Review', 'Clarification Requested', 'Verified', 'Approved', 'Rejected'].map(s => ({
    name: s.length > 12 ? s.slice(0, 12) + '…' : s,
    count: apps.filter(a => a.status === s).length,
  }));

  const districtData = [...new Set(records.map(r => r.district))].map(d => ({
    name: d,
    records: records.filter(r => r.district === d).length,
    applications: apps.filter(a => a.district === d).length,
  }));

  const COLORS = ['hsl(152,55%,28%)', 'hsl(210,70%,50%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)', 'hsl(152,55%,45%)', 'hsl(280,60%,50%)'];

  const ownershipData = [...new Set(records.map(r => r.ownershipStatus))].map(s => ({
    name: s, value: records.filter(r => r.ownershipStatus === s).length,
  }));

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-description">System-wide statistics and trends</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Applications by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(152,55%,28%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Records by District</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={districtData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="records" fill="hsl(152,55%,28%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="applications" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ownership Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={ownershipData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {ownershipData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 text-center"><p className="text-2xl font-bold text-primary">{users.length}</p><p className="text-xs text-muted-foreground">Total Users</p></div>
              <div className="p-4 rounded-lg bg-primary/10 text-center"><p className="text-2xl font-bold text-primary">{records.length}</p><p className="text-xs text-muted-foreground">Land Records</p></div>
              <div className="p-4 rounded-lg bg-primary/10 text-center"><p className="text-2xl font-bold text-primary">{apps.length}</p><p className="text-xs text-muted-foreground">Applications</p></div>
              <div className="p-4 rounded-lg bg-primary/10 text-center"><p className="text-2xl font-bold text-primary">{logs.length}</p><p className="text-xs text-muted-foreground">Audit Logs</p></div>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm font-medium mb-2">Approval Rate</p>
              <p className="text-3xl font-bold text-primary">{apps.length ? Math.round(apps.filter(a => a.status === 'Approved').length / apps.length * 100) : 0}%</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
