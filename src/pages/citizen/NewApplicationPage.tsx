import { ChangeEvent, useEffect, useState } from 'react';
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
  getLandRecordsByCurrentOwnerNid,
  getUserProfileByNid,
  REQUIRED_APPLICATION_DOCUMENT_TYPES,
} from '@/services/storageService';
import { TransferType, DocumentFile, User, LandRecord } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Search, CheckCircle2, AlertCircle, Upload, Trash2, FileText, Loader2 } from 'lucide-react';

type TransferDirection = 'to_me' | 'from_me';

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
          <span>No match found with this NID</span>
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
  const [transferDirection, setTransferDirection] = useState<TransferDirection>('to_me');

  const [form, setForm] = useState({
    applicantName: user?.name || '', applicantNid: user?.nid || '', applicantPhone: user?.phone || '',
    applicantEmail: user?.email || '', applicantAddress: user?.address || '',
    plotNumber: '', holdingNumber: '', district: '', upazila: '', mouza: '', landSize: '',
    currentOwnerNid: '', currentOwner: '',
    proposedNewOwnerNid: user?.nid || '', proposedNewOwner: user?.name || '',
    transferType: 'Sale' as TransferType,
    reason: '', deedReference: '', remarks: '',
  });

  const [currentOwnerLookup, setCurrentOwnerLookup] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [newOwnerLookup, setNewOwnerLookup] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [currentOwnerLookupLoading, setCurrentOwnerLookupLoading] = useState(false);
  const [newOwnerLookupLoading, setNewOwnerLookupLoading] = useState(false);
  const [currentOwnerProfile, setCurrentOwnerProfile] = useState<User | null>(null);
  const [newOwnerProfile, setNewOwnerProfile] = useState<User | null>(user);
  const [matchedLandRecords, setMatchedLandRecords] = useState<LandRecord[]>([]);
  const [myLandRecords, setMyLandRecords] = useState<LandRecord[]>([]);
  const [myLandRecordsLoading, setMyLandRecordsLoading] = useState(false);
  const [selectedLandRecordId, setSelectedLandRecordId] = useState('');
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (transferDirection !== 'from_me' || !user?.nid) return;

    let mounted = true;
    setMyLandRecordsLoading(true);
    void getLandRecordsByCurrentOwnerNid(user.nid)
      .then(records => {
        if (mounted) setMyLandRecords(records);
      })
      .catch(error => {
        if (!mounted) return;
        setMyLandRecords([]);
        toast({
          title: 'Could not load your properties',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (mounted) setMyLandRecordsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [toast, transferDirection, user?.nid]);

  const clearSelectedLandRecord = () => {
    setSelectedLandRecordId('');
    setForm(prev => ({
      ...prev,
      plotNumber: '',
      holdingNumber: '',
      district: '',
      upazila: '',
      mouza: '',
      landSize: '',
    }));
  };

  const selectLandRecord = (record: LandRecord) => {
    setSelectedLandRecordId(record.id);
    setForm(prev => ({
      ...prev,
      plotNumber: record.plotNumber,
      holdingNumber: record.holdingNumber,
      district: record.district,
      upazila: record.upazila,
      mouza: record.mouza,
      landSize: record.landSize,
      currentOwner: record.ownerName,
    }));
    setStep2Errors(prev => {
      const { selectedLandRecord: _selectedLandRecord, ...rest } = prev;
      return rest;
    });
  };

  const handleTransferDirectionChange = (direction: TransferDirection) => {
    setTransferDirection(direction);
    setStep2Errors({});
    setCurrentOwnerLookup('idle');
    setNewOwnerLookup('idle');
    setMatchedLandRecords([]);
    clearSelectedLandRecord();

    if (direction === 'to_me') {
      setCurrentOwnerProfile(null);
      setNewOwnerProfile(user);
      setForm(prev => ({
        ...prev,
        currentOwnerNid: '',
        currentOwner: '',
        proposedNewOwnerNid: user?.nid || '',
        proposedNewOwner: user?.name || '',
      }));
      return;
    }

    setCurrentOwnerProfile(user);
    setNewOwnerProfile(null);
    setForm(prev => ({
      ...prev,
      currentOwnerNid: user?.nid || '',
      currentOwner: user?.name || '',
      proposedNewOwnerNid: '',
      proposedNewOwner: '',
    }));
  };

  const lookupCurrentOwnerByNid = async (nid: string) => {
    const normalizedNid = nid.trim();
    if (!normalizedNid) {
      setCurrentOwnerLookup('idle');
      return;
    }

    setCurrentOwnerLookupLoading(true);

    try {
      const [found, ownerLandRecords] = await Promise.all([
        getUserProfileByNid(normalizedNid),
        getLandRecordsByCurrentOwnerNid(normalizedNid),
      ]);

      if (found) {
        set('currentOwner', found.name);
        setCurrentOwnerProfile(found);
        setMatchedLandRecords(ownerLandRecords);
        clearSelectedLandRecord();
        setCurrentOwnerLookup(ownerLandRecords.length > 0 ? 'found' : 'not_found');
      } else {
        set('currentOwner', '');
        setCurrentOwnerProfile(null);
        setMatchedLandRecords([]);
        clearSelectedLandRecord();
        setCurrentOwnerLookup('not_found');
      }
    } catch (error) {
      set('currentOwner', '');
      setCurrentOwnerProfile(null);
      setMatchedLandRecords([]);
      clearSelectedLandRecord();
      setCurrentOwnerLookup('not_found');
      toast({
        title: 'NID Search Failed',
        description: error instanceof Error ? error.message : 'Could not search the database for this NID.',
        variant: 'destructive',
      });
    } finally {
      setCurrentOwnerLookupLoading(false);
    }
  };

  const lookupNewOwnerByNid = async (nid: string) => {
    const normalizedNid = nid.trim();
    if (!normalizedNid) {
      setNewOwnerLookup('idle');
      return;
    }

    setNewOwnerLookupLoading(true);

    try {
      const found = await getUserProfileByNid(normalizedNid);
      if (found) {
        set('proposedNewOwner', found.name);
        setNewOwnerProfile(found);
        setNewOwnerLookup('found');
      } else {
        set('proposedNewOwner', '');
        setNewOwnerProfile(null);
        setNewOwnerLookup('not_found');
      }
    } catch (error) {
      set('proposedNewOwner', '');
      setNewOwnerProfile(null);
      setNewOwnerLookup('not_found');
      toast({
        title: 'NID Search Failed',
        description: error instanceof Error ? error.message : 'Could not search the database for this NID.',
        variant: 'destructive',
      });
    } finally {
      setNewOwnerLookupLoading(false);
    }
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (transferDirection === 'to_me') {
      if (!form.currentOwnerNid.trim()) errors.currentOwnerNid = 'Current owner NID is required';
      if (currentOwnerLookup !== 'found') errors.currentOwnerNid = 'No land records found for this current owner NID.';
      if (!user?.nid) errors.proposedNewOwnerNid = 'Your profile must have a NID before creating an application.';
      if (form.proposedNewOwnerNid !== user?.nid) errors.proposedNewOwnerNid = 'Proposed new owner must be your current user NID.';
    } else {
      if (!user?.nid) errors.currentOwnerNid = 'Your profile must have a NID before transferring from your properties.';
      if (form.currentOwnerNid !== user?.nid) errors.currentOwnerNid = 'Current owner must be your current user NID.';
      if (!form.proposedNewOwnerNid.trim()) errors.proposedNewOwnerNid = 'Proposed new owner NID is required.';
      if (newOwnerLookup !== 'found') errors.proposedNewOwnerNid = 'Proposed new owner not found. Please enter a valid NID.';
      if (form.proposedNewOwnerNid === user?.nid) errors.proposedNewOwnerNid = 'Proposed new owner must be a different citizen.';
    }
    if (!selectedLandRecordId) errors.selectedLandRecord = 'Choose one land property from the matched list.';
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
              <div className="space-y-2">
                <Label>Application Direction <span className="text-destructive">*</span></Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleTransferDirectionChange('to_me')}
                    className={`rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 ${transferDirection === 'to_me' ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}
                  >
                    <p className="text-sm font-semibold">Transfer to me</p>
                    <p className="mt-1 text-xs text-muted-foreground">Search the current owner NID, then choose one of their properties.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransferDirectionChange('from_me')}
                    className={`rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 ${transferDirection === 'from_me' ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}
                  >
                    <p className="text-sm font-semibold">Transfer from me</p>
                    <p className="mt-1 text-xs text-muted-foreground">Choose from properties listed with your NID.</p>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  {transferDirection === 'to_me' ? 'Current Owner Property Search' : 'Your Property Selection'}
                </h3>
                <div className="space-y-4">
                  {transferDirection === 'to_me' ? (
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
                        setMatchedLandRecords([]);
                        clearSelectedLandRecord();
                      }}
                      onLookup={() => void lookupCurrentOwnerByNid(form.currentOwnerNid)}
                      error={step2Errors.currentOwnerNid}
                    />
                  ) : (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Owner</p>
                          <p className="text-sm font-medium">{user?.name || 'Current user'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">NID Number</p>
                          <p className="text-sm font-medium">{user?.nid || 'N/A'}</p>
                        </div>
                      </div>
                      {step2Errors.currentOwnerNid && <p className="mt-2 text-xs text-destructive">{step2Errors.currentOwnerNid}</p>}
                    </div>
                  )}

                  {transferDirection === 'from_me' && myLandRecordsLoading && (
                    <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading your properties...
                    </div>
                  )}

                  {transferDirection === 'from_me' && !myLandRecordsLoading && user?.nid && myLandRecords.length === 0 && (
                    <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                      No properties are currently listed with your NID.
                    </div>
                  )}

                  {((transferDirection === 'to_me' && matchedLandRecords.length > 0) ||
                    (transferDirection === 'from_me' && myLandRecords.length > 0)) && (
                    <div className="space-y-2">
                      <Label>Choose Property <span className="text-destructive">*</span></Label>
                      <div className="space-y-2">
                        {(transferDirection === 'to_me' ? matchedLandRecords : myLandRecords).map(record => {
                          const selected = record.id === selectedLandRecordId;
                          return (
                            <button
                              key={record.id}
                              type="button"
                              onClick={() => selectLandRecord(record)}
                              className={`w-full rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 ${selected ? 'border-primary bg-primary/10' : 'border-border bg-background'}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold">Plot {record.plotNumber} • Holding {record.holdingNumber || 'N/A'}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{record.mouza}, {record.upazila}, {record.district}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">Land size: {record.landSize || 'N/A'} • Status: {record.ownershipStatus}</p>
                                </div>
                                {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {step2Errors.selectedLandRecord && <p className="text-xs text-destructive">{step2Errors.selectedLandRecord}</p>}
                    </div>
                  )}
                </div>
              </div>

              {selectedLandRecordId && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Selected Land Details</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Current Owner</p>
                      <p className="text-sm font-medium">{form.currentOwner}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Plot Number</p>
                      <p className="text-sm font-medium">{form.plotNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Holding Number</p>
                      <p className="text-sm font-medium">{form.holdingNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Land Size</p>
                      <p className="text-sm font-medium">{form.landSize || 'N/A'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{form.mouza}, {form.upazila}, {form.district}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">New Owner Details</h3>
                {transferDirection === 'to_me' ? (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Proposed New Owner</p>
                        <p className="text-sm font-medium">{form.proposedNewOwner || user?.name || 'Current user'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">NID Number</p>
                        <p className="text-sm font-medium">{form.proposedNewOwnerNid || 'N/A'}</p>
                      </div>
                    </div>
                    {step2Errors.proposedNewOwnerNid && <p className="mt-2 text-xs text-destructive">{step2Errors.proposedNewOwnerNid}</p>}
                  </div>
                ) : (
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
                    onLookup={() => void lookupNewOwnerByNid(form.proposedNewOwnerNid)}
                    error={step2Errors.proposedNewOwnerNid}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {transferDirection === 'to_me'
                  ? "Land details are filled from the selected property matched to the current owner's NID."
                  : 'Land details are filled from the selected property listed with your NID.'}
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
