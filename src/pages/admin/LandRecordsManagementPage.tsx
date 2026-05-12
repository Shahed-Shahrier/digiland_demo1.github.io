import { useState } from 'react';
import { getLandRecords, addLandRecord, deleteLandRecord, generateId, getUserProfileByNid } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LandRecord, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getDistricts, getMouzas, getUpazilas } from '@/data/locationData';

export default function LandRecordsManagementPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ ownerName: '', ownerNid: '', plotNumber: '', holdingNumber: '', district: '', upazila: '', mouza: '', landSize: '' });
  const [ownerLookup, setOwnerLookup] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [ownerLookupLoading, setOwnerLookupLoading] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<User | null>(null);
  const formFields: Array<'ownerName' | 'plotNumber' | 'holdingNumber' | 'landSize'> = ['ownerName', 'plotNumber', 'holdingNumber', 'landSize'];

  const records = getLandRecords().filter(r => r.plotNumber.toLowerCase().includes(query.toLowerCase()) || r.ownerName.toLowerCase().includes(query.toLowerCase()));
  const districts = getDistricts(getLandRecords());
  const upazilas = getUpazilas(form.district, getLandRecords());
  const mouzas = getMouzas(form.district, form.upazila, getLandRecords());

  const handleOwnerLookup = async () => {
    const normalizedNid = form.ownerNid.trim();
    if (!normalizedNid) {
      setOwnerLookup('idle');
      setOwnerProfile(null);
      setForm(prev => ({ ...prev, ownerName: '' }));
      return;
    }

    setOwnerLookupLoading(true);

    try {
      const found = await getUserProfileByNid(normalizedNid);
      if (!found) {
        setOwnerLookup('not_found');
        setOwnerProfile(null);
        setForm(prev => ({ ...prev, ownerName: '' }));
        return;
      }

      setOwnerLookup('found');
      setOwnerProfile(found);
      setForm(prev => ({ ...prev, ownerName: found.name }));
    } catch (error) {
      setOwnerLookup('not_found');
      setOwnerProfile(null);
      setForm(prev => ({ ...prev, ownerName: '' }));
      toast({ title: 'Owner Lookup Failed', description: error instanceof Error ? error.message : 'Could not find owner by NID', variant: 'destructive' });
    } finally {
      setOwnerLookupLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!ownerProfile) {
      toast({ title: 'Owner Required', description: 'Search a registered owner by NID before adding the land record.', variant: 'destructive' });
      return;
    }

    if (!form.plotNumber.trim() || !form.holdingNumber.trim() || !form.district || !form.upazila || !form.mouza || !form.landSize.trim()) {
      toast({ title: 'Missing Information', description: 'Fill plot, holding, district, upazila, mouza, and land size first.', variant: 'destructive' });
      return;
    }

    const rec: LandRecord = {
      id: generateId('LR'),
      ownerName: form.ownerName,
      plotNumber: form.plotNumber,
      holdingNumber: form.holdingNumber,
      district: form.district,
      upazila: form.upazila,
      mouza: form.mouza,
      landSize: form.landSize,
      ownershipStatus: 'Active',
    };
    try {
      await addLandRecord(rec, { ownerUserId: ownerProfile.id, verifiedByUserId: user?.id });
      toast({ title: 'Record Added' });
      setForm({ ownerName: '', ownerNid: '', plotNumber: '', holdingNumber: '', district: '', upazila: '', mouza: '', landSize: '' });
      setOwnerLookup('idle');
      setOwnerProfile(null);
      setOpen(false);
      setRefresh(r => r + 1);
    } catch (error) {
      toast({ title: 'Record Add Failed', description: error instanceof Error ? error.message : 'Could not add record', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLandRecord(id);
      setRefresh(r => r + 1);
    } catch (error) {
      toast({ title: 'Record Delete Failed', description: error instanceof Error ? error.message : 'Could not delete record', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Land Records</h1><p className="page-description">{records.length} records</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Record</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Land Record</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Owner NID</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.ownerNid}
                    onChange={e => {
                      setForm(prev => ({ ...prev, ownerNid: e.target.value, ownerName: '' }));
                      setOwnerLookup('idle');
                      setOwnerProfile(null);
                    }}
                    placeholder="Enter registered owner NID"
                    autoComplete="off"
                  />
                  <Button type="button" variant="secondary" size="icon" onClick={() => void handleOwnerLookup()} disabled={ownerLookupLoading}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {ownerLookup === 'found' && (
                  <div className="flex items-center gap-2 rounded-md bg-accent/50 p-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{form.ownerName}</span>
                  </div>
                )}
                {ownerLookup === 'not_found' && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>No registered owner found with this NID</span>
                  </div>
                )}
              </div>
              {formFields.map(key => (
                <div key={key} className="space-y-1">
                  <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                  <Input
                    value={form[key]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    readOnly={key === 'ownerName'}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label>District</Label>
                <Select value={form.district} onValueChange={value => setForm(prev => ({ ...prev, district: value, upazila: '', mouza: '' }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Upazila</Label>
                <Select value={form.upazila} onValueChange={value => setForm(prev => ({ ...prev, upazila: value, mouza: '' }))} disabled={!form.district}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select upazila" />
                  </SelectTrigger>
                  <SelectContent>
                    {upazilas.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Mouza</Label>
                <Select value={form.mouza} onValueChange={value => setForm(prev => ({ ...prev, mouza: value }))} disabled={!form.upazila}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mouza" />
                  </SelectTrigger>
                  <SelectContent>
                    {mouzas.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
