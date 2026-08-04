import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '@/api/applications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import SendEmailModal from '@/components/SendEmailModal';
import {
  ArrowLeft, FileText, Link2, Mail, Phone, Briefcase,
  Clock, Star, CheckCircle2, XCircle, ChevronRight, User,
  Calendar, DollarSign, Building2, Send
} from 'lucide-react';

const PIPELINE = [
  'APPLIED', 'SCREENING', 'SHORTLISTED',
  'INTERVIEW_ROUND_1', 'INTERVIEW_ROUND_2', 'HR_ROUND',
  'SELECTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'JOINED',
];

const TERMINAL = ['REJECTED', 'WITHDRAWN', 'ON_HOLD'];

const stageLabel = (s: string) => s.replace(/_/g, ' ');

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

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showMoveStage, setShowMoveStage] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; notes?: string; rejectionReason?: string }) =>
      applicationsApi.updateStatus(id!, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      toast({ title: `Stage moved to ${stageLabel(res.data.data.status)}`, variant: 'success' });
      setShowMoveStage(false);
      setNewStatus('');
      setStageNotes('');
      setRejectionReason('');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const handleMoveStage = () => {
    if (!newStatus) return;
    statusMutation.mutate({
      status: newStatus,
      notes: stageNotes || undefined,
      rejectionReason: (newStatus === 'REJECTED' ? rejectionReason : undefined),
    });
  };

  if (isLoading) return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  if (!app) return <div className="text-center py-20 text-muted-foreground">Application not found</div>;

  const currentStageIdx = PIPELINE.indexOf(app.status);
  const isTerminal = TERMINAL.includes(app.status);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/applications')}>
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
      {!isTerminal && (
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-0 overflow-x-auto">
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

      {isTerminal && (
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
                    <a href={`http://localhost:5000${app.candidate.resumeUrl}`} target="_blank" rel="noreferrer">
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
              <CardTitle className="text-base">Move Stage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!showMoveStage ? (
                <Button className="w-full" onClick={() => setShowMoveStage(true)}>
                  Change Stage
                </Button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Select next stage</label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="">Select stage...</option>
                      <optgroup label="Pipeline">
                        {PIPELINE.map((s) => (
                          <option key={s} value={s} disabled={s === app.status}>
                            {stageLabel(s)}{s === app.status ? ' (current)' : ''}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Close">
                        {TERMINAL.map((s) => (
                          <option key={s} value={s}>{stageLabel(s)}</option>
                        ))}
                      </optgroup>
                    </select>
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

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
                    <textarea
                      rows={2}
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                      placeholder="Add a note about this stage change..."
                      value={stageNotes}
                      onChange={(e) => setStageNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={!newStatus || statusMutation.isPending}
                      onClick={handleMoveStage}
                    >
                      {statusMutation.isPending ? 'Saving...' : 'Confirm'}
                    </Button>
                    <Button variant="outline" onClick={() => { setShowMoveStage(false); setNewStatus(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Quick stage shortcuts */}
              {!showMoveStage && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs text-muted-foreground">Quick actions</p>
                  {['SCREENING', 'SHORTLISTED', 'INTERVIEW_ROUND_1', 'SELECTED', 'REJECTED'].map((s) => (
                    s !== app.status && (
                      <button
                        key={s}
                        onClick={() => statusMutation.mutate({ status: s })}
                        disabled={statusMutation.isPending}
                        className={`w-full text-left text-xs px-3 py-1.5 rounded border transition-colors hover:opacity-80 ${stageColor[s]}`}
                      >
                        → Move to {stageLabel(s)}
                      </button>
                    )
                  ))}
                </div>
              )}
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
          {app._count.interviews > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Interviews</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{app._count.interviews} interview(s) scheduled</p>
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View Interviews
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
