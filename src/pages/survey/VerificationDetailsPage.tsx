import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApplicationById, addVerificationNote, changeApplicationStatus, addAuditLog, addNotification, generateId } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MapPin, FileText } from 'lucide-react';

export default function VerificationDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [findings, setFindings] = useState('');
  const [, setRefresh] = useState(0);

  const app = getApplicationById(id || '');
  if (!app || !user) return <DashboardLayout><p className="text-muted-foreground">Case not found.</p></DashboardLayout>;

  const alreadyVerified = app.verificationNotes.some(v => v.isVerified);

  const handleVerify = () => {
    const now = new Date().toISOString();
    addVerificationNote(app.id, { id: generateId('vn'), applicationId: app.id, officerId: user.id, officerName: user.name, findings, isVerified: true, createdAt: now });
    changeApplicationStatus(app.id, 'Verified', user.name);
    addAuditLog({ id: generateId('log'), timestamp: now, actorName: user.name, actorRole: user.role, actionType: 'Verification', applicationId: app.id, details: `Land verification completed for ${app.id}` });
    addNotification({ id: generateId('notif'), userId: app.applicantId, title: 'Verification Complete', message: `Land verification for ${app.id} is complete.`, type: 'info', read: false, applicationId: app.id, createdAt: now });
    addNotification({ id: generateId('notif'), userId: 'user-officer-1', title: 'Verification Complete', message: `${app.id} has been verified by survey officer.`, type: 'info', read: false, applicationId: app.id, createdAt: now });
    setFindings('');
    toast({ title: 'Verification Complete', description: `Case ${app.id} marked as verified.` });
    setRefresh(r => r + 1);
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-center gap-3">
        <div><h1 className="page-title">{app.id}</h1><p className="page-description">Verification Details</p></div>
        <StatusBadge status={app.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Land Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Plot:</span> {app.plotNumber}</p>
            <p><span className="text-muted-foreground">Holding:</span> {app.holdingNumber}</p>
            <p><span className="text-muted-foreground">Location:</span> {app.mouza}, {app.upazila}, {app.district}</p>
            <p><span className="text-muted-foreground">Size:</span> {app.landSize}</p>
            <p><span className="text-muted-foreground">Current Owner:</span> {app.currentOwner}</p>
            <p><span className="text-muted-foreground">Proposed Owner:</span> {app.proposedNewOwner}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {app.documents.map(d => (
                <div key={d.id} className="flex items-center gap-3 p-2 rounded border">
                  <FileText className="h-5 w-5 text-primary" />
                  <div><p className="text-sm">{d.documentType}</p><p className="text-xs text-muted-foreground">{d.name}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {app.verificationNotes.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Previous Verification Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {app.verificationNotes.map(v => (
                <div key={v.id} className="p-3 rounded-lg bg-muted">
                  <p className="text-sm">{v.findings}</p>
                  <p className="text-xs text-muted-foreground mt-1">— {v.officerName} • {new Date(v.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!alreadyVerified && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Submit Verification</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea placeholder="Enter your verification findings..." value={findings} onChange={e => setFindings(e.target.value)} rows={4} />
              <Button onClick={handleVerify} disabled={!findings.trim()}>Mark as Verified</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
