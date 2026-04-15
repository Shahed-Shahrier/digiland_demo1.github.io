import { useState } from 'react';
import { getLandRecords } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

export default function LandSearchPage() {
  const [query, setQuery] = useState('');
  const records = getLandRecords();
  const filtered = records.filter(r =>
    r.plotNumber.toLowerCase().includes(query.toLowerCase()) ||
    r.holdingNumber.toLowerCase().includes(query.toLowerCase()) ||
    r.ownerName.toLowerCase().includes(query.toLowerCase()) ||
    r.district.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Land Record Search</h1>
        <p className="page-description">Search by plot number, holding number, owner name, or district</p>
      </div>

      <div className="relative max-w-xl mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search land records..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No records found.</CardContent></Card>
        ) : filtered.map(r => (
          <Card key={r.id} className="hover:shadow-md transition-shadow">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.id}</span>
                  <Badge variant={r.ownershipStatus === 'Active' ? 'default' : 'secondary'}>{r.ownershipStatus}</Badge>
                </div>
                <p className="text-sm"><span className="text-muted-foreground">Owner:</span> {r.ownerName}</p>
                <p className="text-sm"><span className="text-muted-foreground">Plot:</span> {r.plotNumber} • <span className="text-muted-foreground">Holding:</span> {r.holdingNumber}</p>
              </div>
              <div className="text-right text-sm">
                <p>{r.mouza}, {r.upazila}</p>
                <p className="text-muted-foreground">{r.district}</p>
                <p className="font-medium">{r.landSize}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
