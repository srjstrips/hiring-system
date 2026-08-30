/**
 * TalentSignal™ Personality Scoring Engine
 * Implements the HEXACO + SJT + Likert scoring pipeline from the design spec.
 */

import { prisma } from '@/config/database';

// ─── Types ───────────────────────────────────────────────────────────────────

type Trait = 'H' | 'ES' | 'X' | 'A' | 'C' | 'O';
type SjtPart = 'B1' | 'B2' | 'B3';

interface RawTraitScores {
  H: number; ES: number; X: number; A: number; C: number; O: number;
}

interface SjtRawScores { B1: number; B2: number; B3: number | null }
interface LikertRaw { RES: number; ADA: number; ACH: number; IM: number; INF: number }

// ─── Norm parameters (Year-1 seed; replace with local norms after n≥300) ────

// For forced-choice tetrads: each trait appears 20 times, raw range −20 to +20
// Normative mean/SD derived from general working-population estimates
const HEXACO_NORM: Record<Trait, { mean: number; sd: number }> = {
  H:  { mean: 4.0,  sd: 6.5 },
  ES: { mean: 5.0,  sd: 6.0 },
  X:  { mean: 3.5,  sd: 6.0 },
  A:  { mean: 4.5,  sd: 5.5 },
  C:  { mean: 6.0,  sd: 6.0 },
  O:  { mean: 3.0,  sd: 6.5 },
};

// SJT raw: sum of item scores (best=+2, second=+1, neutral=0, worst=−1)
// B1: 10 scenarios max +20, B2: 4 scenarios max +8, B3: 4 scenarios max +8
const SJT_NORM: Record<SjtPart, { mean: number; sd: number }> = {
  B1: { mean: 10, sd: 5 },
  B2: { mean: 4,  sd: 2 },
  B3: { mean: 4,  sd: 2 },
};

// Likert scales (6+5+5 items, 1-5 scale)
const LIKERT_NORM = {
  RES: { mean: 18, sd: 5 },
  ADA: { mean: 14, sd: 4 },
  ACH: { mean: 15, sd: 4 },
};

// ─── Conversion helpers ───────────────────────────────────────────────────────

function toT(raw: number, mean: number, sd: number): number {
  if (sd === 0) return 50;
  return Math.round(50 + 10 * ((raw - mean) / sd));
}

function clamp(v: number, lo = 20, hi = 80): number {
  return Math.max(lo, Math.min(hi, v));
}

// ─── Composite formulas ───────────────────────────────────────────────────────

function compLeadership(t: RawTraitScores & { sjtL: number }): number {
  return clamp(Math.round(0.30 * t.sjtL + 0.20 * t.X + 0.20 * t.C + 0.15 * t.ES + 0.15 * t.O));
}

function compDecisionStyle(C: number, O: number): string {
  if (C >= 55 && O >= 55) return 'Analytical';
  if (C >= 55 && O < 55)  return 'Directive';
  if (C < 55  && O >= 55) return 'Innovative';
  return 'Deliberative';
}

function compLearningAgility(O: number, ACH: number, GMA: number | null, ADA: number): number {
  const g = GMA ?? 50;
  return clamp(Math.round(0.35 * O + 0.25 * ACH + 0.25 * g + 0.15 * ADA));
}

function compAccountability(C: number, H: number, sjtW: number): number {
  return clamp(Math.round(0.40 * C + 0.35 * H + 0.25 * sjtW));
}

function compIntegrity(H: number, sjtIntegrity: number, C: number, imFlagged: boolean): number {
  const raw = clamp(Math.round(0.45 * H + 0.35 * sjtIntegrity + 0.20 * C));
  return imFlagged ? Math.min(raw, 60) : raw;
}

function compTeamCompatibility(A: number, H: number, sjtTeam: number, X: number): number {
  return clamp(Math.round(0.35 * A + 0.30 * H + 0.20 * sjtTeam + 0.15 * X));
}

