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
  ShieldCheck, Gift, UserCheck, PauseCircle, Hourglass, Video,
} from 'lucide-react';

const PIPELINE = [
  'APPLIED', 'SCREENING', 'SHORTLISTED',
  'INTERVIEW_ROUND_1', 'INTERVIEW_ROUND_2', 'HR_ROUND',
  'SELECTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'JOINED',
];

/** Final outcomes — cannot resume the active pipeline banner */
const FINAL_OUTCOMES = ['REJECTED', 'WITHDRAWN'];
/** Non-pipeline statuses selectable in Change Stage (On Hold is reversible) */
const OUTCOME_STATUSES = ['REJECTED', 'WITHDRAWN', 'ON_HOLD'];

const stageLabel = (s: string) => s.replace(/_/g, ' ');

const INTERVIEW_STAGES = ['INTERVIEW_ROUND_1', 'INTERVIEW_ROUND_2', 'HR_ROUND'] as const;

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

const stageColor: Record<string, string> = {
  APPLIED: 'bg-blue-100 text-blue-700',
  SCREENING: 'bg-yellow-100 text-yellow-700',
  SHORTLISTED: 'bg-purple-100 text-purple-700',
  INTERVIEW_ROUND_1: 'bg-orange-100 text-orange-700',
  INTERVIEW_ROUND_2: 'bg-orange-100 text-orange-700',
  HR_ROUND: 'bg-orange-100 text-orange-700',
  SELECTED: 'bg-green-100 text-green-700',
  OFFER_SENT: 'bg-green-100 text-green-700',
  OFFER_ACCEPTED: 'bg-green-100 text-green-700',
  JOINED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-700',
  ON_HOLD: 'bg-gray-100 text-gray-700',
};

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

