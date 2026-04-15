import { getApplications, getUsers, getLandRecords, getAuditLogs } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Database, FileText, Shield, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const users = getUsers();
  const records = getLandRecords();
  const apps = getApplications();
  const logs = getAuditLogs();

  const statusCounts = ['Pending', 'Under Review', 'Clarification Requested', 'Verified', 'Approved', 'Rejected'].map(s => ({
    name: s, value: apps.filter(a => a.status === s).length,
  }));

  const COLORS = ['hsl(38,92%,50%)', 'hsl(210,70%,50%)', 'hsl(38,80%,45%)', 'hsl(152,55%,35%)', 'hsl(152,55%,28%)', 'hsl(0,72%,51%)'];

  const roleCounts = [
    { name: 'Citizens', value: users.filter(u => u.role === 'citizen').length },
    { name: 'Land Officers', value: users.filter(u => u.role === 'land_officer').length },
    { name: 'Survey Officers', value: users.filter(u => u.role === 'survey_officer').length },
    { name: 'Admins', value: users.filter(u => u.role === 'admin').length },
  ];

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-description">System overview and analytics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Users" value={users.length} icon={Users} />
        <StatCard title="Land Records" value={records.length} icon={Database} />
        <StatCard title="Applications" value={apps.length} icon={FileText} />
        <StatCard title="Audit Entries" value={logs.length} icon={Shield} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Application Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusCounts.filter(s => s.value > 0)} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Users by Role</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roleCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(152,55%,28%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent Audit Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.slice().reverse().slice(0, 8).map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{log.actionType}</p>
                    <p className="text-xs text-muted-foreground">{log.details}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{log.actorName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
