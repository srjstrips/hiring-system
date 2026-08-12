import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi, type Assessment } from '@/api/assessments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import {
  Plus, Search, Eye, Pencil, ListChecks, UserPlus, BarChart3, Archive, Play,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

export default function AssessmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<Assessment | null>(null);
  const [searchParams] = useSearchParams();
  const jobIdFilter = searchParams.get('jobId') || undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['assessments', search, status, jobIdFilter],
    queryFn: () =>
      assessmentsApi
        .getAll({
          search: search || undefined,
          status: status || undefined,
          jobId: jobIdFilter,
          limit: 50,
        })
        .then((r) => r.data),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => assessmentsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast({ title: 'Assessment closed/archived', variant: 'success' });
      setArchiveTarget(null);
    },
    onError: (e: any) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => assessmentsApi.update(id, { status: 'ACTIVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast({ title: 'Assessment activated', variant: 'success' });
    },
    onError: (e: any) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => assessmentsApi.update(id, { status: 'DRAFT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast({ title: 'Assessment deactivated', variant: 'success' });
    },
    onError: (e: any) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const assessments = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Assessments</h1>
          <p className="text-sm text-muted-foreground">Create and manage candidate assessments</p>
        </div>
        <Button onClick={() => navigate('/assessments/new')}>
          <Plus className="h-4 w-4 mr-2" /> Create Assessment
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Status</option>
          {['DRAFT', 'ACTIVE', 'CLOSED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : assessments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p className="font-medium">No assessments yet</p>
            <p className="text-sm mt-1">Create an assessment and assign it to candidates who applied for a job.</p>
            <Button className="mt-4" onClick={() => navigate('/assessments/new')}>
              <Plus className="h-4 w-4 mr-2" /> Create Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{a.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                        {a.status}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>{a.job?.title ?? '—'}</span>
                      {a.designation?.name && (<><span>·</span><span>{a.designation.name}</span></>)}
                      <span>·</span>
                      <span>{a.questionCount ?? a._count?.questions ?? 0} questions</span>
                      <span>·</span>
                      <span>{a.durationMins} min</span>
                      <span>·</span>
                      <span>Pass: {a.passingScore}%</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>Assigned: {a.candidatesAssigned ?? a._count?.assignments ?? 0}</span>
                      <span>Completed: {a.candidatesCompleted ?? 0}</span>
                      {a.averageScore != null && <span>Avg score: {a.averageScore}%</span>}
                      <span>Created: {new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap shrink-0">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/assessments/${a.id}`}><Eye className="h-3.5 w-3.5 mr-1.5" /> View</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/assessments/${a.id}/edit`}><Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/assessments/${a.id}/questions`}><ListChecks className="h-3.5 w-3.5 mr-1.5" /> Questions</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/assessments/${a.id}/assign`}><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Assign</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/assessments/${a.id}/results`}><BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Results</Link>
                    </Button>
                    {a.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateMutation.mutate(a.id)}
                        disabled={activateMutation.isPending}
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" /> Activate
                      </Button>
                    )}
                    {a.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deactivateMutation.mutate(a.id)}
                        disabled={deactivateMutation.isPending}
                      >
                        Deactivate
                      </Button>
                    )}
                    {a.status !== 'CLOSED' && (
                      <Button size="sm" variant="outline" onClick={() => setArchiveTarget(a)}>
                        <Archive className="h-3.5 w-3.5 mr-1.5" /> Close
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Close assessment"
        description={`Close "${archiveTarget?.name}"? Assessments with assignments will be closed rather than deleted.`}
        confirmLabel="Close"
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
