import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Users, Calendar, Gift, UserPlus, Clock, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SummaryCards } from '@/components/common/SummaryCards';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi } from '@/api/dashboard';
import { format } from 'date-fns';

const PIPELINE_COLORS: Record<string, string> = {
  APPLIED: 'bg-slate-500',
  SCREENING: 'bg-[#FFF7ED]0',
  SHORTLISTED: 'bg-violet-500',
  INTERVIEW_ROUND_1: 'bg-orange-500',
  INTERVIEW_ROUND_2: 'bg-amber-500',
  HR_ROUND: 'bg-teal-500',
  SELECTED: 'bg-green-500',
  OFFER_SENT: 'bg-emerald-500',
  OFFER_ACCEPTED: 'bg-green-600',
  JOINED: 'bg-green-700',
  REJECTED: 'bg-red-400',
  WITHDRAWN: 'bg-gray-400',
  ON_HOLD: 'bg-yellow-500',
};

function formatStage(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: summaryRes, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary(),
  });

  const { data: pipelineRes } = useQuery({
    queryKey: ['dashboard-pipeline'],
    queryFn: () => dashboardApi.getPipeline(),
  });

  const { data: interviewsRes } = useQuery({
    queryKey: ['dashboard-upcoming-interviews'],
    queryFn: () => dashboardApi.getUpcomingInterviews(),
  });

  const summary = summaryRes?.data ?? {};
  const pipeline: Array<{ status: string; count: number }> = pipelineRes?.data ?? [];
  const upcoming = interviewsRes?.data ?? [];
  const pipelineTotal = pipeline.reduce((s, p) => s + p.count, 0) || 1;

  const cards = [
    {
      label: 'Open Positions',
      value: summaryLoading ? '—' : (summary.openPositions ?? 0),
      icon: Briefcase,
      color: 'text-[#FF6B00]',
      bg: 'bg-[#FFF7ED]',
      trend: summary.openPositionsTrend ?? 'View details',
      onClick: () => navigate('/dashboard/open-positions'),
    },
    {
      label: 'Total Applications',
      value: summaryLoading ? '—' : (summary.totalApplications ?? 0),
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-[#F5F3FF]',
      trend: summary.applicationsTrend ?? 'View analytics',
      onClick: () => navigate('/dashboard/applications'),
    },
    {
      label: 'Interviews Scheduled',
      value: summaryLoading ? '—' : (summary.interviewsScheduled ?? 0),
      icon: Calendar,
      color: 'text-[#FF6B00]',
      bg: 'bg-[#FFF7ED]',
      trend: summary.interviewsTrend ?? 'View interviews',
      onClick: () => navigate('/dashboard/interviews'),
    },
    {
      label: 'Offers Sent',
      value: summaryLoading ? '—' : (summary.offersSent ?? 0),
      icon: Gift,
      color: 'text-green-600',
      bg: 'bg-[#F0FDF4]',
      trend: summary.offersTrend ?? 'View offers',
      onClick: () => navigate('/dashboard/offers'),
    },
    {
      label: 'Pending Requisitions',
      value: summaryLoading ? '—' : (summary.pendingRequisitions ?? 0),
      icon: UserPlus,
      color: 'text-rose-500',
      bg: 'bg-[#FFF1F2]',
      trend: summary.requisitionsTrend ?? 'View requisitions',
      onClick: () => navigate('/dashboard/requisitions'),
    },
    {
      label: 'Avg. Time to Hire',
      value: summaryLoading ? '—' : `${summary.avgTimeToHireDays ?? 0}d`,
      icon: Clock,
      color: 'text-teal-600',
      bg: 'bg-[#F0FDFA]',
      trend: summary.timeToHireTrend ?? 'View analytics',
      onClick: () => navigate('/dashboard/time-to-hire'),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-[1.75rem]">
          Good {getTimeGreeting()}, {user?.firstName}!
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Click any card to open operational reports for your hiring scope.
        </p>
      </div>

      <SummaryCards items={cards} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <Card className="rounded-xl border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
            <CardTitle className="text-base font-semibold text-[#111827]">Candidate Pipeline</CardTitle>
            <Link to="/dashboard/applications" className="text-sm font-medium text-[#FF6B00] hover:underline">
              View analytics
            </Link>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {pipeline.length === 0 ? (
              <p className="text-sm text-[#64748B]">No application data yet.</p>
            ) : (
              <div className="space-y-4">
                {pipeline.map((stage) => {
                  const pct = Math.round((stage.count / pipelineTotal) * 100);
                  return (
                    <div key={stage.status} className="flex items-center gap-3 sm:gap-4">
                      <span className="w-[7.5rem] shrink-0 text-xs font-medium uppercase tracking-wide text-[#64748B] sm:w-40">
                        {formatStage(stage.status)}
                      </span>
                      <div className="h-1.5 flex-1 rounded-full bg-[#F1F5F9]">
                        <div
                          className={`h-1.5 rounded-full ${PIPELINE_COLORS[stage.status] ?? 'bg-slate-400'}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-sm font-semibold text-[#111827]">{stage.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
            <CardTitle className="text-base font-semibold text-[#111827]">Upcoming Interviews</CardTitle>
            <Link to="/dashboard/interviews" className="text-sm font-medium text-[#FF6B00] hover:underline">
              All
            </Link>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF7ED]">
                  <Calendar className="h-5 w-5 text-[#FF6B00]" />
                </div>
                <p className="text-sm font-semibold text-[#111827]">No upcoming interviews.</p>
                <p className="mt-1 text-sm text-[#64748B]">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcoming.map((item: any) => (
                  <div key={item.id} className="flex flex-col gap-1 border-b border-[#E2E8F0] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-none text-[#111827]">
                        {item.application?.candidate?.firstName} {item.application?.candidate?.lastName}
                      </p>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {item.interviewType?.name ?? item.title ?? `Round ${item.round}`}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#64748B]">{item.application?.job?.title}</p>
                    <p className="text-xs font-medium text-[#FF6B00]">
                      {item.scheduledAt ? format(new Date(item.scheduledAt), 'PPp') : '—'}
                      {item.mode === 'IN_PERSON' ? ' · In person' : ' · Video'}
                    </p>
                    {(item.meetingToken || item.meetingLink) && item.mode !== 'IN_PERSON' && (
                      <a
                        href={item.meetingToken ? `/interview/call/${item.meetingToken}?as=hr` : item.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#FF6B00] hover:underline"
                      >
                        <Video className="h-3 w-3" /> Join video call
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
