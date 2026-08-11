import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '@/api/applications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import { Eye, Search, FileText, Star } from 'lucide-react';

const STAGES = [
  'APPLIED', 'SCREENING', 'SHORTLISTED',
  'INTERVIEW_ROUND_1', 'INTERVIEW_ROUND_2', 'HR_ROUND',
  'SELECTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'JOINED',
  'REJECTED', 'WITHDRAWN', 'ON_HOLD',
];

const stageColors: Record<string, string> = {
  APPLIED: 'secondary', SCREENING: 'secondary', SHORTLISTED: 'default',
  INTERVIEW_ROUND_1: 'default', INTERVIEW_ROUND_2: 'default', HR_ROUND: 'default',
  SELECTED: 'default', OFFER_SENT: 'default', OFFER_ACCEPTED: 'default', JOINED: 'default',
  REJECTED: 'destructive', WITHDRAWN: 'destructive', ON_HOLD: 'secondary',
};

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

  const SUMMARY_STAGES = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW_ROUND_1', 'SELECTED', 'REJECTED'] as const;

  const stageAccent: Record<string, { border: string; count: string; active: string }> = {
    APPLIED: {
      border: 'border-blue-200 hover:border-blue-300',
      count: 'text-blue-700',
      active: 'border-blue-500 bg-blue-50 ring-2 ring-blue-200',
    },
    SCREENING: {
      border: 'border-amber-200 hover:border-amber-300',
      count: 'text-amber-700',
      active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200',
    },
    SHORTLISTED: {
      border: 'border-purple-200 hover:border-purple-300',
      count: 'text-purple-700',
      active: 'border-purple-500 bg-purple-50 ring-2 ring-purple-200',
    },
    INTERVIEW_ROUND_1: {
      border: 'border-orange-200 hover:border-orange-300',
      count: 'text-orange-700',
      active: 'border-orange-500 bg-orange-50 ring-2 ring-orange-200',
    },
    SELECTED: {
      border: 'border-green-200 hover:border-green-300',
      count: 'text-green-700',
      active: 'border-green-500 bg-green-50 ring-2 ring-green-200',
    },
    REJECTED: {
      border: 'border-red-200 hover:border-red-300',
      count: 'text-red-700',
      active: 'border-red-500 bg-red-50 ring-2 ring-red-200',
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
      </div>

      {/* Pipeline Stats */}
      {statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SUMMARY_STAGES.map((s) => {
            const count = statsData.find((x) => x.status === s)?.count ?? 0;
            const accent = stageAccent[s];
            const isActive = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(status === s ? '' : s)}
                className={`rounded-xl border bg-card px-3 py-4 text-center shadow-sm transition-all ${
                  isActive
                    ? accent.active
                    : `${accent.border} hover:shadow-md hover:bg-muted/40`
                }`}
              >
                <div className={`text-2xl font-bold leading-none ${isActive ? accent.count : 'text-foreground'}`}>
                  {count}
                </div>
                <div className={`mt-2 text-[11px] font-medium uppercase tracking-wide leading-tight ${
                  isActive ? accent.count : 'text-muted-foreground'
                }`}>
                  {s === 'INTERVIEW_ROUND_1' ? 'Interview R1' : s.replace(/_/g, ' ')}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Search + Stage filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search candidates..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56 shrink-0">
          <label className="text-xs text-muted-foreground mb-1 block">Stage</label>
          <select
            className="h-10 w-full border border-input rounded-md px-3 text-sm bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Stages</option>
            {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : apps.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No applications found</CardContent></Card>
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
              className="hover:shadow-md hover:bg-muted/30 transition-all cursor-pointer"
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">
                        {app.candidate.firstName} {app.candidate.lastName}
                      </h3>
                      <Badge variant={stageColors[app.status] as any}>{app.status.replace(/_/g, ' ')}</Badge>
                      {app.assessmentAttempt?.submittedAt && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3" />
                          Score: {app.assessmentAttempt.score}%
                          {app.assessmentAttempt.isPassed ? ' ✓' : ' ✗'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>{app.candidate.email}</span>
                      {app.candidate.currentCompany && <span>@ {app.candidate.currentCompany}</span>}
                      {app.candidate.totalExperience !== undefined && <span>{app.candidate.totalExperience}y exp</span>}
                      {app.candidate.noticePeriodDays !== undefined && <span>{app.candidate.noticePeriodDays}d notice</span>}
                      <span className="text-xs">Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{app.job.title} · {app.job.department.name}</p>
                  </div>
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {app.candidate.resumeUrl && (
                      <Button variant="ghost" size="icon" title="View Resume" asChild>
                        <a href={app.candidate.resumeUrl} target="_blank" rel="noreferrer">
                          <FileText className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/applications/${app.id}`} state={{ filterJobId: jobId }}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    {movingId === app.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          className="border rounded px-2 py-1 text-xs bg-background"
                          defaultValue={app.status}
                          onChange={(e) => statusMutation.mutate({ id: app.id, newStatus: e.target.value })}
                        >
                          {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                        <Button variant="ghost" size="sm" onClick={() => setMovingId(null)}>✕</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setMovingId(app.id)}>
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
