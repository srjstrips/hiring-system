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
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  APPLIED: 'bg-slate-100 text-slate-700',
  SCREENING: 'bg-[#FFEDD5] text-[#C2410C]',
  PERSONALITY_ASSESSMENT: 'bg-amber-100 text-amber-800',
  DEPT_WORKING_TEST: 'bg-orange-100 text-orange-800',
  HOD_HR_INTERVIEW: 'bg-cyan-100 text-cyan-800',
  DIRECTOR_INTERVIEW: 'bg-indigo-100 text-indigo-800',
  SHORTLISTED: 'bg-violet-100 text-violet-800',
  DOCUMENT_VERIFICATION: 'bg-teal-100 text-teal-800',
  OFFER_LETTER: 'bg-[#FFEDD5] text-[#C2410C]',
  OFFER_ACCEPTED: 'bg-green-100 text-green-800',
  OFFER_DECLINED: 'bg-rose-100 text-rose-800',
  VERIFICATION_COMPLETED: 'bg-emerald-100 text-emerald-800',
  VERIFICATION_FAILED: 'bg-red-100 text-red-700',
  JOINING: 'bg-green-200 text-green-900',
  DID_NOT_JOIN: 'bg-red-100 text-red-800',
  POSITION_CLOSED: 'bg-stone-100 text-stone-700',
  CANDIDATE_UNRESPONSIVE: 'bg-gray-100 text-gray-600',
  // Legacy stage keys kept for old candidate records
  INTERVIEW_ROUND_1: 'bg-orange-100 text-orange-800',
  INTERVIEW_ROUND_2: 'bg-amber-100 text-amber-800',
  HR_ROUND: 'bg-teal-100 text-teal-800',
  SELECTED: 'bg-emerald-100 text-emerald-800',
  OFFER_SENT: 'bg-[#FFEDD5] text-[#C2410C]',
  JOINED: 'bg-green-200 text-green-900',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-[#FFEDD5] text-[#C2410C]',
  COMPLETED: 'bg-green-100 text-green-800',
  BACKOUT: 'bg-rose-100 text-rose-800',
  RESCHEDULED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  NO_SHOW: 'bg-red-100 text-red-700',
  SENT: 'bg-[#FFEDD5] text-[#C2410C]',
  ACCEPTED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-yellow-100 text-yellow-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  ONBOARDING: 'bg-[#FFEDD5] text-[#C2410C]',
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
