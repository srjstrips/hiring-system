import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

const STATUS_STYLES: Record<string, string> = {
  NOT_SHARED: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-yellow-100 text-yellow-800',
  POSTED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REMOVED: 'bg-gray-100 text-gray-600',
  OPEN: 'bg-green-100 text-green-800',
  ON_HOLD: 'bg-amber-100 text-amber-800',
  CLOSED: 'bg-slate-100 text-slate-700',
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  APPLIED: 'bg-slate-100 text-slate-700',
  SCREENING: 'bg-blue-100 text-blue-800',
  SHORTLISTED: 'bg-violet-100 text-violet-800',
  INTERVIEW_ROUND_1: 'bg-orange-100 text-orange-800',
  INTERVIEW_ROUND_2: 'bg-amber-100 text-amber-800',
  HR_ROUND: 'bg-teal-100 text-teal-800',
  SELECTED: 'bg-emerald-100 text-emerald-800',
  OFFER_SENT: 'bg-indigo-100 text-indigo-800',
  OFFER_ACCEPTED: 'bg-green-100 text-green-800',
  JOINED: 'bg-green-200 text-green-900',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  BACKOUT: 'bg-rose-100 text-rose-800',
  RESCHEDULED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  NO_SHOW: 'bg-red-100 text-red-700',
  SENT: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-yellow-100 text-yellow-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  ONBOARDING: 'bg-blue-100 text-blue-800',
  NOT_JOINED: 'bg-red-100 text-red-800',
  ACTIVE: 'bg-green-100 text-green-800',
  NOTICE_PERIOD: 'bg-amber-100 text-amber-800',
  EXITED: 'bg-slate-100 text-slate-700',
  NOTICE_STARTED: 'bg-amber-100 text-amber-800',
  NOTICE_IN_PROGRESS: 'bg-orange-100 text-orange-800',
  NOTICE_COMPLETED: 'bg-slate-100 text-slate-700',
  EXITED_EARLY: 'bg-red-100 text-red-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
  SUSPENDED: 'bg-red-100 text-red-800',
};

function formatLabel(status: string) {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;
  return (
    <Badge
      variant="secondary"
      className={cn('font-medium border-0', STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground', className)}
    >
      {formatLabel(status)}
    </Badge>
  );
}
