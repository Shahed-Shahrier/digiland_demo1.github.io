import { useState } from 'react';
import { getLandRecords, addLandRecord, deleteLandRecord, generateId } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LandRecord } from '@/types';

export default function LandRecordsManagementPage() {
  const [query, setQuery] = useState('');
  const [, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ ownerName: '', plotNumber: '', holdingNumber: '', district: '', upazila: '', mouza: '', landSize: '' });

  const records = getLandRecords().filter(r => r.plotNumber.toLowerCase().includes(query.toLowerCase()) || r.ownerName.toLowerCase().includes(query.toLowerCase()));

  const handleAdd = () => {
    const rec: LandRecord = { id: generateId('LR'), ...form, ownershipStatus: 'Active' };
    addLandRecord(rec);
    toast({ title: 'Record Added' });
    setForm({ ownerName: '', plotNumber: '', holdingNumber: '', district: '', upazila: '', mouza: '', landSize: '' });
    setOpen(false);
    setRefresh(r => r + 1);
  };

  const handleDelete = (id: string) => { deleteLandRecord(id); setRefresh(r => r + 1); };

  return (
    <DashboardLayout>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Land Records</h1><p className="page-description">{records.length} records</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Record</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Land Record</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {Object.keys(form).map(key => (
                <div key={key} className="space-y-1">
                  <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                  <Input value={(form as any)[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} />
                </div>
              ))}
              <Button className="w-full" onClick={handleAdd}>Add Record</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search records..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="space-y-2">
        {records.map(r => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{r.id} — {r.ownerName}</p>
                  <Badge variant={r.ownershipStatus === 'Active' ? 'default' : 'secondary'}>{r.ownershipStatus}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Plot: {r.plotNumber} • Holding: {r.holdingNumber} • {r.mouza}, {r.upazila}, {r.district} • {r.landSize}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
