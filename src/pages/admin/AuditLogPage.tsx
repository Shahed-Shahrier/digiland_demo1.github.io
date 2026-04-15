import { useState } from 'react';
import { getAuditLogs } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

export default function AuditLogPage() {
  const [query, setQuery] = useState('');
  const logs = getAuditLogs()
    .slice().reverse()
    .filter(l => l.actionType.toLowerCase().includes(query.toLowerCase()) || l.actorName.toLowerCase().includes(query.toLowerCase()) || l.details.toLowerCase().includes(query.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-description">{logs.length} entries</p>
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search logs..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="space-y-2">
        {logs.map(log => (
          <Card key={log.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{log.actionType}</p>
                  <Badge variant="secondary">{log.actorRole.replace('_', ' ')}</Badge>
                  {log.applicationId && <Badge variant="outline">{log.applicationId}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{log.details}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">{log.actorName}</p>
                <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
