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
  Briefcase, Calendar, Clock, Target, ClipboardList,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-[#F1F5F9] text-[#64748B]',
  ACTIVE: 'bg-[#F0FDF4] text-green-700',
  CLOSED: 'bg-[#FFF1F2] text-rose-600',
};

const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
const selectClass =
  'h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#111827] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25';
const actionBtnClass = 'h-8 rounded-lg border-[#E2E8F0] text-xs text-[#111827] hover:bg-[#FFF7ED] hover:text-[#FF6B00]';

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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Assessments</h1>
          <p className="mt-1 text-sm text-[#64748B]">Create and manage candidate assessments</p>
        </div>
        <Button
          onClick={() => navigate('/assessments/new')}
          className="h-10 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Assessment
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Search assessments..."
            className="h-10 rounded-xl border-[#E2E8F0] bg-white pl-9 text-[#111827] placeholder:text-[#94A3B8] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/25 focus-visible:ring-offset-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          {['DRAFT', 'ACTIVE', 'CLOSED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-[#64748B]">Loading...</div>
      ) : assessments.length === 0 ? (
        <Card className={cardClass}>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF7ED]">
              <ClipboardList className="h-6 w-6 text-[#FF6B00]" />
            </div>
            <p className="font-semibold text-[#111827]">No assessments yet</p>
            <p className="mt-1 text-sm text-[#64748B]">
              Create an assessment to evaluate candidates during the hiring process.
            </p>
            <Button
              className="mt-5 h-10 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
              onClick={() => navigate('/assessments/new')}
            >
              <Plus className="mr-2 h-4 w-4" /> Create Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assessments.map((a) => (
            <Card key={a.id} className={`${cardClass} transition-shadow hover:shadow-md`}>
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#111827]">{a.name}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status] ?? 'bg-[#F1F5F9] text-[#64748B]'}`}>
                        {a.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div className="flex items-center gap-2 text-[#64748B]">
                        <Briefcase className="h-3.5 w-3.5 shrink-0 text-[#FF6B00]" />
                        <span><span className="text-[#94A3B8]">Job · </span>{a.job?.title ?? '—'}</span>
                      </div>
                      {a.designation?.name && (
                        <div className="flex items-center gap-2 text-[#64748B]">
                          <Target className="h-3.5 w-3.5 shrink-0 text-[#FF6B00]" />
                          <span><span className="text-[#94A3B8]">Role · </span>{a.designation.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[#64748B]">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-[#FF6B00]" />
                        <span><span className="text-[#94A3B8]">Created · </span>{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#64748B]">
                        <ListChecks className="h-3.5 w-3.5 shrink-0 text-[#FF6B00]" />
                        <span><span className="text-[#94A3B8]">Questions · </span>{a.questionCount ?? a._count?.questions ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#64748B]">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-[#FF6B00]" />
                        <span><span className="text-[#94A3B8]">Duration · </span>{a.durationMins} min</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#64748B]">
                        <Target className="h-3.5 w-3.5 shrink-0 text-[#FF6B00]" />
                        <span><span className="text-[#94A3B8]">Passing score · </span>{a.passingScore}%</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-[#F8FAFC] px-3 py-2 text-xs text-[#64748B]">
                      <span>Assigned: <strong className="text-[#111827]">{a.candidatesAssigned ?? a._count?.assignments ?? 0}</strong></span>
                      <span>Completed: <strong className="text-[#111827]">{a.candidatesCompleted ?? 0}</strong></span>
                      {a.averageScore != null && (
                        <span>Average Score: <strong className="text-[#111827]">{a.averageScore}%</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex max-w-full flex-wrap gap-2 lg:max-w-md lg:justify-end">
                    <Button size="sm" variant="outline" className={actionBtnClass} asChild>
                      <Link to={`/assessments/${a.id}`} title="View assessment"><Eye className="mr-1 h-3.5 w-3.5" /> View</Link>
                    </Button>
                    <Button size="sm" variant="outline" className={actionBtnClass} asChild>
                      <Link to={`/assessments/${a.id}/edit`} title="Edit assessment"><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Link>
                    </Button>
                    <Button size="sm" variant="outline" className={actionBtnClass} asChild>
                      <Link to={`/assessments/${a.id}/questions`} title="Manage questions"><ListChecks className="mr-1 h-3.5 w-3.5" /> Questions</Link>
                    </Button>
                    <Button size="sm" variant="outline" className={actionBtnClass} asChild>
                      <Link to={`/assessments/${a.id}/assign`} title="Assign candidates"><UserPlus className="mr-1 h-3.5 w-3.5" /> Assign</Link>
                    </Button>
                    <Button size="sm" variant="outline" className={actionBtnClass} asChild>
                      <Link to={`/assessments/${a.id}/results`} title="View results"><BarChart3 className="mr-1 h-3.5 w-3.5" /> Results</Link>
                    </Button>
                    {a.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={actionBtnClass}
                        title="Activate assessment"
                        onClick={() => activateMutation.mutate(a.id)}
                        disabled={activateMutation.isPending}
                      >
                        <Play className="mr-1 h-3.5 w-3.5" /> Activate
                      </Button>
                    )}
                    {a.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={actionBtnClass}
                        title="Deactivate assessment"
                        onClick={() => deactivateMutation.mutate(a.id)}
                        disabled={deactivateMutation.isPending}
                      >
                        Deactivate
                      </Button>
                    )}
                    {a.status !== 'CLOSED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${actionBtnClass} hover:border-rose-200 hover:bg-[#FFF1F2] hover:text-rose-600`}
                        title="Close assessment"
                        onClick={() => setArchiveTarget(a)}
                      >
                        <Archive className="mr-1 h-3.5 w-3.5" /> Close
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