function compCommStyle(X: number, A: number): string {
  if (X >= 55 && A >= 55) return 'Expressive';
  if (X >= 55 && A < 55)  return 'Direct';
  if (X < 55  && A >= 55) return 'Diplomatic';
  return 'Reserved-precise';
}

function compEmotionalResilience(ES: number, RES: number, sjtStress: number): number {
  return clamp(Math.round(0.50 * ES + 0.35 * RES + 0.15 * sjtStress));
}

function compAdaptability(ADA: number, O: number, ES: number): number {
  return clamp(Math.round(0.40 * ADA + 0.35 * O + 0.25 * ES));
}

function compRiskAppetite(C: number, ES: number, O: number): number {
  return clamp(Math.round(100 - (0.55 * C + 0.25 * ES) + 0.20 * (O - 50)));
}

function compConflictStyle(A: number, X: number): string {
  if (A >= 55 && X >= 55) return 'Collaborator';
  if (A >= 55 && X < 55)  return 'Accommodator';
  if (A < 55  && X >= 55) return 'Competitor';
  return 'Avoider';
}

function compStressBand(ES: number, RES: number): string {
  const avg = (ES + RES) / 2;
  if (avg >= 55) return 'High resilience';
  if (avg >= 45) return 'Moderate resilience';
  return 'Low resilience';
}

// ─── Archetype assignment ─────────────────────────────────────────────────────

function assignArchetype(
  t: RawTraitScores,
  sjtL: number,
): string {
  const traits: [Trait, number][] = [
    ['H', t.H], ['ES', t.ES], ['X', t.X], ['A', t.A], ['C', t.C], ['O', t.O],
  ];
  traits.sort((a, b) => b[1] - a[1]);
  const [top, second] = [traits[0][0], traits[1][0]];
  const pair = [top, second].sort().join('+');

  const map: Record<string, string> = {
    'C+ES': 'The Anchor',
    'C+H':  'The Guardian',
    'C+X':  'The Driver',
    'A+X':  'The Diplomat',
    'O+X':  'The Pioneer',
    'C+O':  'The Craftsman',
    'A+ES': 'The Stabilizer',
    'ES+O': 'The Strategist',
  };

  if (map[pair]) {
    // Strategist requires SJT-L high too
    if (pair === 'ES+O' && sjtL < 55) return 'The Anchor';
    return map[pair];
  }
  // Fallback: highest single trait
  const labels: Record<Trait, string> = {
    C: 'The Anchor', H: 'The Guardian', X: 'The Driver',
    A: 'The Diplomat', O: 'The Pioneer', ES: 'The Stabilizer',
  };
  return labels[top] ?? 'The Anchor';
}

// ─── Derailer detection ───────────────────────────────────────────────────────

function detectDerailers(
  t: RawTraitScores,
  sjtIntegrity: number,
  riskAppetite: number,
  imFlagged: boolean,
  consFlagged: boolean,
): string[] {
  const flags: string[] = [];
  if (t.H < 35 || (t.H < 45 && sjtIntegrity < 40)) flags.push('Integrity risk');
  if (t.ES < 35) flags.push('Volatility');
  if (t.A < 35 && t.X > 60) flags.push('Abrasiveness');
  if (t.C > 70 && t.O < 40) flags.push('Micromanagement / rigidity');
  if (t.X > 65 && t.C < 40) flags.push('Overpromising');
  if (t.X < 35 && t.A > 65) flags.push('Passivity');
  if (riskAppetite > 70) flags.push('Recklessness');
  if (imFlagged || consFlagged) flags.push('Impression management');
  return flags;
}

// ─── Role-fit score matrix ────────────────────────────────────────────────────

type RoleFamily =
  | 'Operations / Shift'
  | 'Quality / Lab'
  | 'Maintenance'
  | 'Sales / BD'
  | 'Procurement / Stores'
  | 'Engineering / Projects'
  | 'People Leadership';

