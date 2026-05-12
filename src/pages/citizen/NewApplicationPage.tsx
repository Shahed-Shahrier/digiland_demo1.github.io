import { ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  addApplication,
  addAuditLog,
  addNotification,
  DOCUMENT_MAX_SIZE_BYTES,
  generateId,
  getLandRecords,
  getUserProfileByNid,
  REQUIRED_APPLICATION_DOCUMENT_TYPES,
} from '@/services/storageService';
import { TransferType, DocumentFile, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getDistricts, getUpazilas, getMouzas } from '@/data/locationData';
import { Search, CheckCircle2, AlertCircle, Upload, Trash2, FileText, Loader2 } from 'lucide-react';

type NidLookupFieldProps = {
  label: string;
  value: string;
  nameValue: string;
  lookupState: 'idle' | 'found' | 'not_found';
  loading: boolean;
  error?: string;
  onChange: (value: string) => void;
  onLookup: () => void;
};

function NidLookupField({
  label,
  value,
  nameValue,
  lookupState,
  loading,
  error,
  onChange,
  onLookup,
}: NidLookupFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label} NID Number <span className="text-destructive">*</span></Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Enter registered NID"
          className={error ? 'border-destructive' : ''}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onLookup}
          disabled={loading}
        >
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
}

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
  const [currentOwnerLookupLoading, setCurrentOwnerLookupLoading] = useState(false);
  const [newOwnerLookupLoading, setNewOwnerLookupLoading] = useState(false);
  const [currentOwnerProfile, setCurrentOwnerProfile] = useState<User | null>(null);
  const [newOwnerProfile, setNewOwnerProfile] = useState<User | null>(null);
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  // When district changes, reset upazila and mouza
  const setDistrict = (v: string) => setForm(prev => ({ ...prev, district: v, upazila: '', mouza: '' }));
  const setUpazila = (v: string) => setForm(prev => ({ ...prev, upazila: v, mouza: '' }));

  const lookupByNid = async (nid: string, type: 'current' | 'new') => {
    const normalizedNid = nid.trim();
    if (!normalizedNid) {
      if (type === 'current') setCurrentOwnerLookup('idle');
      else setNewOwnerLookup('idle');
      return;
    }

    if (type === 'current') setCurrentOwnerLookupLoading(true);
    else setNewOwnerLookupLoading(true);

    try {
      const found = await getUserProfileByNid(normalizedNid);
      if (found) {
        if (type === 'current') {
          set('currentOwner', found.name);
          setCurrentOwnerProfile(found);
          setCurrentOwnerLookup('found');
        } else {
          set('proposedNewOwner', found.name);
          setNewOwnerProfile(found);
          setNewOwnerLookup('found');
        }
      } else {
        if (type === 'current') {
          set('currentOwner', '');
          setCurrentOwnerProfile(null);
          setCurrentOwnerLookup('not_found');
        } else {
          set('proposedNewOwner', '');
          setNewOwnerProfile(null);
          setNewOwnerLookup('not_found');
        }
      }
    } catch (error) {
      if (type === 'current') {
        set('currentOwner', '');
        setCurrentOwnerProfile(null);
        setCurrentOwnerLookup('not_found');
      } else {
        set('proposedNewOwner', '');
        setNewOwnerProfile(null);
        setNewOwnerLookup('not_found');
      }
      toast({
        title: 'NID Search Failed',
        description: error instanceof Error ? error.message : 'Could not search the database for this NID.',
        variant: 'destructive',
      });
    } finally {
      if (type === 'current') setCurrentOwnerLookupLoading(false);
      else setNewOwnerLookupLoading(false);
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

  const allDocumentTypes: DocumentFile['documentType'][] = ['Land Deed', 'National ID', 'Tax Receipt', 'Supporting Document'];
  const missingRequiredDocuments = REQUIRED_APPLICATION_DOCUMENT_TYPES.filter(docType => !documents.some(document => document.documentType === docType));

  const validatePdfFile = (file: File, docType: DocumentFile['documentType']) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) throw new Error(`${docType} must be uploaded as a PDF file.`);
    if (file.size > DOCUMENT_MAX_SIZE_BYTES) throw new Error(`${docType} must be 10 MB or less.`);
  };

  const handleDocumentSelect = (docType: DocumentFile['documentType'], event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      validatePdfFile(file, docType);
      const document: DocumentFile = {
        id: generateId('doc'),
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        documentType: docType,
        uploadedAt: new Date().toISOString(),
        localFile: file,
      };
      setDocuments(prev => [...prev.filter(item => item.documentType !== docType), document]);
    } catch (error) {
      toast({
        title: 'Invalid Document',
        description: error instanceof Error ? error.message : 'Only PDF files up to 10 MB are allowed.',
        variant: 'destructive',
      });
    }
  };

  const removeDocument = (docType: DocumentFile['documentType']) => {
    setDocuments(prev => prev.filter(document => document.documentType !== docType));
  };

  const validateStep4 = () => {
    if (missingRequiredDocuments.length === 0) return true;
    toast({
      title: 'Missing Documents',
      description: `Upload PDF files for ${missingRequiredDocuments.join(', ')} before submitting.`,
      variant: 'destructive',
    });
    return false;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!validateStep4()) return;

    const appId = `APP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const now = new Date().toISOString();
    setIsSubmitting(true);
    try {
      await addApplication({
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
        comments: [], clarifications: [], verificationNotes: [],
        statusHistory: [{ status: 'Pending', timestamp: now, actor: user.name }],
        createdAt: now, updatedAt: now,
      }, {
        currentOwnerId: currentOwnerProfile?.id,
        proposedNewOwnerId: newOwnerProfile?.id,
      });
      await addAuditLog({ id: generateId('log'), timestamp: now, actorName: user.name, actorRole: user.role, actionType: 'Application Created', applicationId: appId, details: `New application for plot ${form.plotNumber}` });
      await addNotification({ id: generateId('notif'), userId: user.id, title: 'Application Submitted', message: `Your application ${appId} has been submitted successfully.`, type: 'success', read: false, applicationId: appId, createdAt: now });
      toast({ title: 'Application Submitted', description: `ID: ${appId}` });
      navigate('/citizen/applications');
    } catch (error) {
      toast({ title: 'Application Failed', description: error instanceof Error ? error.message : 'Could not submit application', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const landRecords = getLandRecords();
  const districts = getDistricts(landRecords);
  const upazilas = getUpazilas(form.district, landRecords);
  const mouzas = getMouzas(form.district, form.upazila, landRecords);

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
                    value={form.currentOwnerNid}
                    nameValue={form.currentOwner}
                    lookupState={currentOwnerLookup}
                    loading={currentOwnerLookupLoading}
                    onChange={value => {
                      set('currentOwnerNid', value);
                      setCurrentOwnerLookup('idle');
                      set('currentOwner', '');
                      setCurrentOwnerProfile(null);
                    }}
                    onLookup={() => void lookupByNid(form.currentOwnerNid, 'current')}
                    error={step2Errors.currentOwnerNid}
                  />
                  <NidLookupField
                    label="Proposed New Owner"
                    value={form.proposedNewOwnerNid}
                    nameValue={form.proposedNewOwner}
                    lookupState={newOwnerLookup}
                    loading={newOwnerLookupLoading}
                    onChange={value => {
                      set('proposedNewOwnerNid', value);
                      setNewOwnerLookup('idle');
                      set('proposedNewOwner', '');
                      setNewOwnerProfile(null);
                    }}
                    onLookup={() => void lookupByNid(form.proposedNewOwnerNid, 'new')}
                    error={step2Errors.proposedNewOwnerNid}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Search uses the Supabase users table by NID number.
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
              <p className="text-sm text-muted-foreground mb-4">Upload real PDF files. Land Deed, National ID, and Tax Receipt are required. Max size 10 MB each.</p>
              {allDocumentTypes.map(docType => {
                const uploaded = documents.find(d => d.documentType === docType);
                const inputId = `document-upload-${docType.toLowerCase().replace(/\s+/g, '-')}`;
                const isRequired = REQUIRED_APPLICATION_DOCUMENT_TYPES.includes(docType);
                return (
                  <div key={docType} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {docType}
                        {isRequired && <span className="ml-2 text-xs text-destructive">Required</span>}
                      </p>
                      {uploaded ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{uploaded.name} — {(uploaded.size / 1024).toFixed(0)} KB</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">PDF only</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id={inputId}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={event => handleDocumentSelect(docType, event)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant={uploaded ? 'secondary' : 'default'}
                        onClick={() => window.document.getElementById(inputId)?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploaded ? 'Replace PDF' : 'Upload PDF'}
                      </Button>
                      {uploaded && (
                        <Button type="button" size="icon" variant="outline" onClick={() => removeDocument(docType)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1 || isSubmitting}>Previous</Button>
            {step < 4 ? (
              <Button onClick={handleNext} disabled={isSubmitting}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading PDFs...</> : 'Submit Application'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
