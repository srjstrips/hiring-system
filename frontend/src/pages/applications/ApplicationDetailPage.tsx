import { useState, type ComponentType } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '@/api/applications';
import { interviewsApi } from '@/api/dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import SendEmailModal from '@/components/SendEmailModal';
import {
  ArrowLeft, FileText, Link2, Mail, Phone, Briefcase,
  Clock, Star, CheckCircle2, XCircle, ChevronRight, User,
  Calendar, DollarSign, Building2, Send, Search, Users,
  ShieldCheck, Gift, UserCheck, PauseCircle, Hourglass, Video, Lock, Trash2,
} from 'lucide-react';
import {
  isStageLocked,
  stageLabel,
} from '@/utils/applicationStages';
import { pipelineStagesApi } from '@/api/pipeline-stages';
import type { PipelineStage } from '@/api/pipeline-stages';

function defaultInterviewDateTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(11, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function interviewRoundFromStatus(status: string) {
  if (status === 'INTERVIEW_ROUND_2') return 2;
  if (status === 'HR_ROUND') return 3;
  return 1;
}

function stageBadgeStyle(stage: PipelineStage | undefined): React.CSSProperties {
  if (!stage) return { backgroundColor: '#F1F5F9', color: '#64748B' };
  return { backgroundColor: stage.color + '22', color: stage.color };
}

const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
const fieldClass =
  'h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25';
const textareaClass =
  'w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#111827] resize-none focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25';

const stageIcon: Record<string, ComponentType<{ className?: string }>> = {
  APPLIED: Send,
  SCREENING: Search,
  SHORTLISTED: Users,
  INTERVIEW_ROUND_1: Calendar,
  INTERVIEW_ROUND_2: Calendar,
  HR_ROUND: User,
  SELECTED: ShieldCheck,
  OFFER_SENT: Gift,
  OFFER_ACCEPTED: CheckCircle2,
  JOINED: UserCheck,
  REJECTED: XCircle,
  WITHDRAWN: XCircle,
  ON_HOLD: PauseCircle,
};


export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const filterJobId = (location.state as { filterJobId?: string } | null)?.filterJobId;
  const queryClient = useQueryClient();

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [interviewAt, setInterviewAt] = useState(defaultInterviewDateTime);
  const [interviewDuration, setInterviewDuration] = useState('60');
  const [interviewMode, setInterviewMode] = useState<'VIDEO' | 'IN_PERSON'>('VIDEO');
  const [interviewLocation, setInterviewLocation] = useState('');

  const { data: app, isLoading, isError } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
    retry: 1,
  });

  const { data: stagesData } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => pipelineStagesApi.getAll().then((r) => r.data.data),
    staleTime: 60_000,
  });
  const stages = stagesData ?? [];
  const stageMap = Object.fromEntries(stages.map((s) => [s.key, s]));
  // Pipeline: active non-side-exit stages in order
  const PIPELINE = stages
    .filter((s) => s.isActive && !['REJECTED', 'WITHDRAWN', 'ON_HOLD'].includes(s.key))
    .sort((a, b) => a.stageOrder - b.stageOrder)
    .map((s) => s.key);
  // Interview stages are type=INTERVIEW in DB
  const INTERVIEW_STAGE_KEYS = new Set(stages.filter((s) => s.type === 'INTERVIEW').map((s) => s.key));

  const invalidateApplication = () => {
    queryClient.invalidateQueries({ queryKey: ['application', id] });
    queryClient.invalidateQueries({ queryKey: ['applications'] });
    queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
    queryClient.invalidateQueries({ queryKey: ['insights-in-progress'] });
    queryClient.invalidateQueries({ queryKey: ['insights-backed-out'] });
    queryClient.invalidateQueries({ queryKey: ['insights-rejected'] });
    queryClient.invalidateQueries({ queryKey: ['insights-on-hold'] });
    queryClient.invalidateQueries({ queryKey: ['insights-company-left'] });
    queryClient.invalidateQueries({ queryKey: ['interviews'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-upcoming-interviews'] });
  };

  const resetStageForm = () => {
    setNewStatus('');
    setStageNotes('');
    setRejectionReason('');
    setInterviewAt(defaultInterviewDateTime());
    setInterviewDuration('60');
    setInterviewMode('VIDEO');
    setInterviewLocation('');
  };

  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; notes?: string; rejectionReason?: string }) =>
      applicationsApi.updateStatus(id!, payload),
    onSuccess: (res) => {
      invalidateApplication();
      toast({ title: `Stage moved to ${stageLabel(res.data.data.status)}`, variant: 'success' });
      resetStageForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => applicationsApi.delete(id!),
    onSuccess: () => {
      toast({ title: 'Application deleted', variant: 'success' });
      navigate(filterJobId ? `/applications?jobId=${encodeURIComponent(filterJobId)}` : '/applications');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const scheduleMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => interviewsApi.create(payload),
    onSuccess: () => {
      invalidateApplication();
      toast({ title: 'Interview scheduled', variant: 'success' });
      resetStageForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const isInterviewStage = INTERVIEW_STAGE_KEYS.has(newStatus);
  const isSaving = statusMutation.isPending || scheduleMutation.isPending;

  const handleMoveStage = () => {
    if (!newStatus || !app) return;

    if (isInterviewStage) {
      if (interviewMode === 'IN_PERSON' && !interviewLocation.trim()) {
        toast({ title: 'Location is required for an in-person interview', variant: 'destructive' });
        return;
      }
      if (!interviewAt) {
        toast({ title: 'Pick interview date and time', variant: 'destructive' });
        return;
      }

      scheduleMutation.mutate({
        applicationId: app.id,
        round: interviewRoundFromStatus(newStatus),
        title: `${stageLabel(newStatus)} — ${app.job.title}`,
        scheduledAt: new Date(interviewAt).toISOString(),
        durationMinutes: Number(interviewDuration) || 60,
        mode: interviewMode,
        location: interviewMode === 'IN_PERSON' ? interviewLocation.trim() : undefined,
        notes: stageNotes || undefined,
      });
      return;
    }

    statusMutation.mutate({
      status: newStatus,
      notes: stageNotes || undefined,
      rejectionReason: (newStatus === 'REJECTED' ? rejectionReason : undefined),
    });
  };

  if (isLoading) return <div className="py-20 text-center text-sm text-[#64748B]">Loading...</div>;
  if (isError) {
    return (
      <div className="py-20 text-center">
        <p className="font-semibold text-[#111827]">Could not load this application</p>
        <p className="mt-1 text-sm text-[#64748B]">Please try again, or go back to the applications list.</p>
        <Button className="mt-4 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]" onClick={() => navigate('/applications')}>
          Back to Applications
        </Button>
      </div>
    );
  }
  if (!app) return <div className="py-20 text-center text-sm text-[#64748B]">Application not found</div>;

  const isFinalOutcome = isStageLocked(app.status);
  const isOnHold = app.status === 'ON_HOLD';
  // Compute effective pipeline index (ON_HOLD resolves to last real stage)
  const currentStageIdx = (() => {
    const idx = PIPELINE.indexOf(app.status);
    if (idx >= 0) return idx;
    if (app.status === 'ON_HOLD') {
      for (let i = app.timeline.length - 1; i >= 0; i--) {
        const k = PIPELINE.indexOf(app.timeline[i]!.toStatus);
        if (k >= 0) return k;
      }
    }
    return -1;
  })();
  // Selectable stages = forward pipeline + side exits (minus current)
  const selectableStages = isFinalOutcome
    ? []
    : [
        ...PIPELINE.filter((_, i) => i > currentStageIdx),
        ...['REJECTED', 'WITHDRAWN', 'ON_HOLD'].filter((s) => s !== app.status),
      ];
  const CurrentStageIcon = app.status === 'SCREENING'
    ? Hourglass
    : (stageIcon[app.status] ?? Clock);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]"
            aria-label="Back to applications"
            onClick={() => navigate(filterJobId ? `/applications?jobId=${encodeURIComponent(filterJobId)}` : '/applications')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-[#111827]">
              {app.candidate.firstName} {app.candidate.lastName}
            </h1>
            <p className="text-sm text-[#64748B]">{app.job.title} · {app.job.department.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-[#E2E8F0]"
            onClick={() => setShowEmailModal(true)}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" /> Send Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-rose-200 text-rose-600 hover:bg-[#FFF1F2] hover:text-rose-700"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
          <div className="rounded-full px-4 py-1.5 text-sm font-semibold"
            style={stageBadgeStyle(stageMap[app.status])}>
            {stageMap[app.status]?.label ?? stageLabel(app.status)}
          </div>
        </div>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[#111827]">Delete Application?</h3>
            <p className="mt-2 text-sm text-[#64748B]">This will permanently delete this application and all its history. This action cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" className="rounded-xl border-[#E2E8F0]" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button className="rounded-xl bg-rose-600 text-white hover:bg-rose-700" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <SendEmailModal
          applicationId={app.id}
          candidateEmail={app.candidate.email}
          candidateName={`${app.candidate.firstName} ${app.candidate.lastName}`}
          jobTitle={app.job.title}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {!isFinalOutcome && !isOnHold && (
        <Card className={cardClass}>
          <CardContent className="px-4 py-5 sm:px-6">
            <div className="flex items-center gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {PIPELINE.map((stage, idx) => {
                const done = idx < currentStageIdx;
                const active = idx === currentStageIdx;
                return (
                  <div key={stage} className="flex shrink-0 items-center">
                    <div className="flex flex-col items-center gap-1 px-1">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        done ? 'bg-[#FF6B00] text-white' :
                        active ? 'bg-[#FF6B00] text-white ring-4 ring-[#FF6B00]/20' :
                        'bg-[#F1F5F9] text-[#94A3B8]'
                      }`}>
                        {done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <span className={`max-w-[60px] text-center text-[10px] leading-tight ${active ? 'font-semibold text-[#FF6B00]' : 'text-[#64748B]'}`}>
                        {stageLabel(stage)}
                      </span>
                    </div>
                    {idx < PIPELINE.length - 1 && (
                      <div className={`mb-4 h-0.5 w-6 shrink-0 ${done ? 'bg-[#FF6B00]' : 'bg-[#E2E8F0]'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isOnHold && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-[#FFF7ED] px-4 py-3 text-amber-800">
          <PauseCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Application On Hold</p>
            <p className="mt-0.5 text-sm opacity-80">
              Use Change Stage to resume this candidate into an active recruitment stage.
            </p>
          </div>
        </div>
      )}

      {isFinalOutcome && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
          app.status === 'REJECTED' ? 'border-rose-200 bg-[#FFF1F2] text-rose-700' : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]'
        }`}>
          <XCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Application {stageLabel(app.status)}</p>
            {app.rejectionReason && <p className="mt-0.5 text-sm opacity-80">Reason: {app.rejectionReason}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className={cardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-[#111827]">
                <User className="h-4 w-4 text-[#FF6B00]" /> Candidate Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { icon: Mail, label: 'Email', value: app.candidate.email },
                  { icon: Phone, label: 'Phone', value: app.candidate.phone ?? '—' },
                  { icon: Building2, label: 'Current Company', value: app.candidate.currentCompany ?? '—' },
                  { icon: Briefcase, label: 'Designation', value: app.candidate.currentDesignation ?? '—' },
                  { icon: Clock, label: 'Experience', value: app.candidate.totalExperience != null ? `${app.candidate.totalExperience} years` : '—' },
                  { icon: Clock, label: 'Notice Period', value: app.candidate.noticePeriodDays != null ? `${app.candidate.noticePeriodDays} days` : '—' },
                  { icon: DollarSign, label: 'Expected Salary', value: app.candidate.expectedSalary ? `₹${(Number(app.candidate.expectedSalary) / 100000).toFixed(1)}L` : '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF6B00]" />
                    <div>
                      <div className="text-xs text-[#64748B]">{label}</div>
                      <div className="font-medium text-[#111827]">{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 border-t border-[#E2E8F0] pt-3">
                {app.candidate.resumeUrl && (
                  <Button variant="outline" size="sm" className="rounded-xl border-[#E2E8F0]" asChild>
                    <a href={app.candidate.resumeUrl} target="_blank" rel="noreferrer">
                      <FileText className="mr-1.5 h-3.5 w-3.5" /> View Resume
                    </a>
                  </Button>
                )}
                {app.candidate.linkedinUrl && (
                  <Button variant="outline" size="sm" className="rounded-xl border-[#E2E8F0]" asChild>
                    <a href={app.candidate.linkedinUrl} target="_blank" rel="noreferrer">
                      <Link2 className="mr-1.5 h-3.5 w-3.5" /> LinkedIn
                    </a>
                  </Button>
                )}
              </div>

              {app.coverLetter && (
                <div className="border-t border-[#E2E8F0] pt-3">
                  <p className="mb-1 text-xs text-[#64748B]">Cover Letter</p>
                  <p className="whitespace-pre-wrap rounded-xl bg-[#F8FAFC] p-3 text-sm leading-relaxed text-[#111827]">{app.coverLetter}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-[#111827]">
                <Star className="h-4 w-4 text-[#FF6B00]" /> Assessment Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              {app.assessmentAttempt?.submittedAt ? (
                <div className="flex items-center gap-6">
                  <div className={`flex h-20 w-20 flex-col items-center justify-center rounded-full font-bold text-white ${
                    app.assessmentAttempt.isPassed ? 'bg-green-500' : 'bg-rose-500'
                  }`}>
                    <span className="text-2xl">{app.assessmentAttempt.score}%</span>
                  </div>
                  <div className="space-y-1">
                    <p className={`text-lg font-semibold ${app.assessmentAttempt.isPassed ? 'text-green-600' : 'text-rose-600'}`}>
                      {app.assessmentAttempt.isPassed ? '✓ Passed' : '✕ Failed'}
                    </p>
                    <p className="text-sm text-[#64748B]">
                      Submitted {new Date(app.assessmentAttempt.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : app.assessmentAttempt ? (
                <p className="text-sm text-[#64748B]">Assessment started but not yet submitted.</p>
              ) : (
                <p className="text-sm text-[#64748B]">No assessment result for this application yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#111827]">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {app.timeline.length === 0 ? (
                <p className="text-sm text-[#64748B]">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {app.timeline.map((t: any, i: number) => (
                    <div key={t.id ?? i} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FF6B00]" />
                        {i < app.timeline.length - 1 && <div className="mt-1 w-0.5 flex-1 bg-[#E2E8F0]" />}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {t.fromStatus && (
                            <>
                              <span className="text-[#64748B]">{stageLabel(t.fromStatus)}</span>
                              <ChevronRight className="h-3 w-3 text-[#64748B]" />
                            </>
                          )}
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={stageBadgeStyle(stageMap[t.toStatus])}>
                            {stageMap[t.toStatus]?.label ?? stageLabel(t.toStatus)}
                          </span>
                        </div>
                        {t.notes && <p className="mt-0.5 text-xs text-[#64748B]">{t.notes}</p>}
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          {new Date(t.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className={cardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#111827]">Change Stage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-[#64748B]">Current Stage</label>
                <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={stageBadgeStyle(stageMap[app.status])}>
                  <CurrentStageIcon className="h-3.5 w-3.5" />
                  {(stageMap[app.status]?.label ?? stageLabel(app.status)).toUpperCase()}
                </div>
              </div>

              {isFinalOutcome ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-xs text-[#64748B]">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  This application has reached a final outcome and is locked — no further stage changes are possible.
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs text-[#64748B]">Select Next Stage</label>
                  <p className="mb-1.5 text-[11px] text-[#94A3B8]">
                    Past stages are locked. You can only move the candidate forward.
                  </p>
                  <div className="max-h-56 divide-y divide-[#E2E8F0] overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white">
                    {selectableStages.map((s: string) => {
                      const isSelected = newStatus === s;
                      const Icon = stageIcon[s] ?? Clock;
                      const stage = stageMap[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewStatus(s)}
                          className={`w-full px-3 py-2.5 text-left transition-colors ${
                            isSelected ? 'bg-[#FFF7ED]' : 'hover:bg-[#FFF7ED]/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                isSelected ? 'border-[#FF6B00]' : 'border-[#CBD5E1]'
                              }`}
                            >
                              {isSelected && <span className="h-2 w-2 rounded-full bg-[#FF6B00]" />}
                            </span>
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                              style={stage ? { backgroundColor: stage.color + '22', color: stage.color } : { backgroundColor: '#F1F5F9', color: '#64748B' }}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wide text-[#111827]">
                              {stage?.label ?? stageLabel(s)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {newStatus === 'REJECTED' && (
                <div>
                  <label className="mb-1 block text-xs text-[#64748B]">Rejection Reason</label>
                  <textarea
                    rows={2}
                    className={textareaClass}
                    placeholder="Why is this candidate being rejected?"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}

              {isInterviewStage && (
                <div className="space-y-3 rounded-xl border border-[#FF6B00]/20 bg-[#FFF7ED] p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#FF6B00]">
                    <Video className="h-4 w-4" />
                    Schedule {interviewMode === 'VIDEO' ? 'video call' : 'interview'}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#64748B]">Date & time</label>
                    <Input
                      type="datetime-local"
                      className={fieldClass}
                      value={interviewAt}
                      onChange={(e) => setInterviewAt(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-[#64748B]">Duration (mins)</label>
                      <Input
                        type="number"
                        min={15}
                        max={480}
                        className={fieldClass}
                        value={interviewDuration}
                        onChange={(e) => setInterviewDuration(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-[#64748B]">Mode</label>
                      <select
                        className={fieldClass}
                        value={interviewMode}
                        onChange={(e) => setInterviewMode(e.target.value as 'VIDEO' | 'IN_PERSON')}
                      >
                        <option value="VIDEO">Video call</option>
                        <option value="IN_PERSON">In person</option>
                      </select>
                    </div>
                  </div>
                  {interviewMode === 'VIDEO' ? (
                    <p className="text-xs text-[#64748B]">
                      A HireFlow video room is created automatically. The candidate gets a join link by email. You can join from this page — no Google Meet or Zoom needed.
                    </p>
                  ) : (
                    <div>
                      <label className="mb-1 block text-xs text-[#64748B]">Location</label>
                      <Input
                        className={fieldClass}
                        placeholder="Office / conference room"
                        value={interviewLocation}
                        onChange={(e) => setInterviewLocation(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {!isFinalOutcome && (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-[#64748B]">Comments</label>
                    <textarea
                      rows={2}
                      className={textareaClass}
                      placeholder="Add a note about this stage change..."
                      value={stageNotes}
                      onChange={(e) => setStageNotes(e.target.value)}
                    />
                  </div>

                  <Button
                    className="h-10 w-full rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]"
                    disabled={!newStatus || isSaving}
                    onClick={handleMoveStage}
                  >
                    {isSaving
                      ? 'Saving...'
                      : isInterviewStage
                        ? 'Schedule Interview & Update Stage'
                        : 'Update Stage'}
                    {!isSaving && <ChevronRight className="ml-1 h-4 w-4" />}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#111827]">Applied For</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-[#111827]">{app.job.title}</p>
              <p className="text-[#64748B]">{app.job.department.name}</p>
              <div className="flex items-center gap-2 text-[#64748B]">
                <Calendar className="h-3.5 w-3.5" />
                Applied {new Date(app.appliedAt).toLocaleDateString()}
              </div>
              {app.source && (
                <p className="text-xs text-[#64748B]">Source: {app.source.name}</p>
              )}
              <Button variant="outline" size="sm" className="mt-2 w-full rounded-xl border-[#E2E8F0]" asChild>
                <Link to={`/jobs/${app.job.id}`}>View Job Posting</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#111827]">Interviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(app.interviews ?? []).length === 0 ? (
                <p className="text-sm text-[#64748B]">
                  No interview scheduled yet. Move to Round 1 / Round 2 / HR Round to create a HireFlow video room.
                </p>
              ) : (
                (app.interviews ?? []).map((interview) => (
                  <div key={interview.id} className="space-y-1.5 rounded-xl border border-[#E2E8F0] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#111827]">{interview.title}</p>
                      <span className="text-[10px] font-semibold uppercase text-[#64748B]">
                        {interview.mode === 'VIDEO' ? 'Video' : 'In person'}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      {new Date(interview.scheduledAt).toLocaleString()} · {interview.durationMinutes} min · {interview.status.replace(/_/g, ' ')}
                    </p>
                    {interview.mode === 'VIDEO' && (interview.meetingToken || interview.meetingLink) ? (
                      <Button variant="outline" size="sm" className="w-full rounded-xl border-[#E2E8F0]" asChild>
                        <a
                          href={interview.meetingToken ? `/interview/call/${interview.meetingToken}?as=hr` : interview.meetingLink!}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Video className="mr-1.5 h-3.5 w-3.5" />
                          Join video call
                        </a>
                      </Button>
                    ) : interview.location ? (
                      <p className="text-xs text-[#64748B]">Location: {interview.location}</p>
                    ) : null}
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" className="w-full rounded-xl border-[#E2E8F0]" asChild>
                <Link to="/interviews">All Interviews</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