const ROLE_WEIGHTS: Record<RoleFamily, Partial<Record<
  'C' | 'H' | 'ES' | 'A' | 'X' | 'O' | 'sjtWork' | 'sjtSafety' | 'sjtLeadership' | 'GMA',
  number
>>> = {
  'Operations / Shift':       { C: .20, H: .10, ES: .20, A: .10, X: .00, O: .05, sjtWork: .10, sjtSafety: .20, GMA: .05 },
  'Quality / Lab':            { C: .25, H: .15, ES: .10, A: .05, X: .00, O: .05, sjtWork: .15, sjtSafety: .10, GMA: .15 },
  'Maintenance':              { C: .20, H: .10, ES: .15, A: .10, X: .00, O: .05, sjtWork: .15, sjtSafety: .20, GMA: .05 },
  'Sales / BD':               { C: .10, H: .10, ES: .10, A: .05, X: .25, O: .10, sjtWork: .15, sjtSafety: .00, sjtLeadership: .05, GMA: .10 },
  'Procurement / Stores':     { C: .20, H: .30, ES: .10, A: .10, X: .00, O: .00, sjtWork: .15, sjtSafety: .05, GMA: .10 },
  'Engineering / Projects':   { C: .15, H: .10, ES: .10, A: .05, X: .05, O: .15, sjtWork: .15, sjtSafety: .10, GMA: .15 },
  'People Leadership':        { C: .10, H: .15, ES: .15, A: .10, X: .10, O: .05, sjtWork: .10, sjtSafety: .05, sjtLeadership: .20, GMA: .10 },
};

function computeRoleFit(
  t: RawTraitScores,
  sjtWork: number,
  sjtSafety: number,
  sjtLeadership: number | null,
  GMA: number | null,
): Record<string, number> {
  const scores: Record<string, number> = {};
  const dim: Record<string, number> = {
    C: t.C, H: t.H, ES: t.ES, A: t.A, X: t.X, O: t.O,
    sjtWork, sjtSafety,
    sjtLeadership: sjtLeadership ?? 50,
    GMA: GMA ?? 50,
  };

  for (const [role, weights] of Object.entries(ROLE_WEIGHTS)) {
    let score = 0;
    let totalW = 0;
    for (const [dim_, w] of Object.entries(weights)) {
      if (w && dim[dim_] !== undefined) {
        score += w * dim[dim_];
        totalW += w;
      }
    }
    scores[role] = totalW > 0 ? Math.round(score / totalW) : 50;
  }
  return scores;
}

function fitBand(maxFit: number): string {
  if (maxFit >= 70) return 'Strong Fit';
  if (maxFit >= 55) return 'Fit';
  if (maxFit >= 40) return 'Conditional';
  return 'Low Fit';
}

// ─── Confidence score ─────────────────────────────────────────────────────────

function computeConfidence(opts: {
  infFlagged: boolean;
  imFlagged: boolean;
  consFlags: number;
  fastResponder: boolean;
  skippedFraction: number;
}): number {
  let score = 100;
  if (opts.infFlagged) score -= 25;
  if (opts.imFlagged) score -= 20;
  score -= Math.min(30, opts.consFlags * 15);
  if (opts.fastResponder) score -= 10;
  if (opts.skippedFraction > 0.05) score -= 10;
  return Math.max(0, score);
}

// ─── Main scoring function ────────────────────────────────────────────────────

