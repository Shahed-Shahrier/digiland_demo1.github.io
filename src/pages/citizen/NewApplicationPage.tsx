import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addApplication, addAuditLog, addNotification, generateId, getUsers } from '@/services/storageService';
import { TransferType, DocumentFile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getDistricts, getUpazilas, getMouzas } from '@/data/locationData';
import { Search, CheckCircle2, AlertCircle } from 'lucide-react';

export default function NewApplicationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    applicantName: user?.name || '', applicantNid: user?.nid || '', applicantPhone: user?.phone || '',
    applicantEmail: user?.email || '', applicantAddress: user?.address || '',
    plotNumber: '', holdingNumber: '', district: '', upazila: '', mouza: '', landSize: '',
    currentOwnerNid: '', currentOwner: '',
    proposedNewOwnerNid: '', proposedNewOwner: '',
    transferType: 'Sale' as TransferType,
    reason: '', deedReference: '', remarks: '',
  });

  const [currentOwnerLookup, setCurrentOwnerLookup] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [newOwnerLookup, setNewOwnerLookup] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<DocumentFile[]>([]);

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  // When district changes, reset upazila and mouza
  const setDistrict = (v: string) => setForm(prev => ({ ...prev, district: v, upazila: '', mouza: '' }));
  const setUpazila = (v: string) => setForm(prev => ({ ...prev, upazila: v, mouza: '' }));

  const lookupByNid = (nid: string, type: 'current' | 'new') => {
    if (!nid.trim()) {
      if (type === 'current') setCurrentOwnerLookup('idle');
      else setNewOwnerLookup('idle');
      return;
    }
    const users = getUsers();
    const found = users.find(u => u.nid === nid.trim());
    if (found) {
      if (type === 'current') {
        set('currentOwner', found.name);
        setCurrentOwnerLookup('found');
      } else {
        set('proposedNewOwner', found.name);
        setNewOwnerLookup('found');
      }
    } else {
      if (type === 'current') {
        set('currentOwner', '');
        setCurrentOwnerLookup('not_found');
      } else {
        set('proposedNewOwner', '');
        setNewOwnerLookup('not_found');
      }
    }
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.plotNumber.trim()) errors.plotNumber = 'Plot number is required';
    if (!form.holdingNumber.trim()) errors.holdingNumber = 'Holding number is required';
    if (!form.district) errors.district = 'District is required';
    if (!form.upazila) errors.upazila = 'Upazila is required';
    if (!form.mouza) errors.mouza = 'Mouza is required';
    if (!form.landSize.trim()) errors.landSize = 'Land size is required';
    if (!form.currentOwnerNid.trim()) errors.currentOwnerNid = 'Current owner NID is required';
    if (currentOwnerLookup !== 'found') errors.currentOwnerNid = 'Current owner not found. Please enter a valid NID.';
    if (!form.proposedNewOwnerNid.trim()) errors.proposedNewOwnerNid = 'Proposed new owner NID is required';
    if (newOwnerLookup !== 'found') errors.proposedNewOwnerNid = 'Proposed new owner not found. Please enter a valid NID.';
    setStep2Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.transferType) errors.transferType = 'Transfer type is required';
    if (!form.reason.trim()) errors.reason = 'Reason is required';
    if (!form.deedReference.trim()) errors.deedReference = 'Deed reference is required';
    setStep3Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (step === 2) {
      if (!validateStep2()) {
        toast({ title: 'Missing Information', description: 'Please fill all required fields.', variant: 'destructive' });
        return;
      }
    }
    if (step === 3) {
      if (!validateStep3()) {
        toast({ title: 'Missing Information', description: 'Please fill all required fields.', variant: 'destructive' });
        return;
      }
    }
    setStep(s => s + 1);
  };

  const addDoc = (docType: DocumentFile['documentType']) => {
    const doc: DocumentFile = {
      id: generateId('doc'), name: `${docType.toLowerCase().replace(/ /g, '_')}.pdf`,
      type: 'application/pdf', size: Math.floor(Math.random() * 300000) + 50000,
      documentType: docType, uploadedAt: new Date().toISOString(),
    };
    setDocuments(prev => [...prev, doc]);
  };

  const handleSubmit = () => {
    if (!user) return;
    const appId = `APP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const now = new Date().toISOString();
    addApplication({
      id: appId, applicantId: user.id,
      applicantName: form.applicantName, applicantNid: form.applicantNid,
      applicantPhone: form.applicantPhone, applicantEmail: form.applicantEmail,
      applicantAddress: form.applicantAddress,
      plotNumber: form.plotNumber, holdingNumber: form.holdingNumber,
      district: form.district, upazila: form.upazila, mouza: form.mouza,
      landSize: form.landSize, currentOwner: form.currentOwner,
      proposedNewOwner: form.proposedNewOwner, transferType: form.transferType,
      reason: form.reason, deedReference: form.deedReference, remarks: form.remarks,
      documents, status: 'Pending',
      comments: [], verificationNotes: [],
      statusHistory: [{ status: 'Pending', timestamp: now, actor: user.name }],
      createdAt: now, updatedAt: now,
    });
    addAuditLog({ id: generateId('log'), timestamp: now, actorName: user.name, actorRole: user.role, actionType: 'Application Created', applicationId: appId, details: `New application for plot ${form.plotNumber}` });
    addNotification({ id: generateId('notif'), userId: user.id, title: 'Application Submitted', message: `Your application ${appId} has been submitted successfully.`, type: 'success', read: false, applicationId: appId, createdAt: now });
    toast({ title: 'Application Submitted', description: `ID: ${appId}` });
    navigate('/citizen/applications');
  };

  const districts = getDistricts();
  const upazilas = getUpazilas(form.district);
  const mouzas = getMouzas(form.district, form.upazila);

  const NidLookupField = ({ label, nidField, nameValue, lookupState, onLookup, error }: {
    label: string; nidField: string; nameValue: string;
    lookupState: 'idle' | 'found' | 'not_found'; onLookup: () => void; error?: string;
  }) => (
    <div className="space-y-2">
      <Label>{label} NID Number <span className="text-destructive">*</span></Label>
      <div className="flex gap-2">
        <Input
          value={(form as any)[nidField]}
          onChange={e => { set(nidField, e.target.value); if (lookupState !== 'idle') onLookup(); }}
          placeholder="Enter 13-digit NID number"
          className={error ? 'border-destructive' : ''}
        />
        <Button type="button" variant="secondary" size="icon" onClick={onLookup}>
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {lookupState === 'found' && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-accent/50 text-sm">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>Found: <strong>{nameValue}</strong></span>
        </div>
      )}
      {lookupState === 'not_found' && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>No citizen found with this NID</span>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">New Mutation Application</h1>
        <p className="page-description">Step {step} of 4</p>
      </div>

      <div className="flex gap-2 mb-6">
        {['Applicant', 'Land Info', 'Transfer', 'Documents'].map((s, i) => (
          <div key={s} className={`flex-1 h-2 rounded-full ${i + 1 <= step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{['Applicant Information', 'Land Information', 'Transfer Details', 'Document Upload'][step - 1]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2"><Label>Full Name</Label><Input value={form.applicantName} onChange={e => set('applicantName', e.target.value)} /></div>
              <div className="space-y-2"><Label>NID Number</Label><Input value={form.applicantNid} onChange={e => set('applicantNid', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phone</Label><Input value={form.applicantPhone} onChange={e => set('applicantPhone', e.target.value)} /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={form.applicantEmail} onChange={e => set('applicantEmail', e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Textarea value={form.applicantAddress} onChange={e => set('applicantAddress', e.target.value)} /></div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plot Number <span className="text-destructive">*</span></Label>
                  <Input value={form.plotNumber} onChange={e => set('plotNumber', e.target.value)} className={step2Errors.plotNumber ? 'border-destructive' : ''} />
                  {step2Errors.plotNumber && <p className="text-xs text-destructive">{step2Errors.plotNumber}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Holding Number <span className="text-destructive">*</span></Label>
                  <Input value={form.holdingNumber} onChange={e => set('holdingNumber', e.target.value)} className={step2Errors.holdingNumber ? 'border-destructive' : ''} />
                  {step2Errors.holdingNumber && <p className="text-xs text-destructive">{step2Errors.holdingNumber}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>District <span className="text-destructive">*</span></Label>
                  <Select value={form.district} onValueChange={setDistrict}>
                    <SelectTrigger className={step2Errors.district ? 'border-destructive' : ''}><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent>
                      {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {step2Errors.district && <p className="text-xs text-destructive">{step2Errors.district}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Upazila <span className="text-destructive">*</span></Label>
                  <Select value={form.upazila} onValueChange={setUpazila} disabled={!form.district}>
                    <SelectTrigger className={step2Errors.upazila ? 'border-destructive' : ''}><SelectValue placeholder="Select upazila" /></SelectTrigger>
                    <SelectContent>
                      {upazilas.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {step2Errors.upazila && <p className="text-xs text-destructive">{step2Errors.upazila}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Mouza <span className="text-destructive">*</span></Label>
                  <Select value={form.mouza} onValueChange={v => set('mouza', v)} disabled={!form.upazila}>
                    <SelectTrigger className={step2Errors.mouza ? 'border-destructive' : ''}><SelectValue placeholder="Select mouza" /></SelectTrigger>
                    <SelectContent>
                      {mouzas.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {step2Errors.mouza && <p className="text-xs text-destructive">{step2Errors.mouza}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Land Size <span className="text-destructive">*</span></Label>
                <Input value={form.landSize} onChange={e => set('landSize', e.target.value)} placeholder="e.g. 5 katha" className={step2Errors.landSize ? 'border-destructive' : ''} />
                {step2Errors.landSize && <p className="text-xs text-destructive">{step2Errors.landSize}</p>}
              </div>

              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Ownership Details</h3>
                <div className="space-y-4">
                  <NidLookupField
                    label="Current Owner"
                    nidField="currentOwnerNid"
                    nameValue={form.currentOwner}
                    lookupState={currentOwnerLookup}
                    onLookup={() => lookupByNid(form.currentOwnerNid, 'current')}
                    error={step2Errors.currentOwnerNid}
                  />
                  <NidLookupField
                    label="Proposed New Owner"
                    nidField="proposedNewOwnerNid"
                    nameValue={form.proposedNewOwner}
                    lookupState={newOwnerLookup}
                    onLookup={() => lookupByNid(form.proposedNewOwnerNid, 'new')}
                    error={step2Errors.proposedNewOwnerNid}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Try demo NIDs: <code className="bg-muted px-1 rounded">1990123456789</code> (Rahim Uddin) or <code className="bg-muted px-1 rounded">1985567891234</code> (Fatema Begum)
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Transfer Type <span className="text-destructive">*</span></Label>
                <Select value={form.transferType} onValueChange={v => set('transferType', v)}>
                  <SelectTrigger className={step3Errors.transferType ? 'border-destructive' : ''}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Sale', 'Inheritance', 'Gift', 'Court Order', 'Government Acquisition'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {step3Errors.transferType && <p className="text-xs text-destructive">{step3Errors.transferType}</p>}
              </div>
              <div className="space-y-2">
                <Label>Reason <span className="text-destructive">*</span></Label>
                <Textarea value={form.reason} onChange={e => set('reason', e.target.value)} className={step3Errors.reason ? 'border-destructive' : ''} />
                {step3Errors.reason && <p className="text-xs text-destructive">{step3Errors.reason}</p>}
              </div>
              <div className="space-y-2">
                <Label>Sale/Deed Reference <span className="text-destructive">*</span></Label>
                <Input value={form.deedReference} onChange={e => set('deedReference', e.target.value)} className={step3Errors.deedReference ? 'border-destructive' : ''} />
                {step3Errors.deedReference && <p className="text-xs text-destructive">{step3Errors.deedReference}</p>}
              </div>
              <div className="space-y-2"><Label>Remarks</Label><Textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} /></div>
            </>
          )}
          {step === 4 && (
            <>
              <p className="text-sm text-muted-foreground mb-4">Simulate document uploads. Click to add each required document.</p>
              {(['Land Deed', 'National ID', 'Tax Receipt', 'Supporting Document'] as const).map(docType => {
                const uploaded = documents.find(d => d.documentType === docType);
                return (
                  <div key={docType} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{docType}</p>
                      {uploaded && <p className="text-xs text-muted-foreground">{uploaded.name} — {(uploaded.size / 1024).toFixed(0)} KB</p>}
                    </div>
                    <Button size="sm" variant={uploaded ? 'secondary' : 'default'} disabled={!!uploaded} onClick={() => addDoc(docType)}>
                      {uploaded ? 'Uploaded' : 'Upload'}
                    </Button>
                  </div>
                );
              })}
            </>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1}>Previous</Button>
            {step < 4 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit}>Submit Application</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
