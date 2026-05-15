import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  addAuditLog,
  addComment,
  addNotification,
  assignSurveyOfficer,
  changeApplicationStatus,
  downloadApplicationDocument,
  generateId,
  getApplicationById,
  getSurveyOfficers,
  refreshAppData,
  requestClarification,
} from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { ApplicationTimeline } from '@/components/ApplicationTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, User, MapPin, Loader2 } from 'lucide-react';
import { ApplicationStatus } from '@/types';

export default function ReviewApplicationPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [selectedSurveyOfficerId, setSelectedSurveyOfficerId] = useState('');
  const [assigningSurveyOfficer, setAssigningSurveyOfficer] = useState(false);
  const [, setRefresh] = useState(0);

  const app = getApplicationById(id || '');

  useEffect(() => {
    void refreshAppData().then(() => setRefresh(refresh => refresh + 1));
  }, [id]);

  useEffect(() => {
    setSelectedSurveyOfficerId(app?.assignedSurveyOfficerId || '');
  }, [app?.assignedSurveyOfficerId]);

  if (!app || !user) return <DashboardLayout><p className="text-muted-foreground">Application not found.</p></DashboardLayout>;

  const surveyOfficers = getSurveyOfficers();
  const openClarification = [...app.clarifications].reverse().find(clarification => clarification.status === 'open');
  const hasPassedVerification = app.verificationNotes.some(note => note.isVerified);

  const doAction = async (status: ApplicationStatus, label: string) => {
    const now = new Date().toISOString();
    try {
      if (status === 'Clarification Requested') {
        if (!comment.trim()) {
          toast({ title: 'Clarification Message Required', description: 'Write what the citizen must clarify first.', variant: 'destructive' });
          return;
        }
        await requestClarification(app.id, user.id, comment);
      }

      await changeApplicationStatus(app.id, status, user.name);

      if (comment) {
        await addComment(app.id, { id: generateId('cmt'), applicationId: app.id, authorId: user.id, authorName: user.name, authorRole: user.role, comment, createdAt: now });
      }

      await addAuditLog({ id: generateId('log'), timestamp: now, actorName: user.name, actorRole: user.role, actionType: label, applicationId: app.id, details: `${label}: ${app.id}` });
      await addNotification({ id: generateId('notif'), userId: app.applicantId, title: label, message: `Your application ${app.id} status: ${status}`, type: status === 'Approved' ? 'success' : status === 'Rejected' ? 'error' : 'info', read: false, applicationId: app.id, createdAt: now });

      setComment('');
      toast({ title: label, description: `Application ${app.id} updated.` });
      setRefresh(r => r + 1);
    } catch (error) {
      toast({ title: `${label} Failed`, description: error instanceof Error ? error.message : 'Could not update application', variant: 'destructive' });
    }
  };

  const handleAssignSurveyOfficer = async () => {
    if (!selectedSurveyOfficerId) {
      toast({ title: 'Survey Officer Required', description: 'Select a survey officer first.', variant: 'destructive' });
      return;
    }

    const selectedOfficer = surveyOfficers.find(officer => officer.id === selectedSurveyOfficerId);
    if (!selectedOfficer) {
      toast({ title: 'Invalid Survey Officer', description: 'Selected survey officer could not be found.', variant: 'destructive' });
      return;
    }

    setAssigningSurveyOfficer(true);
    try {
      const now = new Date().toISOString();
      const nextStatus = app.status === 'Pending' || app.status === 'Clarification Requested' ? 'Under Review' : app.status;

      await assignSurveyOfficer(app.id, selectedSurveyOfficerId, user.id);
      if (nextStatus === 'Under Review' && app.status !== 'Under Review') {
        await changeApplicationStatus(app.id, 'Under Review', user.name);
      }

      await addAuditLog({
        id: generateId('log'),
        timestamp: now,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'Survey Assignment',
        applicationId: app.id,
        details: `Assigned ${selectedOfficer.name} to verify ${app.id}`,
      });
      await addNotification({
        id: generateId('notif'),
        userId: selectedOfficer.id,
        title: 'Verification Assigned',
        message: `You have been assigned to verify ${app.id}.`,
        type: 'info',
        read: false,
        applicationId: app.id,
        createdAt: now,
      });
      await addNotification({
        id: generateId('notif'),
        userId: app.applicantId,
        title: 'Survey Verification Assigned',
        message: `A survey officer has been assigned to ${app.id}.`,
        type: 'info',
        read: false,
        applicationId: app.id,
        createdAt: now,
      });

      toast({ title: 'Survey Officer Assigned', description: `${selectedOfficer.name} can now verify this case.` });
      setRefresh(refresh => refresh + 1);
    } catch (error) {
      toast({ title: 'Assignment Failed', description: error instanceof Error ? error.message : 'Could not assign survey officer.', variant: 'destructive' });
    } finally {
      setAssigningSurveyOfficer(false);
    }
  };

  const openDocument = async (documentId: string) => {
    const document = app.documents.find(item => item.id === documentId);
    if (!document) return;

    setOpeningDocumentId(documentId);
    try {
      const blob = await downloadApplicationDocument(document);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      toast({
        title: 'Document Open Failed',
        description: error instanceof Error ? error.message : 'Could not open this PDF file.',
        variant: 'destructive',
      });
    } finally {
      setOpeningDocumentId(null);
    }
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
                    <div className="flex-1"><p className="text-sm font-medium">{d.documentType}</p><p className="text-xs text-muted-foreground">{d.name} — {(d.size / 1024).toFixed(0)} KB</p></div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!d.filePath || d.filePath.startsWith('metadata-only/') || openingDocumentId === d.id}
                      onClick={() => void openDocument(d.id)}
                    >
                      {openingDocumentId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open PDF'}
                    </Button>
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

          <Card>
            <CardHeader><CardTitle>Survey Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Current survey officer: {app.assignedSurveyOfficerName || 'Not assigned'}
              </div>
              <Select value={selectedSurveyOfficerId} onValueChange={setSelectedSurveyOfficerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select survey officer" />
                </SelectTrigger>
                <SelectContent>
                  {surveyOfficers.map(officer => (
                    <SelectItem key={officer.id} value={officer.id}>{officer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={() => void handleAssignSurveyOfficer()} disabled={assigningSurveyOfficer || surveyOfficers.length === 0}>
                {assigningSurveyOfficer ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : app.assignedSurveyOfficerId ? 'Reassign Survey Officer' : 'Assign Survey Officer'}
              </Button>
            </CardContent>
          </Card>

          {app.clarifications.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Clarifications</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[...app.clarifications].reverse().map(clarification => (
                  <div key={clarification.id} className="rounded-lg border p-3 space-y-2">
                    <p className="text-sm font-medium">{clarification.requestedByName}</p>
                    <p className="text-sm">{clarification.requestMessage}</p>
                    <p className="text-xs text-muted-foreground">{new Date(clarification.requestedAt).toLocaleString()} • {clarification.status}</p>
                    {clarification.responseMessage && (
                      <div className="rounded-md bg-muted p-3">
                        <p className="text-sm">{clarification.responseMessage}</p>
                        <p className="text-xs text-muted-foreground mt-1">Reply by {clarification.respondedByName || 'Citizen'} • {clarification.respondedAt ? new Date(clarification.respondedAt).toLocaleString() : 'Pending'}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader><CardTitle>Take Action</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={openClarification ? 'Add review note or enter a new clarification request...' : 'Add review note or clarification message...'}
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {app.status === 'Verified' && hasPassedVerification && (
                  <>
                    <Button onClick={() => doAction('Approved', 'Approval')}>Approve</Button>
                    <Button variant="destructive" onClick={() => doAction('Rejected', 'Rejection')}>Reject</Button>
                  </>
                )}
                {app.status !== 'Approved' && app.status !== 'Rejected' && app.status !== 'Verified' && (
                  <Button variant="outline" onClick={() => doAction('Rejected', 'Rejection')}>Reject</Button>
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
