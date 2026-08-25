import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '@/api/applications';
import { pipelineStagesApi } from '@/api/pipeline-stages';
import type { PipelineStage } from '@/api/pipeline-stages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { Eye, Search, FileText, Star, Mail, Briefcase, Clock, Calendar, Users, Lock } from 'lucide-react';
import { isStageLocked } from '@/utils/applicationStages';

function stageBadgeStyle(stage: PipelineStage | undefined): React.CSSProperties {
  if (!stage) return { backgroundColor: '#F1F5F9', color: '#64748B' };
  const hex = stage.color || '#6b7280';
  return { backgroundColor: hex + '22', color: hex };
}

function getSelectableFromStages(
  currentStatus: string,
  timeline: Array<{ toStatus: string }>,
  stages: PipelineStage[],
): string[] {
  if (isStageLocked(currentStatus)) return [];
  const pipeline = stages.filter((s) => s.isActive && !['REJECTED', 'WITHDRAWN', 'ON_HOLD'].includes(s.key))
    .sort((a, b) => a.stageOrder - b.stageOrder);
  const currentIdx = pipeline.findIndex((s) => s.key === currentStatus);
  const effectiveIdx = currentIdx >= 0
    ? currentIdx
    : (() => {
        if (currentStatus === 'ON_HOLD') {
          for (let i = timeline.length - 1; i >= 0; i--) {
            const idx = pipeline.findIndex((s) => s.key === timeline[i]!.toStatus);
            if (idx >= 0) return idx;
          }
        }
        return -1;
      })();
  const forward = pipeline.filter((_, i) => i > effectiveIdx).map((s) => s.key);
  const outcomes = ['REJECTED', 'WITHDRAWN', 'ON_HOLD'].filter((s) => s !== currentStatus);
  return [...forward, ...outcomes];
}

const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

