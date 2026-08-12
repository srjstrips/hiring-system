import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi, type AssessmentResultRow } from '@/api/assessments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { ArrowLeft, Eye, Mail, RefreshCw, Search, X } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  ASSIGNED: 'bg-slate-100 text-slate-700',
  STARTED: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

function formatDuration(seconds: number | null) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

type ConfirmAction =
  | { type: 'resend'; row: AssessmentResultRow }
  | { type: 'retake'; row: AssessmentResultRow; increase: boolean }
  | null;

export default function AssessmentResultsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [scoreMin, setScoreMin] = useState('');
  const [scoreMax, setScoreMax] = useState('');
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  const queryParams = useMemo(
    () => ({
      search: applied.search || undefined,
      status: applied.status || undefined,
      result: applied.result || undefined,
      dateFrom: applied.dateFrom || undefined,
      dateTo: applied.dateTo || undefined,
      scoreMin: applied.scoreMin || undefined,
      scoreMax: applied.scoreMax || undefined,
    }),
    [applied]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['assessment-results', id, queryParams],
    queryFn: () => assessmentsApi.getResultsDashboard(id!, queryParams).then((r) => r.data.data),
    enabled: !!id,
  });

  const resendMutation = useMutation({
    mutationFn: (assignmentId: string) => assessmentsApi.resendInvite(id!, assignmentId),
    onSuccess: () => {
      toast({ title: 'Invite resent', variant: 'success' });
      setConfirm(null);
    },
    onError: (e: any) =>
      toast({ title: 'Could not resend', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const retakeMutation = useMutation({
    mutationFn: ({ assignmentId, increase }: { assignmentId: string; increase: boolean }) =>
      assessmentsApi.allowRetake(id!, assignmentId, increase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-results', id] });
      toast({ title: 'Retake enabled', description: 'Candidate can start another attempt.', variant: 'success' });
      setConfirm(null);
    },
    onError: (e: any) =>
      toast({ title: 'Could not enable retake', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const applyFilters = () => {
    setApplied({
      search: search.trim(),
      status,
      result,
      dateFrom,
      dateTo,
      scoreMin,
      scoreMax,
    });
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setResult('');
    setDateFrom('');
    setDateTo('');
    setScoreMin('');
    setScoreMax('');
    setApplied({});
  };

  const summary = data?.summary;
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/assessments/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Assessment Results</h1>
          <p className="text-sm text-muted-foreground">
            {data?.assessment.name}
            {data?.assessment.job?.title ? ` · ${data.assessment.job.title}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Assigned', value: summary?.totalAssigned },
          { label: 'Not Started', value: summary?.notStarted },
          { label: 'In Progress', value: summary?.inProgress },
          { label: 'Completed', value: summary?.completed },
          { label: 'Passed', value: summary?.passed },
          { label: 'Failed', value: summary?.failed },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-semibold mt-1">{card.value ?? '—'}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name or email..."
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
              {['ASSIGNED', 'STARTED', 'COMPLETED', 'EXPIRED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={result}
              onChange={(e) => setResult(e.target.value)}
            >
              <option value="">All Results</option>
              <option value="PASSED">PASSED</option>
              <option value="FAILED">FAILED</option>
              <option value="PENDING">Pending</option>
            </select>
            <Input type="date" className="w-auto" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" className="w-auto" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <Input
              type="number"
              className="w-24"
              placeholder="Min %"
              value={scoreMin}
              onChange={(e) => setScoreMin(e.target.value)}
            />
            <Input
              type="number"
              className="w-24"
              placeholder="Max %"
              value={scoreMax}
              onChange={(e) => setScoreMax(e.target.value)}
            />
            <Button onClick={applyFilters}>Filter</Button>
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1.5" /> Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Candidate Results</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading...</div>
          ) : isError ? (
            <div className="py-10 text-center text-destructive">
              {(error as any)?.response?.data?.message || 'Failed to load results'}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              {summary?.totalAssigned === 0
                ? 'No candidates have been assigned to this assessment.'
                : Object.values(queryParams).some(Boolean)
                  ? 'No results match the current filters.'
                  : 'No completed assessment results yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Application</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Time Taken</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const incomplete = row.result == null;
                    return (
                      <TableRow key={row.assignmentId}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {row.candidate.firstName} {row.candidate.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.candidate.email}</TableCell>
                        <TableCell>{row.job?.title ?? data?.assessment.job?.title ?? '—'}</TableCell>
                        <TableCell>
                          <Link
                            className="text-primary hover:underline text-sm"
                            to={`/applications/${row.application.id}`}
                          >
                            View
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? 'bg-muted'}`}>
                            {row.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {row.latestAttemptNumber != null
                            ? `${row.latestAttemptNumber}/${row.maxAttempts}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {incomplete || row.score == null
                            ? '—'
                            : `${row.score}${row.totalMarks != null ? ` / ${row.totalMarks}` : ''}`}
                        </TableCell>
                        <TableCell>{incomplete || row.percentage == null ? '—' : `${row.percentage}%`}</TableCell>
                        <TableCell>
                          {incomplete || !row.result ? (
                            '—'
                          ) : (
                            <Badge variant={row.result === 'PASSED' ? 'default' : 'secondary'}>
                              {row.result}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDuration(row.timeTakenSeconds)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(row.startedAt)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(row.completedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/assessments/${id}/results/${row.assignmentId}`}>
                                <Eye className="h-3.5 w-3.5 mr-1" /> View
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirm({ type: 'resend', row })}
                            >
                              <Mail className="h-3.5 w-3.5 mr-1" /> Resend
                            </Button>
                            {row.canRetake && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirm({ type: 'retake', row, increase: false })}
                              >
                                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retake
                              </Button>
                            )}
                            {row.canIncreaseAttempts && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirm({ type: 'retake', row, increase: true })}
                              >
                                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Extra attempt
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm?.type === 'resend'}
        onClose={() => setConfirm(null)}
        title="Resend assessment"
        description={`Resend the secure assessment link to ${confirm?.row.candidate.email}?`}
        confirmLabel="Resend"
        variant="default"
        loading={resendMutation.isPending}
        onConfirm={() => confirm && resendMutation.mutate(confirm.row.assignmentId)}
      />

      <ConfirmDialog
        open={confirm?.type === 'retake'}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'retake' && confirm.increase ? 'Allow extra attempt' : 'Retake assessment'}
        description={
          confirm?.type === 'retake' && confirm.increase
            ? `Increase max attempts and allow ${confirm.row.candidate.firstName} to take the assessment again? Previous attempts will be kept.`
            : 'Allow this candidate to take the assessment again?'
        }
        confirmLabel={confirm?.type === 'retake' && confirm.increase ? 'Increase & allow' : 'Allow retake'}
        variant="default"
        loading={retakeMutation.isPending}
        onConfirm={() =>
          confirm?.type === 'retake' &&
          retakeMutation.mutate({
            assignmentId: confirm.row.assignmentId,
            increase: confirm.increase,
          })
        }
      />
    </div>
  );
}
