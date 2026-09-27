import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi, type AssignmentResultAttempt } from '@/api/assessments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { AlertTriangle, ArrowLeft, CheckCircle2, Circle, Download, Mail, MessageSquare, RefreshCw, ThumbsDown, ThumbsUp, TrendingUp, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

// ─── Personality profile types ────────────────────────────────────────────────

interface PersonalityResult {
  tH: number | null; tES: number | null; tX: number | null;
  tA: number | null; tC: number | null; tO: number | null;
  sjtWork: number | null; sjtSafety: number | null; sjtLeadership: number | null;
  tRES: number | null; tADA: number | null; tACH: number | null;
  imFlagged: boolean; infFlagged: boolean; consFlagged: boolean;
  confidenceScore: number;
  compLeadership: number | null; compDecisionStyle: string | null;
  compLearningAgility: number | null; compAccountability: number | null;
  compIntegrity: number | null; compTeamCompatibility: number | null;
  compCommStyle: string | null; compEmotionalResilience: number | null;
  compAdaptability: number | null; compRiskAppetite: number | null;
  compConflictStyle: string | null; compStressBand: string | null;
  derailerFlags: string[];
  archetype: string | null;
  roleFitScores: Record<string, number>;
  fitBand: string | null;
  interviewProbes: string[];
}

const TRAIT_META: Record<string, { label: string; color: string }> = {
  H:  { label: 'Honesty-Humility',    color: '#7c3aed' },
  ES: { label: 'Emotional Stability', color: '#0891b2' },
  X:  { label: 'Extraversion',        color: '#d97706' },
  A:  { label: 'Agreeableness',       color: '#16a34a' },
  C:  { label: 'Conscientiousness',   color: '#b45309' },
  O:  { label: 'Openness',            color: '#be185d' },
};

const DERAILER_COLORS: Record<string, string> = {
  'Integrity risk': 'bg-red-100 text-red-700 border-red-200',
  'Volatility': 'bg-orange-100 text-orange-700 border-orange-200',
  'Abrasiveness': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Micromanagement / rigidity': 'bg-purple-100 text-purple-700 border-purple-200',
  'Overpromising': 'bg-blue-100 text-blue-700 border-blue-200',
  'Passivity': 'bg-slate-100 text-slate-700 border-slate-200',
  'Recklessness': 'bg-red-100 text-red-700 border-red-200',
  'Impression management': 'bg-amber-100 text-amber-700 border-amber-200',
};

function TraitBar({ label, t, color }: { label: string; t: number | null; color: string }) {
  if (t == null) return null;
  const pct = Math.round(((t - 20) / 60) * 100);
  const normLow  = Math.round(((40 - 20) / 60) * 100);
  const normHigh = Math.round(((60 - 20) / 60) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold" style={{ color }}>{t}</span>
      </div>
      <div className="relative h-4 bg-slate-100 rounded overflow-hidden">
        {/* norm band */}
        <div
          className="absolute top-0 bottom-0 bg-slate-200/70"
          style={{ left: `${normLow}%`, width: `${normHigh - normLow}%` }}
        />
        {/* score bar */}
        <div
          className="absolute top-0 bottom-0 rounded"
          style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color, opacity: 0.85 }}
        />
      </div>
    </div>
  );
}