export async function scorePersonalityAttempt(attemptId: string): Promise<void> {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      assessment: true,
      answers: true,
      questionSnapshots: {
        include: { options: { orderBy: { displayOrder: 'asc' } } },
      },
    },
  });

  if (!attempt) throw new Error('Attempt not found');
  if (attempt.assessment.mode !== 'PERSONALITY') return;

  // ── 1. Gather raw scores ──────────────────────────────────────────────────

  const hexacoRaw: RawTraitScores = { H: 0, ES: 0, X: 0, A: 0, C: 0, O: 0 };
  const sjtRaw: Record<SjtPart, number> = { B1: 0, B2: 0, B3: 0 };
  const likertRaw: LikertRaw = { RES: 0, ADA: 0, ACH: 0, IM: 0, INF: 0 };
  let sjtIntegrityRaw = 0;  // subset of B1+B2 items tagged integrity
  let sjtTeamRaw = 0;       // subset of B1 tagged team
  let sjtStressRaw = 0;     // subset tagged stress
  let infMissed = false;
  let totalQuestions = 0;
  let answeredQuestions = 0;

  for (const q of attempt.questionSnapshots) {
    totalQuestions++;
    const answer = attempt.answers.find((a) => a.attemptQuestionId === q.id);
    const hasAnswer = !!(answer?.selectedOptionId || answer?.selectedMostId || answer?.sjtScore !== null);
    if (hasAnswer) answeredQuestions++;

    // ── FORCED_CHOICE (Part A) ──────────────────────────────────────────────
    if (q.questionType === 'FORCED_CHOICE') {
      // Each snapshot question = one block with 4 options, each tagged with a trait
      // Most = +1 to that option's trait, Least = −1
      for (const opt of q.options) {
        const trait = opt.optionText.match(/\[([HESXACO]+)\]$/)?.[1] as Trait | undefined;
        if (!trait || !(trait in hexacoRaw)) continue;
        if (answer?.selectedMostId === opt.id) hexacoRaw[trait] += 1;
        if (answer?.selectedLeastId === opt.id) hexacoRaw[trait] -= 1;
      }
      continue;
    }

    // ── SJT (Part B) ──────────────────────────────────────────────────────
    if (q.sjtPart) {
      const part = q.sjtPart as SjtPart;
      const scored = answer?.sjtScore ?? 0;
      sjtRaw[part] += scored;

      // Integrity-tagged items: S1, S5, S11, S13 → tracked via question text marker
      // We tag these in the seeder by adding a metadata comment; check sjtKey meta
      const key = q.sjtKey as { optionIndex: number; score: number; integrityItem?: boolean }[] | null;
      if (key?.some((k) => k.integrityItem)) sjtIntegrityRaw += scored;
      if (q.sjtPart === 'B1') sjtTeamRaw += scored * 0.3; // approximate
      if (q.sjtPart === 'B2') sjtStressRaw += scored;
      continue;
    }

    // ── Likert (Part C) ────────────────────────────────────────────────────
    if (q.questionType === 'MCQ' && q.validityScale === null) {
      const rating = parseInt(answer?.answerText ?? '0', 10) || 0;
      const adjusted = q.isReversed ? 6 - rating : rating;
      if (q.trait === 'RES') likertRaw.RES += adjusted;
      else if (q.trait === 'ADA') likertRaw.ADA += adjusted;
      else if (q.trait === 'ACH') likertRaw.ACH += adjusted;
      continue;
    }

    // ── Validity items ─────────────────────────────────────────────────────
    if (q.validityScale === 'IM') {
      const rating = parseInt(answer?.answerText ?? '0', 10) || 0;
      likertRaw.IM += rating;
      continue;
    }
    if (q.validityScale === 'INF') {
      // Attention check: specific expected answers are in sjtKey
      const key = q.sjtKey as { expectedAnswer: string }[] | null;
      if (key && answer?.answerText !== key[0]?.expectedAnswer) {
        infMissed = true;
      }
      continue;
    }
  }

  // ── 2. Convert to T-scores ─────────────────────────────────────────────────

  const tScores: RawTraitScores = {
    H:  clamp(toT(hexacoRaw.H,  HEXACO_NORM.H.mean,  HEXACO_NORM.H.sd)),
    ES: clamp(toT(hexacoRaw.ES, HEXACO_NORM.ES.mean, HEXACO_NORM.ES.sd)),
    X:  clamp(toT(hexacoRaw.X,  HEXACO_NORM.X.mean,  HEXACO_NORM.X.sd)),
    A:  clamp(toT(hexacoRaw.A,  HEXACO_NORM.A.mean,  HEXACO_NORM.A.sd)),
    C:  clamp(toT(hexacoRaw.C,  HEXACO_NORM.C.mean,  HEXACO_NORM.C.sd)),
    O:  clamp(toT(hexacoRaw.O,  HEXACO_NORM.O.mean,  HEXACO_NORM.O.sd)),
  };

  const sjtW = clamp(toT(sjtRaw.B1, SJT_NORM.B1.mean, SJT_NORM.B1.sd));
  const sjtS = clamp(toT(sjtRaw.B2, SJT_NORM.B2.mean, SJT_NORM.B2.sd));
  const sjtL = sjtRaw.B3 !== 0
    ? clamp(toT(sjtRaw.B3, SJT_NORM.B3.mean, SJT_NORM.B3.sd))
    : null;

  const tRES = clamp(toT(likertRaw.RES, LIKERT_NORM.RES.mean, LIKERT_NORM.RES.sd));
  const tADA = clamp(toT(likertRaw.ADA, LIKERT_NORM.ADA.mean, LIKERT_NORM.ADA.sd));
  const tACH = clamp(toT(likertRaw.ACH, LIKERT_NORM.ACH.mean, LIKERT_NORM.ACH.sd));

  // ── 3. Validity checks ─────────────────────────────────────────────────────

  const imFlagged = likertRaw.IM >= 22;

  // Consistency: compare ES≈RES, C/O≈ADA/ACH (flag if |ΔT| > 15)
  const consESvsRES = Math.abs(tScores.ES - tRES) > 15;
  const consOvsADA  = Math.abs(tScores.O - tADA) > 15;
  const consCvsACH  = Math.abs(tScores.C - tACH) > 15;
  const consFlagCount = [consESvsRES, consOvsADA, consCvsACH].filter(Boolean).length;
  const consFlagged = consFlagCount > 0;

  // ── 4. Composites ──────────────────────────────────────────────────────────

  const sjtIntegrityT = clamp(toT(sjtIntegrityRaw, 2, 2));
  const sjtTeamT      = clamp(toT(sjtTeamRaw, 3, 2));
  const sjtStressT    = clamp(toT(sjtStressRaw, 4, 2));

  const riskApt = compRiskAppetite(tScores.C, tScores.ES, tScores.O);
  const derailers = detectDerailers(tScores, sjtIntegrityT, riskApt, imFlagged, consFlagged);
  const archetype = assignArchetype(tScores, sjtL ?? 50);
  const roleFit = computeRoleFit(tScores, sjtW, sjtS, sjtL, null);
  const maxFit = Math.max(...Object.values(roleFit));

  const confidence = computeConfidence({
    infFlagged: infMissed,
    imFlagged,
    consFlags: consFlagCount,
    fastResponder: false, // latency data not yet tracked per-item
    skippedFraction: totalQuestions > 0 ? (totalQuestions - answeredQuestions) / totalQuestions : 0,
  });

  // ── 5. Persist ─────────────────────────────────────────────────────────────

  await prisma.assessmentPersonalityResult.upsert({
    where: { attemptId },
    create: {
      attemptId,
      assessmentId:  attempt.assessmentId,
      candidateId:   attempt.candidateId,
      applicationId: attempt.applicationId,

      tH: tScores.H, tES: tScores.ES, tX: tScores.X,
      tA: tScores.A, tC: tScores.C,   tO: tScores.O,

      sjtWork: sjtW, sjtSafety: sjtS, sjtLeadership: sjtL,
      tRES, tADA, tACH,
      tGMA: null,

      imScore: likertRaw.IM, imFlagged, infFlagged: infMissed,
      consFlagged, confidenceScore: confidence,

      compLeadership:          sjtL != null ? compLeadership({ ...tScores, sjtL }) : null,
      compDecisionStyle:       compDecisionStyle(tScores.C, tScores.O),
      compLearningAgility:     compLearningAgility(tScores.O, tACH, null, tADA),
      compAccountability:      compAccountability(tScores.C, tScores.H, sjtW),
      compIntegrity:           compIntegrity(tScores.H, sjtIntegrityT, tScores.C, imFlagged),
      compTeamCompatibility:   compTeamCompatibility(tScores.A, tScores.H, sjtTeamT, tScores.X),
      compCommStyle:           compCommStyle(tScores.X, tScores.A),
      compEmotionalResilience: compEmotionalResilience(tScores.ES, tRES, sjtStressT),
      compAdaptability:        compAdaptability(tADA, tScores.O, tScores.ES),
      compRiskAppetite:        riskApt,
      compConflictStyle:       compConflictStyle(tScores.A, tScores.X),
      compStressBand:          compStressBand(tScores.ES, tRES),

      derailerFlags:  derailers,
      archetype,
      roleFitScores:  roleFit,
      fitBand:        fitBand(maxFit),
    },
    update: {
      tH: tScores.H, tES: tScores.ES, tX: tScores.X,
      tA: tScores.A, tC: tScores.C,   tO: tScores.O,
      sjtWork: sjtW, sjtSafety: sjtS, sjtLeadership: sjtL,
      tRES, tADA, tACH, tGMA: null,
      imScore: likertRaw.IM, imFlagged, infFlagged: infMissed,
      consFlagged, confidenceScore: confidence,
      compLeadership:          sjtL != null ? compLeadership({ ...tScores, sjtL }) : null,
      compDecisionStyle:       compDecisionStyle(tScores.C, tScores.O),
      compLearningAgility:     compLearningAgility(tScores.O, tACH, null, tADA),
      compAccountability:      compAccountability(tScores.C, tScores.H, sjtW),
      compIntegrity:           compIntegrity(tScores.H, sjtIntegrityT, tScores.C, imFlagged),
      compTeamCompatibility:   compTeamCompatibility(tScores.A, tScores.H, sjtTeamT, tScores.X),
      compCommStyle:           compCommStyle(tScores.X, tScores.A),
      compEmotionalResilience: compEmotionalResilience(tScores.ES, tRES, sjtStressT),
      compAdaptability:        compAdaptability(tADA, tScores.O, tScores.ES),
      compRiskAppetite:        riskApt,
      compConflictStyle:       compConflictStyle(tScores.A, tScores.X),
      compStressBand:          compStressBand(tScores.ES, tRES),
      derailerFlags:  derailers,
      archetype,
      roleFitScores:  roleFit,
      fitBand:        fitBand(maxFit),
    },
  });
}

