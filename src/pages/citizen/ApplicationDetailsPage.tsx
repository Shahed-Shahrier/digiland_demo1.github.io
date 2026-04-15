import { useParams } from 'react-router-dom';
import { getApplicationById } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { ApplicationTimeline } from '@/components/ApplicationTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, User, MapPin, ArrowRight } from 'lucide-react';

export default function ApplicationDetailsPage() {
  const { id } = useParams();
  const app = getApplicationById(id || '');

  if (!app) return <DashboardLayout><p className="text-muted-foreground">Application not found.</p></DashboardLayout>;

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
                      <div>
                        <p className="text-sm font-medium">{doc.documentType}</p>
                        <p className="text-xs text-muted-foreground">{doc.name} — {(doc.size / 1024).toFixed(0)} KB</p>
                      </div>
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
