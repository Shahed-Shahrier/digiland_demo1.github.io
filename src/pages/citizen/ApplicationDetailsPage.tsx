import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { addAuditLog, addNotification, downloadApplicationDocument, generateId, getApplicationById, respondToClarification } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { ApplicationTimeline } from '@/components/ApplicationTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileText, User, MapPin, Loader2 } from 'lucide-react';

export default function ApplicationDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [clarificationReply, setClarificationReply] = useState('');
  const [replying, setReplying] = useState(false);
  const [, setRefresh] = useState(0);
  const app = getApplicationById(id || '');

  if (!app) return <DashboardLayout><p className="text-muted-foreground">Application not found.</p></DashboardLayout>;
  const openClarification = [...app.clarifications].reverse().find(clarification => clarification.status === 'open');

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

  const handleClarificationReply = async () => {
    if (!user || !openClarification) return;
    if (!clarificationReply.trim()) {
      toast({ title: 'Reply Required', description: 'Write your clarification reply first.', variant: 'destructive' });
      return;
    }

    setReplying(true);
    const now = new Date().toISOString();
    try {
      await respondToClarification(app.id, openClarification.id, user.id, clarificationReply);
      await addAuditLog({
        id: generateId('log'),
        timestamp: now,
        actorName: user.name,
        actorRole: user.role,
        actionType: 'Clarification Response',
        applicationId: app.id,
        details: `Citizen replied to clarification for ${app.id}`,
      });

      const officerRecipientId = app.assignedOfficerId || openClarification.requestedById;
      if (officerRecipientId) {
        await addNotification({
          id: generateId('notif'),
          userId: officerRecipientId,
          title: 'Clarification Response Received',
          message: `${app.applicantName} replied to clarification for ${app.id}.`,
          type: 'info',
          read: false,
          applicationId: app.id,
          createdAt: now,
        });
      }

      setClarificationReply('');
      toast({ title: 'Reply Sent', description: 'Your clarification response has been sent to the land officer.' });
      setRefresh(refresh => refresh + 1);
    } catch (error) {
      toast({ title: 'Reply Failed', description: error instanceof Error ? error.message : 'Could not send clarification response.', variant: 'destructive' });
    } finally {
      setReplying(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-center gap-3">
        <div>
          <h1 className="page-title">{app.id}</h1>
          <p className="page-description">Submitted on {new Date(app.createdAt).toLocaleDateString()}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Applicant</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {app.applicantName}</div>
              <div><span className="text-muted-foreground">NID:</span> {app.applicantNid}</div>
              <div><span className="text-muted-foreground">Phone:</span> {app.applicantPhone}</div>
              <div><span className="text-muted-foreground">Email:</span> {app.applicantEmail}</div>
              <div className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {app.applicantAddress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Land & Transfer</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Plot:</span> {app.plotNumber}</div>
              <div><span className="text-muted-foreground">Holding:</span> {app.holdingNumber}</div>
              <div><span className="text-muted-foreground">Location:</span> {app.mouza}, {app.upazila}, {app.district}</div>
              <div><span className="text-muted-foreground">Land Size:</span> {app.landSize}</div>
              <div><span className="text-muted-foreground">Current Owner:</span> {app.currentOwner}</div>
              <div><span className="text-muted-foreground">New Owner:</span> {app.proposedNewOwner}</div>
              <div><span className="text-muted-foreground">Transfer Type:</span> {app.transferType}</div>
              <div><span className="text-muted-foreground">Deed Ref:</span> {app.deedReference}</div>
              <div className="sm:col-span-2"><span className="text-muted-foreground">Reason:</span> {app.reason}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</CardTitle></CardHeader>
            <CardContent>
              {app.documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents uploaded.</p> : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {app.documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <FileText className="h-8 w-8 text-primary shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{doc.documentType}</p>
                        <p className="text-xs text-muted-foreground">{doc.name} — {(doc.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!doc.filePath || doc.filePath.startsWith('metadata-only/') || openingDocumentId === doc.id}
                        onClick={() => void openDocument(doc.id)}
                      >
                        {openingDocumentId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open PDF'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          {app.comments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Officer Comments</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {app.comments.map(c => (
                  <div key={c.id} className="p-3 rounded-lg bg-muted">
                    <p className="text-sm">{c.comment}</p>
                    <p className="text-xs text-muted-foreground mt-1">— {c.authorName} ({c.authorRole}) • {new Date(c.createdAt).toLocaleString()}</p>
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
                    <p className="text-xs text-muted-foreground mt-1">— {v.officerName} • {new Date(v.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {app.clarifications.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Clarification Thread</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[...app.clarifications].reverse().map(clarification => (
                  <div key={clarification.id} className="rounded-lg border p-3 space-y-2">
                    <div>
                      <p className="text-sm font-medium">Officer Request</p>
                      <p className="text-sm">{clarification.requestMessage}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(clarification.requestedAt).toLocaleString()} • {clarification.status}</p>
                    </div>
                    {clarification.responseMessage && (
                      <div className="rounded-md bg-muted p-3">
                        <p className="text-sm">{clarification.responseMessage}</p>
                        <p className="text-xs text-muted-foreground mt-1">Your reply • {clarification.respondedAt ? new Date(clarification.respondedAt).toLocaleString() : ''}</p>
                      </div>
                    )}
                  </div>
                ))}

                {openClarification && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-sm font-medium">Reply to Latest Clarification</p>
                    <Textarea
                      placeholder="Write your clarification response..."
                      value={clarificationReply}
                      onChange={event => setClarificationReply(event.target.value)}
                    />
                    <Button type="button" onClick={() => void handleClarificationReply()} disabled={replying}>
                      {replying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Reply'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Status Timeline</CardTitle></CardHeader>
            <CardContent>
              <ApplicationTimeline application={app} />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
