import { Application } from '@/types';
import { CheckCircle2, Circle, Clock, AlertCircle, XCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusSteps = [
  { status: 'Pending', icon: Clock, label: 'Submitted' },
  { status: 'Under Review', icon: Circle, label: 'Under Review' },
  { status: 'Clarification Requested', icon: AlertCircle, label: 'Clarification' },
  { status: 'Verified', icon: ShieldCheck, label: 'Verified' },
  { status: 'Approved', icon: CheckCircle2, label: 'Approved' },
  { status: 'Rejected', icon: XCircle, label: 'Rejected' },
];

export function ApplicationTimeline({ application }: { application: Application }) {
  const history = application.statusHistory;

  return (
    <div className="space-y-4">
      {history.map((entry, i) => {
        const step = statusSteps.find(s => s.status === entry.status);
        const Icon = step?.icon || Circle;
        const isLast = i === history.length - 1;
        return (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                isLast ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              {i < history.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium">{step?.label || entry.status}</p>
              <p className="text-xs text-muted-foreground">by {entry.actor}</p>
              <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