const stageIconTone: Record<string, string> = {
  APPLIED: 'bg-blue-50 text-blue-600',
  SCREENING: 'bg-emerald-50 text-emerald-600',
  SHORTLISTED: 'bg-purple-50 text-purple-600',
  INTERVIEW_ROUND_1: 'bg-orange-50 text-orange-600',
  INTERVIEW_ROUND_2: 'bg-amber-50 text-amber-600',
  HR_ROUND: 'bg-sky-50 text-sky-600',
  SELECTED: 'bg-green-50 text-green-600',
  OFFER_SENT: 'bg-green-50 text-green-600',
  OFFER_ACCEPTED: 'bg-green-50 text-green-600',
  JOINED: 'bg-green-50 text-green-600',
  REJECTED: 'bg-red-50 text-red-600',
  WITHDRAWN: 'bg-gray-50 text-gray-600',
  ON_HOLD: 'bg-gray-50 text-gray-600',
};

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const filterJobId = (location.state as { filterJobId?: string } | null)?.filterJobId;
  const queryClient = useQueryClient();

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [interviewAt, setInterviewAt] = useState(defaultInterviewDateTime);
  const [interviewDuration, setInterviewDuration] = useState('60');
  const [interviewMode, setInterviewMode] = useState<'VIDEO' | 'IN_PERSON'>('VIDEO');
  const [meetingLink, setMeetingLink] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });

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
    setMeetingLink('');
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

  const scheduleMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => interviewsApi.create(payload),
    onSuccess: () => {
      invalidateApplication();
      toast({ title: 'Interview scheduled', variant: 'success' });
      resetStageForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const isInterviewStage = INTERVIEW_STAGES.includes(newStatus as (typeof INTERVIEW_STAGES)[number]);
  const isSaving = statusMutation.isPending || scheduleMutation.isPending;

  const handleMoveStage = () => {
    if (!newStatus || !app) return;

    if (isInterviewStage) {
      if (interviewMode === 'VIDEO' && !meetingLink.trim()) {
        toast({ title: 'Meeting link is required for a video interview', variant: 'destructive' });
        return;
      }
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
        meetingLink: interviewMode === 'VIDEO' ? meetingLink.trim() : undefined,
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

  if (isLoading) return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  if (!app) return <div className="text-center py-20 text-muted-foreground">Application not found</div>;

  const currentStageIdx = PIPELINE.indexOf(app.status);
  const isFinalOutcome = FINAL_OUTCOMES.includes(app.status);
  const isOnHold = app.status === 'ON_HOLD';
  const CurrentStageIcon = app.status === 'SCREENING'
    ? Hourglass
    : (stageIcon[app.status] ?? Clock);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(filterJobId ? `/applications?jobId=${encodeURIComponent(filterJobId)}` : '/applications')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {app.candidate.firstName} {app.candidate.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{app.job.title} · {app.job.department.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEmailModal(true)}>
          <Send className="h-3.5 w-3.5 mr-1.5" /> Send Email
        </Button>
        <div className={`px-4 py-1.5 rounded-full text-sm font-semibold ${stageColor[app.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {stageLabel(app.status)}
        </div>
      </div>

      {showEmailModal && (
        <SendEmailModal
          applicationId={app.id}
          candidateEmail={app.candidate.email}
          candidateName={`${app.candidate.firstName} ${app.candidate.lastName}`}
          jobTitle={app.job.title}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {/* Pipeline Progress */}
      {!isFinalOutcome && !isOnHold && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {PIPELINE.map((stage, idx) => {
                const done = idx < currentStageIdx;
                const active = idx === currentStageIdx;
                return (
                  <div key={stage} className="flex items-center flex-shrink-0">
                    <div className={`flex flex-col items-center gap-1 px-1 ${active ? 'scale-105' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        done ? 'bg-primary text-primary-foreground' :
                        active ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <span className={`text-[10px] text-center max-w-[60px] leading-tight ${active ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                        {stageLabel(stage)}
                      </span>
                    </div>
                    {idx < PIPELINE.length - 1 && (
                      <div className={`h-0.5 w-6 flex-shrink-0 mb-4 ${done ? 'bg-primary' : 'bg-muted'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isOnHold && (
        <div className="rounded-lg px-4 py-3 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800">
          <PauseCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Application On Hold</p>
            <p className="text-sm opacity-80 mt-0.5">
              Use Change Stage to resume this candidate into an active recruitment stage.
            </p>
          </div>
        </div>
      )}

      {isFinalOutcome && (
        <div className={`rounded-lg px-4 py-3 flex items-center gap-3 ${
          app.status === 'REJECTED' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-gray-50 border border-gray-200 text-gray-700'
        }`}>
          <XCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Application {stageLabel(app.status)}</p>
            {app.rejectionReason && <p className="text-sm opacity-80 mt-0.5">Reason: {app.rejectionReason}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Candidate Info */}
        <div className="col-span-2 space-y-4">
          {/* Candidate Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Candidate Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
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
                    <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="text-muted-foreground text-xs">{label}</div>
                      <div className="font-medium">{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2 border-t">
                {app.candidate.resumeUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={app.candidate.resumeUrl} target="_blank" rel="noreferrer">
                      <FileText className="h-3.5 w-3.5 mr-1.5" /> View Resume
                    </a>
                  </Button>
                )}
                {app.candidate.linkedinUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={app.candidate.linkedinUrl} target="_blank" rel="noreferrer">
                      <Link2 className="h-3.5 w-3.5 mr-1.5" /> LinkedIn
                    </a>
                  </Button>
                )}
              </div>

              {app.coverLetter && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Cover Letter</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-3 leading-relaxed">{app.coverLetter}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assessment Result */}
          {app.assessmentAttempt && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4" /> Assessment Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                {app.assessmentAttempt.submittedAt ? (
                  <div className="flex items-center gap-6">
                    <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-white font-bold ${
                      app.assessmentAttempt.isPassed ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      <span className="text-2xl">{app.assessmentAttempt.score}%</span>
                    </div>
                    <div className="space-y-1">
                      <p className={`font-semibold text-lg ${app.assessmentAttempt.isPassed ? 'text-green-600' : 'text-red-600'}`}>
                        {app.assessmentAttempt.isPassed ? '✓ Passed' : '✗ Did not pass'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Submitted {new Date(app.assessmentAttempt.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Assessment started but not yet submitted.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stage Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {app.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {app.timeline.map((t: any, i: number) => (
                    <div key={t.id ?? i} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        {i < app.timeline.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {t.fromStatus && (
                            <>
                              <span className="text-muted-foreground">{stageLabel(t.fromStatus)}</span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColor[t.toStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                            {stageLabel(t.toStatus)}
                          </span>
                        </div>
                        {t.notes && <p className="text-muted-foreground mt-0.5 text-xs">{t.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
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

        {/* Right: Actions */}
        <div className="space-y-4">
          {/* Move Stage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Change Stage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Current Stage</label>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${stageColor[app.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  <CurrentStageIcon className="h-3.5 w-3.5" />
                  {stageLabel(app.status).toUpperCase()}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Select Next Stage</label>
                <div className="max-h-56 overflow-y-auto rounded-lg border bg-white divide-y divide-border">
                  {[...PIPELINE, ...OUTCOME_STATUSES].map((s) => {
                    const isCurrent = s === app.status;
                    const isSelected = newStatus === s;
                    const Icon = stageIcon[s] ?? Clock;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={isCurrent}
                        onClick={() => setNewStatus(s)}
                        className={`w-full text-left px-3 py-2.5 transition-colors ${
                          isCurrent
                            ? 'cursor-not-allowed bg-muted/30'
                            : isSelected
                              ? 'bg-blue-50'
                              : 'hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-primary'
                                : 'border-muted-foreground/35'
                            }`}
                          >
                            {isSelected && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                          </span>
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${stageIconTone[s] ?? 'bg-gray-50 text-gray-600'}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                            {stageLabel(s)}
                          </span>
                          {isCurrent && (
                            <span className="text-xs font-medium text-emerald-600">(current)</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {newStatus === 'REJECTED' && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Rejection Reason</label>
                  <textarea
                    rows={2}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                    placeholder="Why is this candidate being rejected?"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}

              {isInterviewStage && (
                <div className="rounded-lg border bg-orange-50/60 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-800">
                    <Video className="h-4 w-4" />
                    Schedule {interviewMode === 'VIDEO' ? 'video call' : 'interview'}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Date & time</label>
                    <Input
                      type="datetime-local"
                      value={interviewAt}
                      onChange={(e) => setInterviewAt(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Duration (mins)</label>
                      <Input
                        type="number"
                        min={15}
                        max={480}
                        value={interviewDuration}
                        onChange={(e) => setInterviewDuration(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Mode</label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={interviewMode}
                        onChange={(e) => setInterviewMode(e.target.value as 'VIDEO' | 'IN_PERSON')}
                      >
                        <option value="VIDEO">Video call</option>
                        <option value="IN_PERSON">In person</option>
                      </select>
                    </div>
                  </div>
                  {interviewMode === 'VIDEO' ? (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Meeting link (Google Meet / Zoom)</label>
                      <Input
                        type="url"
                        placeholder="https://meet.google.com/..."
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Location</label>
                      <Input
                        placeholder="Office / conference room"
                        value={interviewLocation}
                        onChange={(e) => setInterviewLocation(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Comments</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  placeholder="Add a note about this stage change..."
                  value={stageNotes}
                  onChange={(e) => setStageNotes(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                disabled={!newStatus || isSaving}
                onClick={handleMoveStage}
              >
                {isSaving
                  ? 'Saving...'
                  : isInterviewStage
                    ? 'Schedule Interview & Update Stage'
                    : 'Update Stage'}
                {!isSaving && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </CardContent>
          </Card>

          {/* Job Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Applied For</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="font-semibold">{app.job.title}</p>
              <p className="text-muted-foreground">{app.job.department.name}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Applied {new Date(app.appliedAt).toLocaleDateString()}
              </div>
              {app.source && (
                <p className="text-xs text-muted-foreground">Source: {app.source.name}</p>
              )}
              <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                <Link to={`/jobs/${app.job.id}`}>View Job Posting</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Interviews */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Interviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(app.interviews ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No interview scheduled yet. Move to Round 1 / Round 2 / HR Round and add a video meeting link.
                </p>
              ) : (
                (app.interviews ?? []).map((interview) => (
                  <div key={interview.id} className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{interview.title}</p>
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                        {interview.mode === 'VIDEO' ? 'Video' : 'In person'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(interview.scheduledAt).toLocaleString()} · {interview.durationMinutes} min · {interview.status.replace(/_/g, ' ')}
                    </p>
                    {interview.mode === 'VIDEO' && interview.meetingLink ? (
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={interview.meetingLink} target="_blank" rel="noreferrer">
                          <Video className="h-3.5 w-3.5 mr-1.5" />
                          Join video call
                        </a>
                      </Button>
                    ) : interview.location ? (
                      <p className="text-xs text-muted-foreground">Location: {interview.location}</p>
                    ) : null}
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/interviews">All Interviews</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
