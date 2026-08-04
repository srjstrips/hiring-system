import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  const jobId = searchParams.get('jobId') ?? undefined;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [movingId, setMovingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['applications', jobId, status, search],
    queryFn: () =>
      applicationsApi.getAll({ jobId, status: status || undefined, search: search || undefined, limit: 50 }).then((r) => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['pipeline-stats', jobId],
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

  const apps = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-muted-foreground text-sm">{data?.total ?? 0} total applications</p>
      </div>

      {/* Pipeline Stats */}
      {statsData && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {STAGES.filter((s) => ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW_ROUND_1', 'SELECTED', 'REJECTED'].includes(s)).map((s) => {
            const count = statsData.find((x) => x.status === s)?.count ?? 0;
            return (
              <button
                key={s}
                onClick={() => setStatus(status === s ? '' : s)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg border text-center transition-colors ${
                  status === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                }`}
              >
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs">{s.replace(/_/g, ' ')}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search candidates..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : apps.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No applications found</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
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
                  <div className="flex items-center gap-2 shrink-0">
                    {app.candidate.resumeUrl && (
                      <Button variant="ghost" size="icon" title="View Resume" asChild>
                        <a href={app.candidate.resumeUrl} target="_blank" rel="noreferrer">
                          <FileText className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/applications/${app.id}`}><Eye className="h-4 w-4" /></Link>
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
