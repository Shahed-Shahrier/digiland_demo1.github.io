import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApplicationById, changeApplicationStatus, addComment, addAuditLog, addNotification, generateId, updateApplication } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { ApplicationTimeline } from '@/components/ApplicationTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileText, User, MapPin } from 'lucide-react';
import { ApplicationStatus } from '@/types';

export default function ReviewApplicationPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [, setRefresh] = useState(0);

  const app = getApplicationById(id || '');
  if (!app || !user) return <DashboardLayout><p className="text-muted-foreground">Application not found.</p></DashboardLayout>;

  const doAction = (status: ApplicationStatus, label: string) => {
    const now = new Date().toISOString();
    changeApplicationStatus(app.id, status, user.name);
    if (comment) {
      addComment(app.id, { id: generateId('cmt'), applicationId: app.id, authorId: user.id, authorName: user.name, authorRole: user.role, comment, createdAt: now });
    }
    addAuditLog({ id: generateId('log'), timestamp: now, actorName: user.name, actorRole: user.role, actionType: label, applicationId: app.id, details: `${label}: ${app.id}` });
    addNotification({ id: generateId('notif'), userId: app.applicantId, title: label, message: `Your application ${app.id} status: ${status}`, type: status === 'Approved' ? 'success' : status === 'Rejected' ? 'error' : 'info', read: false, applicationId: app.id, createdAt: now });
    // Assign survey officer if moving to Under Review
    if (status === 'Under Review') {
      updateApplication(app.id, { assignedSurveyOfficerId: 'user-survey-1' });
      addNotification({ id: generateId('notif'), userId: 'user-survey-1', title: 'Verification Assigned', message: `You have been assigned to verify ${app.id}.`, type: 'info', read: false, applicationId: app.id, createdAt: now });
    }
    setComment('');
    toast({ title: label, description: `Application ${app.id} updated.` });
    setRefresh(r => r + 1);
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-center gap-3">
        <div><h1 className="page-title">{app.id}</h1><p className="page-description">{app.applicantName}</p></div>
        <StatusBadge status={app.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Applicant</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {app.applicantName}</div>
              <div><span className="text-muted-foreground">NID:</span> {app.applicantNid}</div>
              <div><span className="text-muted-foreground">Phone:</span> {app.applicantPhone}</div>
              <div><span className="text-muted-foreground">Email:</span> {app.applicantEmail}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Land Info</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Plot:</span> {app.plotNumber}</div>
              <div><span className="text-muted-foreground">Holding:</span> {app.holdingNumber}</div>
              <div><span className="text-muted-foreground">Location:</span> {app.mouza}, {app.upazila}, {app.district}</div>
              <div><span className="text-muted-foreground">Size:</span> {app.landSize}</div>
              <div><span className="text-muted-foreground">Current Owner:</span> {app.currentOwner}</div>
              <div><span className="text-muted-foreground">Proposed Owner:</span> {app.proposedNewOwner}</div>
              <div><span className="text-muted-foreground">Transfer:</span> {app.transferType}</div>
              <div><span className="text-muted-foreground">Deed Ref:</span> {app.deedReference}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {app.documents.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <FileText className="h-8 w-8 text-primary shrink-0" />
                    <div><p className="text-sm font-medium">{d.documentType}</p><p className="text-xs text-muted-foreground">{d.name} — {(d.size / 1024).toFixed(0)} KB</p></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          {app.comments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Comments</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {app.comments.map(c => (
                  <div key={c.id} className="p-3 rounded-lg bg-muted">
                    <p className="text-sm">{c.comment}</p>
                    <p className="text-xs text-muted-foreground mt-1">— {c.authorName} • {new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {app.verificationNotes.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Verification Notes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {app.verificationNotes.map(v => (
                  <div key={v.id} className="p-3 rounded-lg bg-muted">
                    <p className="text-sm">{v.findings}</p>
                    <p className="text-xs text-muted-foreground mt-1">— {v.officerName} • Verified: {v.isVerified ? 'Yes' : 'No'}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader><CardTitle>Take Action</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea placeholder="Add a comment (optional)..." value={comment} onChange={e => setComment(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                {app.status === 'Pending' && <Button onClick={() => doAction('Under Review', 'Status Change')}>Start Review</Button>}
                {(app.status === 'Under Review' || app.status === 'Verified') && (
                  <>
                    <Button onClick={() => doAction('Approved', 'Approval')}>Approve</Button>
                    <Button variant="destructive" onClick={() => doAction('Rejected', 'Rejection')}>Reject</Button>
                  </>
                )}
                {app.status !== 'Approved' && app.status !== 'Rejected' && (
                  <Button variant="outline" onClick={() => doAction('Clarification Requested', 'Clarification Request')}>Request Clarification</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><CardContent><ApplicationTimeline application={app} /></CardContent></Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