// ─── Interview probe generator ────────────────────────────────────────────────

export function generateInterviewProbes(
  tH: number,
  tES: number,
  tX: number,
  tC: number,
  tO: number,
  derailers: string[],
): string[] {
  const probes: string[] = [];

  if (tH < 50) probes.push("Tell me about a time you faced pressure to cut corners or bend a rule. What did you do?");
  if (tES < 50) probes.push("Describe the most stressful period in your recent work. How did you manage it?");
  if (tX < 45) probes.push("When did you last change your manager's mind about something? Walk me through it.");
  if (tC < 50) probes.push("Tell me about a project where you missed a deadline. What happened and what did you do?");
  if (tO < 45) probes.push("Describe the last major system or process change you went through. What was hardest?");
  if (derailers.includes('Integrity risk'))
    probes.push("Tell me about a time you noticed something ethically questionable at work. What did you do?");
  if (derailers.includes('Volatility'))
    probes.push("Describe a situation where everything went wrong at once. How did you respond?");
  if (derailers.includes('Abrasiveness'))
    probes.push("Tell me about a time a colleague complained about how you communicated. What happened?");
  if (derailers.includes('Passivity'))
    probes.push("Tell me about a time you saw a safety or quality issue and had to decide whether to raise it.");

  // Always include safety probe
  probes.push("Tell me about a time a supervisor asked you to shortcut a procedure. What did you do?");

  return [...new Set(probes)].slice(0, 4);
}