export default function ApplicationsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get('jobId')?.trim() || undefined;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [movingId, setMovingId] = useState<string | null>(null);

  // When switching Job Opening context, clear stage/search so filters stay scoped correctly.
  useEffect(() => {
    setStatus('');
    setSearch('');
    setMovingId(null);
  }, [jobId]);

  const listParams = {
    jobId,
    status: status || undefined,
    search: search || undefined,
    limit: 50,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['applications', jobId ?? null, status || null, search || null],
    queryFn: () => applicationsApi.getAll(listParams).then((r) => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['pipeline-stats', jobId ?? null],
    queryFn: () => applicationsApi.getPipelineStats(jobId).then((r) => r.data.data),
  });

  const { data: stagesData } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => pipelineStagesApi.getAll().then((r) => r.data.data),
    staleTime: 60_000,
  });
  const stages = stagesData ?? [];
  const stageMap = Object.fromEntries(stages.map((s) => [s.key, s]));

  const statusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      applicationsApi.updateStatus(id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      setMovingId(null);
      toast({ title: 'Status updated' });
    },
  });

  // Defensive: only show applications belonging to the selected Job Opening when jobId is present.
  const apps = (data?.data ?? []).filter((app) => !jobId || app.job.id === jobId);

  // First 5 active pipeline stages + REJECTED for the summary strip
  const pipelineSorted = stages.filter((s) => s.isActive && !['REJECTED', 'WITHDRAWN', 'ON_HOLD'].includes(s.key))
    .sort((a, b) => a.stageOrder - b.stageOrder);
  const SUMMARY_STAGES = [...pipelineSorted.slice(0, 5).map((s) => s.key), 'REJECTED'];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Applications</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          {data?.total ?? 0} total application{(data?.total ?? 0) === 1 ? '' : 's'}
        </p>
      </div>

      {statsData && SUMMARY_STAGES.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SUMMARY_STAGES.map((s) => {
            const count = statsData.find((x) => x.status === s)?.count ?? 0;
            const stage = stageMap[s];
            const color = stage?.color ?? '#6b7280';
            const isActive = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(status === s ? '' : s)}
                className="rounded-xl border bg-white px-3 py-4 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:shadow-md"
                style={isActive ? { borderColor: color + '66', backgroundColor: color + '15' } : { borderColor: '#E2E8F0' }}
              >
                <div className="text-2xl font-bold leading-none" style={{ color: isActive ? color : '#111827' }}>
                  {count}
                </div>
                <div className="mt-2 text-[11px] font-medium uppercase tracking-wide leading-tight"
                  style={{ color: isActive ? color : '#64748B' }}>
                  {stage?.label ?? s.replace(/_/g, ' ')}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Search candidates..."
            className="h-10 rounded-xl border-[#E2E8F0] bg-white pl-9 text-[#111827] placeholder:text-[#94A3B8] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/25 focus-visible:ring-offset-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full shrink-0 sm:w-56">
          <select
            className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#111827] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Stages</option>
            {stages.sort((a, b) => a.stageOrder - b.stageOrder).map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[#64748B]">Loading...</div>
      ) : apps.length === 0 ? (
        <Card className={cardClass}>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF7ED]">
              <Users className="h-5 w-5 text-[#FF6B00]" />
            </div>
            <p className="font-semibold text-[#111827]">No applications found</p>
            <p className="mt-1 text-sm text-[#64748B]">Try a different search or stage filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <Card
              key={app.id}
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/applications/${app.id}`, { state: { filterJobId: jobId } })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/applications/${app.id}`, { state: { filterJobId: jobId } });
                }
              }}
              className={`${cardClass} cursor-pointer transition-shadow hover:shadow-md`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#111827]">
                        {app.candidate.firstName} {app.candidate.lastName}
                      </h3>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={stageBadgeStyle(stageMap[app.status])}>
                        {stageMap[app.status]?.label ?? app.status.replace(/_/g, ' ')}
                      </span>
                      {app.assessmentAttempt?.submittedAt && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#FF6B00]/30 bg-[#FFF7ED] px-2.5 py-0.5 text-xs font-medium text-[#FF6B00]">
                          <Star className="h-3 w-3" />
                          Score: {app.assessmentAttempt.score}%
                          {app.assessmentAttempt.isPassed ? ' ✓' : ' ✗'}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#64748B]">
                      <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {app.candidate.email}</span>
                      {app.candidate.currentCompany && (
                        <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {app.candidate.currentCompany}</span>
                      )}
                      {app.source?.name && <span>{app.source.name}</span>}
                      {app.candidate.totalExperience !== undefined && (
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {app.candidate.totalExperience}y experience</span>
                      )}
                      {app.candidate.noticePeriodDays !== undefined && <span>{app.candidate.noticePeriodDays}d notice</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> Applied {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#64748B]">{app.job.title} · {app.job.department.name}</p>
                  </div>
                  <div
                    className="flex shrink-0 items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {app.candidate.resumeUrl && (
                      <Button variant="ghost" size="icon" title="View Resume" className="h-9 w-9 text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]" asChild>
                        <a href={app.candidate.resumeUrl} target="_blank" rel="noreferrer">
                          <FileText className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="View" className="h-9 w-9 text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]" asChild>
                      <Link to={`/applications/${app.id}`} state={{ filterJobId: jobId }}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    {movingId === app.id ? (
                      isStageLocked(app.status) ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                          <Lock className="h-3.5 w-3.5" /> Locked
                          <Button variant="ghost" size="sm" className="text-[#64748B]" onClick={() => setMovingId(null)}>✕</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <select
                            className="h-9 rounded-xl border border-[#E2E8F0] bg-white px-2 text-xs text-[#111827]"
                            defaultValue=""
                            onChange={(e) => e.target.value && statusMutation.mutate({ id: app.id, newStatus: e.target.value })}
                          >
                            <option value="" disabled>Move to...</option>
                            {getSelectableFromStages(app.status, app.timeline, stages).map((s) => (
                              <option key={s} value={s}>{stageMap[s]?.label ?? s.replace(/_/g, ' ')}</option>
                            ))}
                          </select>
                          <Button variant="ghost" size="sm" className="text-[#64748B]" onClick={() => setMovingId(null)}>✕</Button>
                        </div>
                      )
                    ) : (
                      <Button variant="outline" size="sm" className="h-9 rounded-xl border-[#E2E8F0]" onClick={() => setMovingId(app.id)}>
                        Move Stage
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
