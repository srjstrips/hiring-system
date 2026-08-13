import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi, type AssignmentResultAttempt } from '@/api/assessments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { ArrowLeft, CheckCircle2, Circle, Mail, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

function formatDuration(seconds: number | null) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

const OUTCOME_STYLES = {
  CORRECT: 'border-green-200 bg-green-50',
  INCORRECT: 'border-red-200 bg-red-50',
  UNANSWERED: 'border-slate-200 bg-slate-50',
} as const;

function AssessmentRecordingsSection({
  assessmentId,
  attempt,
}: {
  assessmentId: string;
  attempt: AssignmentResultAttempt;
}) {
  const [viewer, setViewer] = useState<{ title: string; url: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const recordings = attempt.recordings ?? [];
  const camera = recordings.find((r) => r.recordingType === 'CAMERA');
  const screen = recordings.find((r) => r.recordingType === 'SCREEN');

  const openRecording = async (recordingId: string, title: string) => {
    setLoadingId(recordingId);
    try {
      const res = await assessmentsApi.getRecordingViewUrl(assessmentId, recordingId);
      setViewer({ title, url: res.data.data.url });
    } catch (e: any) {
      toast({
        title: 'Unable to open recording',
        description: e.response?.data?.message || 'Recording is not available yet.',
        variant: 'destructive',
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Assessment Recordings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recordings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recordings available for this attempt.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="border rounded-md p-3 space-y-2">
                <p className="font-medium text-sm">Candidate Video + Audio</p>
                <p className="text-xs text-muted-foreground">
                  Status: {camera?.status ?? '—'}
                  {camera?.durationSeconds != null ? ` · ${formatDuration(camera.durationSeconds)}` : ''}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!camera || camera.status !== 'READY' || loadingId === camera.id}
                  onClick={() => camera && openRecording(camera.id, 'Candidate Video + Audio')}
                >
                  {loadingId === camera?.id ? 'Loading...' : 'View Recording'}
                </Button>
              </div>
              <div className="border rounded-md p-3 space-y-2">
                <p className="font-medium text-sm">Screen Recording</p>
                <p className="text-xs text-muted-foreground">
                  Status: {screen?.status ?? '—'}
                  {screen?.durationSeconds != null ? ` · ${formatDuration(screen.durationSeconds)}` : ''}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!screen || screen.status !== 'READY' || loadingId === screen.id}
                  onClick={() => screen && openRecording(screen.id, 'Screen Recording')}
                >
                  {loadingId === screen?.id ? 'Loading...' : 'View Recording'}
                </Button>
              </div>
            </div>
          )}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Recording Status</p>
            <p>Candidate Video: {camera?.status ?? 'Not recorded'}</p>
            <p>Screen Recording: {screen?.status ?? 'Not recorded'}</p>
          </div>
        </CardContent>
      </Card>

      {viewer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">{viewer.title} · Attempt {attempt.attemptNumber}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setViewer(null)}>Close</Button>
            </CardHeader>
            <CardContent>
              <video
                key={viewer.url}
                src={viewer.url}
                controls
                className="w-full rounded-md bg-black max-h-[70vh]"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Playback uses a short-lived secure link. Refresh the viewer if the link expires.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export default function AssessmentResultDetailPage() {
  const { id, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const queryClient = useQueryClient();
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'resend' | 'retake' | 'increase' | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['assessment-assignment-result', id, assignmentId],
    queryFn: () => assessmentsApi.getAssignmentResult(id!, assignmentId!).then((r) => r.data.data),
    enabled: !!id && !!assignmentId,
  });

  const resendMutation = useMutation({
    mutationFn: () => assessmentsApi.resendInvite(id!, assignmentId!),
    onSuccess: () => {
      toast({ title: 'Invite resent', variant: 'success' });
      setConfirm(null);
    },
    onError: (e: any) =>
      toast({ title: 'Could not resend', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const retakeMutation = useMutation({
    mutationFn: (increase: boolean) => assessmentsApi.allowRetake(id!, assignmentId!, increase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-assignment-result', id, assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['assessment-results', id] });
      toast({ title: 'Retake enabled', variant: 'success' });
      setConfirm(null);
    },
    onError: (e: any) =>
      toast({ title: 'Could not enable retake', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const selectedAttempt: AssignmentResultAttempt | null = useMemo(() => {
    if (!data?.attempts?.length) return null;
    if (selectedAttemptId) {
      return data.attempts.find((a) => a.id === selectedAttemptId) ?? data.latestAttempt;
    }
    const completed = [...data.attempts].reverse().find((a) => a.completedAt);
    return completed ?? data.latestAttempt;
  }, [data, selectedAttemptId]);

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (isError) {
    return (
      <div className="py-12 text-center text-destructive">
        {(error as any)?.response?.data?.message || 'Failed to load result'}
      </div>
    );
  }
  if (!data) return <div className="py-12 text-center text-muted-foreground">Assignment not found</div>;

  const { candidate, assessment, application, job, assignment, attempts, passingPercentage } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/assessments/${id}/results`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {candidate.firstName} {candidate.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">{candidate.email}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setConfirm('resend')}>
            <Mail className="h-4 w-4 mr-1.5" /> Resend Assessment
          </Button>
          {assignment.canRetake && (
            <Button variant="outline" onClick={() => setConfirm('retake')}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Retake Assessment
            </Button>
          )}
          {assignment.canIncreaseAttempts && (
            <Button variant="outline" onClick={() => setConfirm('increase')}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Allow Extra Attempt
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Candidate Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Candidate Name</p>
              <p className="font-medium">{candidate.firstName} {candidate.lastName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{candidate.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Job</p>
              <p className="font-medium">{job?.title ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Application</p>
              <Link className="font-medium text-primary hover:underline" to={`/applications/${application.id}`}>
                Open application
              </Link>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Assessment</p>
              <p className="font-medium">{assessment.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assignment Status</p>
              <Badge variant="secondary">{assignment.status}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Attempt History</CardTitle></CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No attempts recorded.</p>
            ) : (
              <div className="space-y-2">
                {[...attempts].reverse().map((attempt) => (
                  <button
                    key={attempt.id}
                    type="button"
                    onClick={() => setSelectedAttemptId(attempt.id)}
                    className={cn(
                      'w-full text-left border rounded-md p-3 text-sm transition-colors',
                      selectedAttempt?.id === attempt.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Attempt {attempt.attemptNumber}</span>
                        {attempt.isLatest && (
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                            Latest
                          </span>
                        )}
                      </div>
                      {attempt.result ? (
                        <Badge variant={attempt.result === 'PASSED' ? 'default' : 'secondary'}>
                          {attempt.result}
                        </Badge>
                      ) : (
                        <Badge variant="outline">In progress</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      <span>{attempt.completedAt ? 'Completed' : 'Started'}</span>
                      <span>{attempt.percentage != null ? `${attempt.percentage}%` : '—'}</span>
                      <span>{formatDate(attempt.startedAt)}</span>
                      {attempt.completedAt && <span>→ {formatDate(attempt.completedAt)}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedAttempt && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Attempt {selectedAttempt.attemptNumber}
                {selectedAttempt.isLatest ? ' (Latest)' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Started At</p>
                <p className="font-medium">{formatDate(selectedAttempt.startedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed At</p>
                <p className="font-medium">{formatDate(selectedAttempt.completedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time Taken</p>
                <p className="font-medium">{formatDuration(selectedAttempt.timeTakenSeconds)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Result</p>
                <p className="font-medium">
                  {selectedAttempt.result ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Marks</p>
                <p className="font-medium">{selectedAttempt.completedAt ? selectedAttempt.totalMarks ?? '—' : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Obtained Marks</p>
                <p className="font-medium">{selectedAttempt.completedAt ? selectedAttempt.obtainedMarks ?? '—' : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Percentage</p>
                <p className="font-medium">
                  {selectedAttempt.completedAt && selectedAttempt.percentage != null
                    ? `${selectedAttempt.percentage}%`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Passing Percentage</p>
                <p className="font-medium">{passingPercentage}%</p>
              </div>
            </CardContent>
          </Card>

          <AssessmentRecordingsSection assessmentId={id!} attempt={selectedAttempt} />

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Question Results</h2>
            {!selectedAttempt.completedAt ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Question-level results are available after the attempt is completed.
                </CardContent>
              </Card>
            ) : selectedAttempt.questions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No question snapshots found for this attempt.
                </CardContent>
              </Card>
            ) : (
              selectedAttempt.questions.map((q) => (
                <Card key={q.attemptQuestionId} className={cn('border', OUTCOME_STYLES[q.outcome])}>
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs text-muted-foreground">Question {q.number}</p>
                        <p className="font-medium mt-0.5">{q.questionText}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {q.outcome === 'CORRECT' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {q.outcome === 'INCORRECT' && <XCircle className="h-4 w-4 text-red-600" />}
                        {q.outcome === 'UNANSWERED' && <Circle className="h-4 w-4 text-slate-400" />}
                        <Badge variant="outline">{q.outcome}</Badge>
                      </div>
                    </div>

                    {q.options.length > 0 && (
                      <div className="space-y-1.5">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={cn(
                              'flex items-center gap-2 text-sm rounded px-2 py-1',
                              opt.isSelected && opt.isCorrect && 'bg-green-100',
                              opt.isSelected && !opt.isCorrect && 'bg-red-100',
                              !opt.isSelected && opt.isCorrect && 'bg-green-50'
                            )}
                          >
                            <span className="text-base leading-none">
                              {opt.isSelected ? '●' : '○'}
                            </span>
                            <span>{opt.optionText}</span>
                            {opt.isCorrect && (
                              <span className="text-[10px] uppercase text-green-700 font-medium">Correct</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid sm:grid-cols-3 gap-3 text-sm pt-1 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Candidate Answer</p>
                        <p className="font-medium">{q.candidateAnswer ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Correct Answer</p>
                        <p className="font-medium">{q.correctAnswer ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Marks</p>
                        <p className="font-medium">{q.marksGiven} / {q.marks}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirm === 'resend'}
        onClose={() => setConfirm(null)}
        title="Resend assessment"
        description={`Resend the secure assessment link to ${candidate.email}?`}
        confirmLabel="Resend"
        variant="default"
        loading={resendMutation.isPending}
        onConfirm={() => resendMutation.mutate()}
      />
      <ConfirmDialog
        open={confirm === 'retake'}
        onClose={() => setConfirm(null)}
        title="Retake assessment"
        description="Allow this candidate to take the assessment again?"
        confirmLabel="Allow retake"
        variant="default"
        loading={retakeMutation.isPending}
        onConfirm={() => retakeMutation.mutate(false)}
      />
      <ConfirmDialog
        open={confirm === 'increase'}
        onClose={() => setConfirm(null)}
        title="Allow extra attempt"
        description="Increase max attempts and allow this candidate to take the assessment again? Previous attempts will be kept."
        confirmLabel="Increase & allow"
        variant="default"
        loading={retakeMutation.isPending}
        onConfirm={() => retakeMutation.mutate(true)}
      />
    </div>
  );
}
