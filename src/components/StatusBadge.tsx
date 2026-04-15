import { ApplicationStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig: Record<ApplicationStatus, { className: string; label: string }> = {
  'Pending': { className: 'badge-pending', label: 'Pending' },
  'Under Review': { className: 'badge-review', label: 'Under Review' },
  'Clarification Requested': { className: 'badge-pending', label: 'Clarification' },
  'Verified': { className: 'badge-verified', label: 'Verified' },
  'Approved': { className: 'badge-approved', label: 'Approved' },
  'Rejected': { className: 'badge-rejected', label: 'Rejected' },
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = statusConfig[status];
  return <Badge variant="outline" className={cn('font-medium', config.className)}>{config.label}</Badge>;
}
