import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { assessmentsApi } from '@/api/assessments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SummaryCards } from '@/components/common/SummaryCards';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import {
  ArrowLeft, Pencil, ListChecks, UserPlus, BarChart3, Play, Archive,
  ClipboardList, Users, CheckCircle2, Hourglass,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-[#F1F5F9] text-[#64748B]',
  ACTIVE: 'bg-[#F0FDF4] text-green-700',
  CLOSED: 'bg-[#FFF1F2] text-rose-600',
};

const ASSIGN_STATUS: Record<string, string> = {
  ASSIGNED: 'bg-[#FFF7ED] text-[#FF6B00]',
  STARTED: 'bg-[#FFF7ED] text-[#EA580C]',
  COMPLETED: 'bg-[#F0FDF4] text-green-700',
  EXPIRED: 'bg-[#FFF1F2] text-rose-600',
  CANCELLED: 'bg-[#F1F5F9] text-[#64748B]',
};

const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
const actionBtnClass = 'h-9 rounded-xl border-[#E2E8F0] text-[#111827] hover:bg-[#FFF7ED] hover:text-[#FF6B00]';

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [confirmClose, setConfirmClose] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => assessmentsApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['assessment-assignments', id],
    queryFn: () => assessmentsApi.getAssignments(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'DRAFT' | 'CLOSED') => assessmentsApi.update(id!, { status }),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['assessment', id] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast({
        title: status === 'ACTIVE' ? 'Assessment activated' : status === 'CLOSED' ? 'Assessment closed' : 'Status updated',
        variant: 'success',
      });
      setConfirmClose(false);
    },
    onError: (e: any) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => assessmentsApi.archive(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment', id] });
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      toast({ title: 'Assessment closed/archived', variant: 'success' });
      setConfirmClose(false);
    },
    onError: (e: any) =>
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="py-16 text-center text-sm text-[#64748B]">Loading...</div>;
  if (!data) return <div className="py-16 text-center text-sm text-[#64748B]">Assessment not found</div>;

  const infoFields = [
    { label: 'Assessment Name', value: data.name },
    { label: 'Job', value: data.job?.title ?? '—' },
    { label: 'Duration', value: `${data.durationMins} minutes` },
    { label: 'Total Questions', value: data.questionCount ?? data.questions?.length ?? 0 },
    { label: 'Passing Score', value: `${data.passingScore}%` },
    { label: 'Maximum Attempts', value: data.maxAttempts },
    { label: 'Status', value: data.status },
    { label: 'Designation', value: data.designation?.name ?? '—' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]"
            asChild
          >
            <Link to="/assessments" aria-label="Back to assessments"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#111827]">{data.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[data.status] ?? 'bg-[#F1F5F9] text-[#64748B]'}`}>
                {data.status}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#64748B]">
              <span>{data.job?.title ?? '—'}</span>
              {data.designation?.name && <span>· {data.designation.name}</span>}
              <span>· Created {new Date(data.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.status === 'DRAFT' && (
            <Button
              className="h-9 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
              onClick={() => statusMutation.mutate('ACTIVE')}
              disabled={statusMutation.isPending}
            >
              <Play className="mr-1.5 h-4 w-4" /> Activate
            </Button>
          )}
          {data.status === 'ACTIVE' && (
            <Button
              variant="outline"
              className={actionBtnClass}
              onClick={() => statusMutation.mutate('DRAFT')}
              disabled={statusMutation.isPending}
            >
              Deactivate
            </Button>
          )}
          {data.status !== 'CLOSED' && (
            <Button variant="outline" className={actionBtnClass} onClick={() => setConfirmClose(true)}>
              <Archive className="mr-1.5 h-4 w-4" /> Close
            </Button>
          )}
          <Button variant="outline" className={actionBtnClass} asChild>
            <Link to={`/assessments/${id}/edit`}><Pencil className="mr-1.5 h-4 w-4" /> Edit</Link>
          </Button>
          <Button variant="outline" className={actionBtnClass} asChild>
            <Link to={`/assessments/${id}/questions`}><ListChecks className="mr-1.5 h-4 w-4" /> Questions</Link>
          </Button>
          <Button variant="outline" className={actionBtnClass} asChild>
            <Link to={`/assessments/${id}/assign`}><UserPlus className="mr-1.5 h-4 w-4" /> Assign</Link>
          </Button>
          <Button variant="outline" className={actionBtnClass} asChild>
            <Link to={`/assessments/${id}/results`}><BarChart3 className="mr-1.5 h-4 w-4" /> Results</Link>
          </Button>
        </div>
      </div>

      <SummaryCards
        columns="grid-cols-2 lg:grid-cols-4"
        items={[
          { label: 'Total Questions', value: data.questionCount ?? data.questions?.length ?? 0, icon: ClipboardList, color: 'text-[#FF6B00]', bg: 'bg-[#FFF7ED]' },
          { label: 'Candidates Assigned', value: data.candidatesAssigned ?? assignments.length, icon: Users, color: 'text-[#FF6B00]', bg: 'bg-[#FFF7ED]' },
          { label: 'Candidates Completed', value: data.candidatesCompleted ?? 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-[#F0FDF4]' },
          { label: 'Candidates Pending', value: data.candidatesPending ?? 0, icon: Hourglass, color: 'text-[#FF6B00]', bg: 'bg-[#FFF7ED]' },
        ]}
      />

      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#111827]">Assessment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {infoFields.map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-[#64748B]">{label}</p>
                <p className="mt-0.5 font-medium text-[#111827]">{value}</p>
              </div>
            ))}
            {data.description && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-[#64748B]">Description</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-[#111827]">{data.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base text-[#111827]">Assigned Candidates</CardTitle>
          <Button size="sm" variant="outline" className={actionBtnClass} asChild>
            <Link to={`/assessments/${id}/assign`}>Assign More</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loadingAssignments ? (
            <div className="py-10 text-center text-sm text-[#64748B]">Loading...</div>
          ) : assignments.length === 0 ? (
            <div className="py-10 text-center">
              <p className="font-medium text-[#111827]">No candidates assigned</p>
              <p className="mt-1 text-sm text-[#64748B]">No candidates have been assigned to this assessment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                    <TableHead className="font-medium text-[#64748B]">Candidate</TableHead>
                    <TableHead className="font-medium text-[#64748B]">Email</TableHead>
                    <TableHead className="font-medium text-[#64748B]">Status</TableHead>
                    <TableHead className="font-medium text-[#64748B]">Assigned</TableHead>
                    <TableHead className="text-right font-medium text-[#64748B]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id} className="border-[#E2E8F0] hover:bg-[#FFF7ED]/40">
                      <TableCell className="font-medium text-[#111827]">
                        {a.candidate.firstName} {a.candidate.lastName}
                      </TableCell>
                      <TableCell className="text-[#64748B]">{a.candidate.email}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ASSIGN_STATUS[a.status] ?? 'bg-[#F1F5F9] text-[#64748B]'}`}>
                          {a.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-[#64748B]">{new Date(a.assignedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className={actionBtnClass} asChild>
                          <Link to={`/assessments/${id}/results/${a.id}`}>View Result</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Close assessment"
        description={`Close "${data.name}"? Candidates will no longer be able to start. Historical results remain available.`}
        confirmLabel="Close"
        loading={archiveMutation.isPending}
        onConfirm={() => archiveMutation.mutate()}
      />
    </div>
  );
}
