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
  SCREENING: 'bg-blue-500',
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
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      trend: summary.openPositionsTrend ?? 'View details',
      onClick: () => navigate('/dashboard/open-positions'),
    },
    {
      label: 'Total Applications',
      value: summaryLoading ? '—' : (summary.totalApplications ?? 0),
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      trend: summary.applicationsTrend ?? 'View analytics',
      onClick: () => navigate('/dashboard/applications'),
    },
    {
      label: 'Interviews Scheduled',
      value: summaryLoading ? '—' : (summary.interviewsScheduled ?? 0),
      icon: Calendar,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      trend: summary.interviewsTrend ?? 'View interviews',
      onClick: () => navigate('/dashboard/interviews'),
    },
    {
      label: 'Offers Sent',
      value: summaryLoading ? '—' : (summary.offersSent ?? 0),
      icon: Gift,
      color: 'text-green-600',
      bg: 'bg-green-50',
      trend: summary.offersTrend ?? 'View offers',
      onClick: () => navigate('/dashboard/offers'),
    },
    {
      label: 'Pending Requisitions',
      value: summaryLoading ? '—' : (summary.pendingRequisitions ?? 0),
      icon: UserPlus,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      trend: summary.requisitionsTrend ?? 'View requisitions',
      onClick: () => navigate('/dashboard/requisitions'),
    },
    {
      label: 'Avg. Time to Hire',
      value: summaryLoading ? '—' : `${summary.avgTimeToHireDays ?? 0}d`,
      icon: Clock,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      trend: summary.timeToHireTrend ?? 'View analytics',
      onClick: () => navigate('/dashboard/time-to-hire'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Good {getTimeGreeting()}, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Click any card to open operational reports for your hiring scope.
        </p>
      </div>

      <SummaryCards items={cards} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Candidate Pipeline</CardTitle>
            <Link to="/dashboard/applications" className="text-xs text-blue-600 hover:underline">
              View analytics
            </Link>
          </CardHeader>
          <CardContent>
            {pipeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No application data yet.</p>
            ) : (
              <div className="space-y-3">
                {pipeline.map((stage) => {
                  const pct = Math.round((stage.count / pipelineTotal) * 100);
                  return (
                    <div key={stage.status} className="flex items-center gap-3">
                      <span className="w-28 text-sm text-muted-foreground shrink-0">
                        {formatStage(stage.status)}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${PIPELINE_COLORS[stage.status] ?? 'bg-slate-400'}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-medium">{stage.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Upcoming Interviews</CardTitle>
            <Link to="/dashboard/interviews" className="text-xs text-blue-600 hover:underline">
              All
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming interviews.</p>
            ) : (
              upcoming.map((item: any) => (
                <div key={item.id} className="flex flex-col gap-1 pb-3 border-b last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-none">
                      {item.application?.candidate?.firstName} {item.application?.candidate?.lastName}
                    </p>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {item.interviewType?.name ?? item.title ?? `Round ${item.round}`}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.application?.job?.title}</p>
                  <p className="text-xs text-blue-600 font-medium">
                    {item.scheduledAt ? format(new Date(item.scheduledAt), 'PPp') : '—'}
                    {item.mode === 'IN_PERSON' ? ' · In person' : ' · Video'}
                  </p>
                  {item.meetingLink && item.mode !== 'IN_PERSON' && (
                    <a
                      href={item.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Video className="h-3 w-3" /> Join video call
                    </a>
                  )}
                </div>
              ))
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