function PersonalityProfileCard({ result }: { result: PersonalityResult }) {
  const traits = [
    { key: 'H', t: result.tH }, { key: 'ES', t: result.tES }, { key: 'X', t: result.tX },
    { key: 'A', t: result.tA }, { key: 'C', t: result.tC },  { key: 'O', t: result.tO },
  ];

  const composites = [
    { label: 'Accountability',        v: result.compAccountability },
    { label: 'Integrity & Ethics',    v: result.compIntegrity },
    { label: 'Emotional Resilience',  v: result.compEmotionalResilience },
    { label: 'Team Compatibility',    v: result.compTeamCompatibility },
    { label: 'Learning Agility',      v: result.compLearningAgility },
    { label: 'Adaptability',          v: result.compAdaptability },
    { label: 'Leadership Potential',  v: result.compLeadership },
    { label: 'Risk Appetite',         v: result.compRiskAppetite },
  ].filter((c) => c.v != null);

  const topRoles = Object.entries(result.roleFitScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const fitColor = result.fitBand === 'Strong Fit' ? 'text-green-600'
    : result.fitBand === 'Fit' ? 'text-blue-600'
    : result.fitBand === 'Conditional' ? 'text-amber-600'
    : 'text-red-600';

  const confidenceColor = result.confidenceScore >= 80 ? 'text-green-600'
    : result.confidenceScore >= 60 ? 'text-amber-600'
    : 'text-red-600';

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-[#FF6B00]/30 bg-[#FFF7ED]">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#b45309] font-semibold mb-1">TalentSignal™ Profile</p>
              <p className="text-2xl font-bold text-slate-800">{result.archetype ?? 'Profile'}</p>
              <p className={cn('text-sm font-semibold mt-1', fitColor)}>{result.fitBand ?? '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Confidence Score</p>
              <p className={cn('text-3xl font-bold', confidenceColor)}>{result.confidenceScore}/100</p>
              {result.confidenceScore < 60 && (
                <p className="text-xs text-red-600 mt-0.5">Interpret with caution — verify at interview</p>
              )}
            </div>
          </div>
          {/* Validity flags */}
          {(result.imFlagged || result.infFlagged || result.consFlagged) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {result.imFlagged && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                  <AlertTriangle className="h-3 w-3" /> Impression Management flagged
                </span>
              )}
              {result.infFlagged && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                  <AlertTriangle className="h-3 w-3" /> Attention check failed
                </span>
              )}
              {result.consFlagged && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                  <AlertTriangle className="h-3 w-3" /> Consistency flag
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* HEXACO Trait Bars */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">HEXACO Traits (T-scores)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Shaded band = norm range (T 40–60)</p>
            {traits.map(({ key, t }) => (
              <TraitBar
                key={key}
                label={TRAIT_META[key]!.label}
                t={t}
                color={TRAIT_META[key]!.color}
              />
            ))}
            {result.sjtWork != null && (
              <>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">SJT Scores</p>
                  <TraitBar label="Work Judgment" t={result.sjtWork} color="#64748b" />
                  <div className="mt-2"><TraitBar label="Safety Judgment" t={result.sjtSafety} color="#0f766e" /></div>
                  {result.sjtLeadership != null && (
                    <div className="mt-2"><TraitBar label="Leadership Judgment" t={result.sjtLeadership} color="#7c3aed" /></div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Composites + Styles */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Composite Scores</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {composites.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="font-semibold tabular-nums">{Math.round(c.v!)}</span>
                </div>
              ))}
              {result.compDecisionStyle && (
                <div className="flex items-center justify-between text-sm pt-1 border-t">
                  <span className="text-muted-foreground">Decision Style</span>
                  <Badge variant="secondary">{result.compDecisionStyle}</Badge>
                </div>
              )}
              {result.compCommStyle && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Communication Style</span>
                  <Badge variant="secondary">{result.compCommStyle}</Badge>
                </div>
              )}
              {result.compConflictStyle && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Conflict Style</span>
                  <Badge variant="secondary">{result.compConflictStyle}</Badge>
                </div>
              )}
              {result.compStressBand && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stress Response</span>
                  <Badge variant="secondary">{result.compStressBand}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role fit */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Role-Fit Scores</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {topRoles.map(([role, score]) => (
                <div key={role} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate pr-2">{role}</span>
                  <span className={cn('font-semibold tabular-nums',
                    score >= 70 ? 'text-green-600' : score >= 55 ? 'text-blue-600' : score >= 40 ? 'text-amber-600' : 'text-red-500'
                  )}>{score}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">≥70 Strong Fit · 55–69 Fit · 40–54 Conditional · &lt;40 Low Fit</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Derailer flags */}
      {result.derailerFlags.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Potential Risk Flags — Verify at Interview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.derailerFlags.map((flag) => (
                <span key={flag} className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', DERAILER_COLORS[flag] ?? 'bg-slate-100 text-slate-700')}>
                  {flag}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Flags indicate situational risks to probe at interview — not character verdicts. Each flag generates behavioural interview questions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Hiring verdict ───────────────────────────────────────────────────────────

type Verdict = 'MOVE_FORWARD' | 'HOLD' | 'PASS';

function deriveVerdict(result: PersonalityResult): {
  verdict: Verdict;
  headline: string;
  reason: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const hardDerailers = ['Integrity risk', 'Volatility', 'Recklessness'];
  const hasHardDerailer = result.derailerFlags.some((f) => hardDerailers.includes(f));
  const lowConfidence = result.confidenceScore < 60;

  if (hasHardDerailer || result.fitBand === 'Low Fit') {
    return {
      verdict: 'PASS',
      headline: 'Not recommended at this stage',
      reason: hasHardDerailer
        ? `Profile shows ${result.derailerFlags.filter((f) => hardDerailers.includes(f)).join(', ')} — significant risk for this role. Probe deeply at interview before proceeding.`
        : 'Role-fit scores indicate a poor match with SRJ\'s work environment requirements.',
      color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200',
    };
  }

  if (lowConfidence || result.fitBand === 'Conditional') {
    return {
      verdict: 'HOLD',
      headline: 'Conditional — verify at interview',
      reason: lowConfidence
        ? `Assessment confidence is low (${result.confidenceScore}/100). Results may not fully reflect the candidate's profile. Use interview probes below to validate.`
        : 'Role fit is conditional. Strengths present but some gaps need structured interview follow-up.',
      color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200',
    };
  }

  return {
    verdict: 'MOVE_FORWARD',
    headline: result.fitBand === 'Strong Fit' ? 'Strong recommendation to proceed' : 'Recommended to proceed',
    reason: `${result.fitBand} for the target role. Profile aligns with SRJ\'s operational environment. Confirm cultural fit at interview.`,
    color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200',
  };
}

const TRAIT_GROWTH: Record<string, { area: string; tip: string }> = {
  H:  { area: 'Integrity & Transparency', tip: 'Probe honesty under pressure. Set clear expectations on compliance from day one.' },
  ES: { area: 'Stress Management', tip: 'Pair with a stable team lead. Avoid high-pressure solo assignments early on.' },
  X:  { area: 'Assertiveness', tip: 'Encourage them to voice concerns. Create a psychologically safe environment to speak up.' },
  A:  { area: 'Collaboration', tip: 'Brief them on teamwork norms. Monitor peer feedback in first 90 days.' },
  C:  { area: 'Follow-through & Structure', tip: 'Use checklists and clear deadlines. Check-ins more frequently in the first month.' },
  O:  { area: 'Adaptability to Change', tip: 'Introduce process changes gradually. Give advance notice and rationale for shifts.' },
};

function GrowthAreasCard({ result }: { result: PersonalityResult }) {
  const traits: Array<{ key: string; t: number | null }> = [
    { key: 'H', t: result.tH }, { key: 'ES', t: result.tES },
    { key: 'X', t: result.tX }, { key: 'A', t: result.tA },
    { key: 'C', t: result.tC }, { key: 'O', t: result.tO },
  ];

  const growthAreas = traits.filter((tr) => tr.t != null && tr.t < 45);
  const strengths = traits.filter((tr) => tr.t != null && tr.t >= 60);

  if (growthAreas.length === 0 && strengths.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          Strengths &amp; Growth Areas
        </CardTitle>
        <p className="text-xs text-muted-foreground">Where this candidate will thrive, and where they'll need support at SRJ</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Key Strengths</p>
            <div className="space-y-1.5">
              {strengths.map(({ key, t }) => (
                <div key={key} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>
                    <span className="font-medium">{TRAIT_META[key]!.label}</span>
                    <span className="text-muted-foreground"> (T={t}) — above average, a reliable strength on the floor.</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {growthAreas.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Areas Needing Support</p>
            <div className="space-y-3">
              {growthAreas.map(({ key, t }) => {
                const meta = TRAIT_GROWTH[key]!;
                return (
                  <div key={key} className="border rounded-md p-3 bg-amber-50/50 space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-sm font-medium">{meta.area}</span>
                      <span className="text-xs text-muted-foreground ml-auto">T={t}</span>
                    </div>
                    <p className="text-xs text-slate-600 pl-5">{meta.tip}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HiringVerdictCard({ result, candidateName }: { result: PersonalityResult; candidateName: string }) {
  const { verdict, headline, reason, color, bgColor, borderColor } = deriveVerdict(result);

  const topRole = Object.entries(result.roleFitScores).sort(([, a], [, b]) => b - a)[0];
  const bestRoleScore = topRole?.[1] ?? 0;
  const bestRoleName = topRole?.[0] ?? '—';

  const isGoodFitForSRJ = result.fitBand === 'Strong Fit' || result.fitBand === 'Fit';
  const candidateWillThrive = bestRoleScore >= 60;

  return (
    <div className="space-y-3">
      {/* Main verdict */}
      <Card className={cn('border-2', borderColor, bgColor)}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {verdict === 'MOVE_FORWARD' && <ThumbsUp className={cn('h-6 w-6', color)} />}
              {verdict === 'HOLD' && <AlertTriangle className={cn('h-6 w-6', color)} />}
              {verdict === 'PASS' && <ThumbsDown className={cn('h-6 w-6', color)} />}
            </div>
            <div className="flex-1">
              <p className={cn('font-bold text-lg', color)}>{headline}</p>
              <p className="text-sm text-slate-600 mt-1">{reason}</p>
            </div>
            <Badge className={cn('shrink-0 mt-0.5', color, bgColor, borderColor, 'border')}>
              {verdict === 'MOVE_FORWARD' ? 'Proceed' : verdict === 'HOLD' ? 'Hold' : 'Pass'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Two-sided fit summary */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Is SRJ right for {candidateName.split(' ')[0]}?</p>
            <div className="flex items-start gap-2">
              {candidateWillThrive
                ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                : <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
              <p className="text-sm">
                {candidateWillThrive ? (
                  <>Best matched for <strong>{bestRoleName}</strong> (score {bestRoleScore}). SRJ's environment aligns well with this profile.</>
                ) : (
                  <>Best role match is <strong>{bestRoleName}</strong> (score {bestRoleScore}). SRJ may not be the optimal environment — they may underperform or disengage.</>
                )}
              </p>
            </div>
            {!candidateWillThrive && (
              <p className="text-xs text-muted-foreground mt-2 pl-6">
                Consider whether the role and team culture fit their working style before proceeding.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Is {candidateName.split(' ')[0]} right for SRJ?</p>
            <div className="flex items-start gap-2">
              {isGoodFitForSRJ
                ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                : <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
              <p className="text-sm">
                {isGoodFitForSRJ ? (
                  <>Overall fit band is <strong>{result.fitBand}</strong>. Behavioural profile meets SRJ's role requirements.</>
                ) : (
                  <>Overall fit band is <strong>{result.fitBand}</strong>. Profile has gaps vs. SRJ's operational role demands.</>
                )}
              </p>
            </div>
            {result.derailerFlags.length > 0 && (
              <p className="text-xs text-amber-700 mt-2 pl-6">
                Risk flags present: {result.derailerFlags.join(', ')}. Probe at interview.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InterviewProbesCard({ probes }: { probes: string[] }) {
  if (!probes.length) return null;
  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          Suggested Interview Questions
        </CardTitle>
        <p className="text-xs text-muted-foreground">Tailored to this candidate's profile — probe areas flagged by the assessment</p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {probes.map((probe, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-slate-700">{probe}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

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

const PERSONALITY_QUESTION_TYPES = new Set(['RATING_SCALE_5', 'FORCED_CHOICE']);

function isPersonalityQuestion(questionType: string, assessmentType: string) {
  return assessmentType === 'PERSONALITY' || PERSONALITY_QUESTION_TYPES.has(questionType);
}

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
  const [confirm, setConfirm] = useState<'retake' | 'increase' | null>(null);
  const [resendOpen, setResendOpen] = useState(false);
  const [resendEmail, setResendEmail] = useState('');

  const [downloadingReport, setDownloadingReport] = useState(false);

  const handleDownloadReport = async () => {
    if (!id || !assignmentId) return;
    setDownloadingReport(true);
    try {
      const res = await assessmentsApi.downloadReport(id, assignmentId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `personality-report-${assignmentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Download failed', description: 'Could not generate report. Ensure the candidate has completed the assessment.', variant: 'destructive' });
    } finally {
      setDownloadingReport(false);
    }
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['assessment-assignment-result', id, assignmentId],
    queryFn: () => assessmentsApi.getAssignmentResult(id!, assignmentId!).then((r) => r.data.data),
    enabled: !!id && !!assignmentId,
  });

  const resendMutation = useMutation({
    mutationFn: (email: string) => assessmentsApi.resendInvite(id!, assignmentId!, email || undefined),
    onSuccess: (res) => {
      toast({ title: `Invite sent to ${res.data.data.email}`, description: 'Link valid for 48 hours.', variant: 'success' });
      setResendOpen(false);
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

  const { candidate, assessment, application, job, assignment, attempts, passingPercentage, personalityResult } = data as typeof data & { personalityResult?: PersonalityResult | null };

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
          {personalityResult && (
            <Button variant="outline" onClick={handleDownloadReport} disabled={downloadingReport}>
              <Download className="h-4 w-4 mr-1.5" />
              {downloadingReport ? 'Generating…' : 'Download Report'}
            </Button>
          )}
          <Button variant="outline" onClick={() => { setResendEmail(candidate.email ?? ''); setResendOpen(true); }}>
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
                      {assessment.assessmentType === 'PERSONALITY' ? (
                        <Badge variant={attempt.completedAt ? 'default' : 'outline'}>
                          {attempt.completedAt ? 'Completed' : 'In progress'}
                        </Badge>
                      ) : attempt.result ? (
                        <Badge variant={attempt.result === 'PASSED' ? 'default' : 'secondary'}>
                          {attempt.result}
                        </Badge>
                      ) : (
                        <Badge variant="outline">In progress</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      <span>{attempt.completedAt ? 'Completed' : 'Started'}</span>
                      {assessment.assessmentType !== 'PERSONALITY' && (
                        <span>{attempt.percentage != null ? `${attempt.percentage}%` : '—'}</span>
                      )}
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
              {assessment.assessmentType === 'PERSONALITY' ? (
                <div>
                  <p className="text-xs text-muted-foreground">Questions Answered</p>
                  <p className="font-medium">
                    {selectedAttempt.completedAt
                      ? `${selectedAttempt.questions.filter((q) => q.outcome !== 'UNANSWERED').length} / ${selectedAttempt.questions.length}`
                      : '—'}
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Result</p>
                    <p className="font-medium">{selectedAttempt.result ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="font-medium">
                      {selectedAttempt.completedAt
                        ? `${selectedAttempt.obtainedMarks ?? '—'} / ${selectedAttempt.totalMarks ?? '—'}`
                        : '—'}
                    </p>
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
                </>
              )}
            </CardContent>
          </Card>

          <AssessmentRecordingsSection assessmentId={id!} attempt={selectedAttempt} />

          {personalityResult && selectedAttempt.isLatest && (
            <>
              <HiringVerdictCard
                result={personalityResult}
                candidateName={`${candidate.firstName} ${candidate.lastName}`}
              />
              <PersonalityProfileCard result={personalityResult} />
              <GrowthAreasCard result={personalityResult} />
              <InterviewProbesCard probes={personalityResult.interviewProbes ?? []} />
            </>
          )}

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
              selectedAttempt.questions.map((q) => {
                const isPersonality = isPersonalityQuestion(q.questionType, assessment.assessmentType);
                const answered = q.outcome !== 'UNANSWERED';
                const cardStyle = isPersonality
                  ? (answered ? 'border-blue-200 bg-blue-50' : OUTCOME_STYLES.UNANSWERED)
                  : OUTCOME_STYLES[q.outcome];
                return (
                  <Card key={q.attemptQuestionId} className={cn('border', cardStyle)}>
                    <CardContent className="pt-4 pb-4 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-xs text-muted-foreground">Question {q.number}</p>
                          <p className="font-medium mt-0.5">{q.questionText}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPersonality ? (
                            answered
                              ? <CheckCircle2 className="h-4 w-4 text-blue-600" />
                              : <Circle className="h-4 w-4 text-slate-400" />
                          ) : (
                            <>
                              {q.outcome === 'CORRECT' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              {q.outcome === 'INCORRECT' && <XCircle className="h-4 w-4 text-red-600" />}
                              {q.outcome === 'UNANSWERED' && <Circle className="h-4 w-4 text-slate-400" />}
                            </>
                          )}
                          <Badge variant="outline">
                            {isPersonality ? (answered ? 'ANSWERED' : 'UNANSWERED') : q.outcome}
                          </Badge>
                        </div>
                      </div>

                      {q.options.length > 0 && (
                        <div className="space-y-1.5">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={cn(
                                'flex items-center gap-2 text-sm rounded px-2 py-1',
                                isPersonality
                                  ? opt.isSelected && 'bg-blue-100'
                                  : [
                                      opt.isSelected && opt.isCorrect && 'bg-green-100',
                                      opt.isSelected && !opt.isCorrect && 'bg-red-100',
                                      !opt.isSelected && opt.isCorrect && 'bg-green-50',
                                    ]
                              )}
                            >
                              <span className="text-base leading-none">
                                {opt.isSelected ? '●' : '○'}
                              </span>
                              <span>{opt.optionText}</span>
                              {!isPersonality && opt.isCorrect && (
                                <span className="text-[10px] uppercase text-green-700 font-medium">Correct</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={cn('grid gap-3 text-sm pt-1 border-t', isPersonality ? 'grid-cols-1' : 'sm:grid-cols-3')}>
                        <div>
                          <p className="text-xs text-muted-foreground">Candidate Answer</p>
                          <p className="font-medium">{q.candidateAnswer ?? '—'}</p>
                        </div>
                        {!isPersonality && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground">Correct Answer</p>
                              <p className="font-medium">{q.correctAnswer ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Marks</p>
                              <p className="font-medium">{q.marksGiven} / {q.marks}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Resend email modal */}
      {resendOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" /> Resend Assessment Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>The link will be valid for <strong>48 hours</strong> from now.</p>
                <p>You can send it to a different email address if needed.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Send to email</label>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="candidate@email.com"
                />
                {resendEmail !== candidate.email && candidate.email && (
                  <p className="text-xs text-amber-600">
                    Different from candidate's registered email ({candidate.email}).{' '}
                    <button className="underline" onClick={() => setResendEmail(candidate.email ?? '')}>Reset</button>
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setResendOpen(false)} disabled={resendMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => resendMutation.mutate(resendEmail)}
                  disabled={!resendEmail || resendMutation.isPending}
                >
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  {resendMutation.isPending ? 'Sending…' : 'Send Link'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
