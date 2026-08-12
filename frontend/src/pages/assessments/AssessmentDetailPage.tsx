import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { assessmentsApi } from '@/api/assessments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { ArrowLeft, Pencil, ListChecks, UserPlus, BarChart3, Play, Archive } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const ASSIGN_STATUS: Record<string, string> = {
  ASSIGNED: 'bg-slate-100 text-slate-700',
  STARTED: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

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

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (!data) return <div className="py-12 text-center text-muted-foreground">Assessment not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/assessments"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{data.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[data.status]}`}>
                {data.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{data.job?.title}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {data.status === 'DRAFT' && (
            <Button
              variant="default"
              onClick={() => statusMutation.mutate('ACTIVE')}
              disabled={statusMutation.isPending}
            >
              <Play className="h-4 w-4 mr-1.5" /> Activate
            </Button>
          )}
          {data.status === 'ACTIVE' && (
            <Button
              variant="outline"
              onClick={() => statusMutation.mutate('DRAFT')}
              disabled={statusMutation.isPending}
            >
              Deactivate
            </Button>
          )}
          {data.status !== 'CLOSED' && (
            <Button variant="outline" onClick={() => setConfirmClose(true)}>
              <Archive className="h-4 w-4 mr-1.5" /> Close
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={`/assessments/${id}/edit`}><Pencil className="h-4 w-4 mr-1.5" /> Edit</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/assessments/${id}/questions`}><ListChecks className="h-4 w-4 mr-1.5" /> Questions</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/assessments/${id}/assign`}><UserPlus className="h-4 w-4 mr-1.5" /> Assign</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/assessments/${id}/results`}><BarChart3 className="h-4 w-4 mr-1.5" /> Results</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Questions', value: data.questionCount ?? data.questions?.length ?? 0 },
          { label: 'Candidates Assigned', value: data.candidatesAssigned ?? assignments.length },
          { label: 'Candidates Completed', value: data.candidatesCompleted ?? 0 },
          { label: 'Candidates Pending', value: data.candidatesPending ?? 0 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Assessment Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-muted-foreground">Assessment Name</p><p className="font-medium">{data.name}</p></div>
          <div><p className="text-xs text-muted-foreground">Job</p><p className="font-medium">{data.job?.title ?? '—'}</p></div>
          <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-medium">{data.durationMins} minutes</p></div>
          <div><p className="text-xs text-muted-foreground">Total Questions</p><p className="font-medium">{data.questionCount ?? data.questions?.length ?? 0}</p></div>
          <div><p className="text-xs text-muted-foreground">Passing Score</p><p className="font-medium">{data.passingScore}%</p></div>
          <div><p className="text-xs text-muted-foreground">Maximum Attempts</p><p className="font-medium">{data.maxAttempts}</p></div>
          <div><p className="text-xs text-muted-foreground">Status</p><p className="font-medium">{data.status}</p></div>
          <div><p className="text-xs text-muted-foreground">Designation</p><p className="font-medium">{data.designation?.name ?? '—'}</p></div>
          {data.description && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="mt-1 whitespace-pre-wrap">{data.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Assigned Candidates</CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/assessments/${id}/assign`}>Assign more</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loadingAssignments ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : assignments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No candidates have been assigned to this assessment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.candidate.firstName} {a.candidate.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.candidate.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ASSIGN_STATUS[a.status] ?? 'bg-muted'}`}>
                          {a.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(a.assignedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/assessments/${id}/results/${a.id}`}>View result</Link>
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
