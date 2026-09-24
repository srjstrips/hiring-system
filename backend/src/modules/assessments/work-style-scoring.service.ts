/**
 * SRJ Work Style Check — Scoring Engine
 *
 * Reads attempt answers, computes per-trait averages (applying reversal),
 * determines levels and archetype, then stores everything in
 * AssessmentPersonalityResult (reusing existing fields).
 *
 * Field mapping used:
 *   tH   → Leadership T-score
 *   tES  → Learning Agility T-score
 *   tX   → Team Player T-score
 *   tO   → Problem Solving T-score
 *   compLeadership        → Leadership raw avg × 20  (0-100 scale)
 *   compLearningAgility   → Learning Agility raw avg × 20
 *   compTeamCompatibility → Team Player raw avg × 20
 *   compAccountability    → Problem Solving raw avg × 20
 *   archetype → archetype name string
 *   fitBand   → overall fit band label
 */

import { prisma } from '@/config/database';

// ─── Trait definitions ────────────────────────────────────────────────────────

const TRAITS = ['LEADERSHIP', 'LEARNING_ADAPTABILITY', 'TEAMWORK', 'PROBLEM_SOLVING'] as const;
type Trait = (typeof TRAITS)[number];

// ─── Level mapping ─────────────────────────────────────────────────────────────

export function traitLevel(avg: number): { level: number; label: string } {
  if (avg >= 4.6) return { level: 5, label: 'Exceptional' };
  if (avg >= 4.0) return { level: 4, label: 'Strong' };
  if (avg >= 3.1) return { level: 3, label: 'Solid' };
  if (avg >= 2.1) return { level: 2, label: 'Basic' };
  return { level: 1, label: 'Developing' };
}

// ─── Archetype logic ──────────────────────────────────────────────────────────

function determineArchetype(scores: Record<Trait, number>): string {
  const { LEADERSHIP: L, LEARNING_ADAPTABILITY: LA, TEAMWORK: T, PROBLEM_SOLVING: PS } = scores;
  const allAbove4 = L >= 4.0 && LA >= 4.0 && T >= 4.0 && PS >= 4.0;
  if (allAbove4) return 'The Complete Contributor';

  const allSolid = L >= 3.1 && LA >= 3.1 && T >= 3.1 && PS >= 3.1 &&
                   L < 4.0  && LA < 4.0  && T < 4.0  && PS < 4.0;
  if (allSolid) return 'The Well-Rounded Collaborator';

  const lowest = Math.min(L, LA, T, PS);
  if (lowest < 2.1) return 'The Developing Professional';

  // Find highest trait
  const entries: [Trait, number][] = [
    ['LEADERSHIP', L],
    ['LEARNING_ADAPTABILITY', LA],
    ['TEAMWORK', T],
    ['PROBLEM_SOLVING', PS],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const [highestTrait, highestScore] = entries[0];

  if (highestTrait === 'LEADERSHIP') {
    if (highestScore >= 4.0) return 'The Natural Leader';
    if (highestScore < 3.1)  return 'The Emerging Leader';
  }
  if (highestTrait === 'LEARNING_ADAPTABILITY' && highestScore >= 4.0) return 'The Quick Learner';
  if (highestTrait === 'TEAMWORK'               && highestScore >= 4.0) return 'The Team Anchor';
  if (highestTrait === 'PROBLEM_SOLVING'        && highestScore >= 4.0) return 'The Problem Solver';

  return 'The Steady Contributor';
}

// ─── Scale: raw avg (1-5) → T-score (20-80) ──────────────────────────────────

function toTScore(raw: number): number {
  return Math.round(20 + (raw - 1) * 15);
}

// ─── Overall fit band ─────────────────────────────────────────────────────────

function overallFitBand(avgAll: number): string {
  if (avgAll >= 4.6) return 'Exceptional Fit';
  if (avgAll >= 4.0) return 'Strong Fit';
  if (avgAll >= 3.1) return 'Good Fit';
  if (avgAll >= 2.1) return 'Developing Fit';
  return 'Early Stage';
}

// ─── Main scoring function ────────────────────────────────────────────────────

export async function scoreWorkStyleAttempt(attemptId: string): Promise<void> {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      questionSnapshots: {
        include: {
          options: true,
          answers: true,
        },
      },
      candidate: { select: { id: true } },
    },
  });
  if (!attempt) throw new Error(`[WorkStyleScoring] Attempt ${attemptId} not found`);

  // Trait accumulator
  const traitTotals: Record<Trait, number> = {
    LEADERSHIP: 0, LEARNING_ADAPTABILITY: 0, TEAMWORK: 0, PROBLEM_SOLVING: 0,
  };
  const traitCounts: Record<Trait, number> = {
    LEADERSHIP: 0, LEARNING_ADAPTABILITY: 0, TEAMWORK: 0, PROBLEM_SOLVING: 0,
  };

  for (const q of attempt.questionSnapshots) {
    const trait = q.trait as Trait | null;
    if (!trait || !TRAITS.includes(trait)) continue;

    const answer = await prisma.assessmentAnswer.findFirst({
      where: { attemptId, attemptQuestionId: q.id },
    });
    if (!answer?.selectedOptionId) continue;

    const option = q.options.find((o) => o.id === answer.selectedOptionId);
    if (!option) continue;

    // displayOrder on the snapshot option = the Likert value 1-5
    let raw = option.displayOrder;
    if (q.isReversed) raw = 6 - raw;

    traitTotals[trait] += raw;
    traitCounts[trait] += 1;
  }

  const scores: Record<Trait, number> = {
    LEADERSHIP:            traitCounts.LEADERSHIP            > 0 ? traitTotals.LEADERSHIP            / traitCounts.LEADERSHIP            : 3,
    LEARNING_ADAPTABILITY: traitCounts.LEARNING_ADAPTABILITY > 0 ? traitTotals.LEARNING_ADAPTABILITY / traitCounts.LEARNING_ADAPTABILITY : 3,
    TEAMWORK:              traitCounts.TEAMWORK              > 0 ? traitTotals.TEAMWORK              / traitCounts.TEAMWORK              : 3,
    PROBLEM_SOLVING:       traitCounts.PROBLEM_SOLVING       > 0 ? traitTotals.PROBLEM_SOLVING       / traitCounts.PROBLEM_SOLVING       : 3,
  };

  const archetype = determineArchetype(scores);
  const avgAll = (scores.LEADERSHIP + scores.LEARNING_ADAPTABILITY + scores.TEAMWORK + scores.PROBLEM_SOLVING) / 4;
  const fitBand = overallFitBand(avgAll);

  // Upsert result
  await prisma.assessmentPersonalityResult.upsert({
    where: { attemptId },
    update: {
      tH:   toTScore(scores.LEADERSHIP),
      tES:  toTScore(scores.LEARNING_ADAPTABILITY),
      tX:   toTScore(scores.TEAMWORK),
      tO:   toTScore(scores.PROBLEM_SOLVING),
      compLeadership:        Math.round(scores.LEADERSHIP            * 20),
      compLearningAgility:   Math.round(scores.LEARNING_ADAPTABILITY * 20),
      compTeamCompatibility: Math.round(scores.TEAMWORK              * 20),
      compAccountability:    Math.round(scores.PROBLEM_SOLVING       * 20),
      archetype,
      fitBand,
    },
    create: {
      attemptId,
      assessmentId:  attempt.assessmentId,
      candidateId:   attempt.candidateId,
      applicationId: attempt.applicationId ?? '',
      tH:   toTScore(scores.LEADERSHIP),
      tES:  toTScore(scores.LEARNING_ADAPTABILITY),
      tX:   toTScore(scores.TEAMWORK),
      tO:   toTScore(scores.PROBLEM_SOLVING),
      compLeadership:        Math.round(scores.LEADERSHIP            * 20),
      compLearningAgility:   Math.round(scores.LEARNING_ADAPTABILITY * 20),
      compTeamCompatibility: Math.round(scores.TEAMWORK              * 20),
      compAccountability:    Math.round(scores.PROBLEM_SOLVING       * 20),
      archetype,
      fitBand,
    },
  });

  console.log(`[WorkStyleScoring] Scored attempt ${attemptId}: archetype="${archetype}", fitBand="${fitBand}"`);
}

// ─── Result reader ────────────────────────────────────────────────────────────

export interface WorkStyleTraitResult {
  trait: string;
  label: string;       // display name, e.g. "Leadership"
  rawAvg: number;
  tScore: number;
  level: number;
  levelLabel: string;  // e.g. "Strong"
  comp: number;        // 20-100 scale
}

export interface WorkStyleResult {
  archetype: string;
  fitBand: string;
  traits: WorkStyleTraitResult[];
  profileSummary: string;
}

function archetypeSummary(archetype: string): string {
  const MAP: Record<string, string> = {
    'The Complete Contributor':      'Exceptional across all four dimensions — leads, learns, collaborates, and solves problems with consistent strength.',
    'The Natural Leader':            'Takes charge with confidence, guides others through challenges, and makes decisions even in uncertain situations.',
    'The Quick Learner':             'Adapts rapidly to new tools and situations, asks the right questions, and grows through every challenge.',
    'The Team Anchor':               'Reliable, collaborative, and patient — the kind of person who keeps teams together and moving forward.',
    'The Problem Solver':            'Finds solutions before others even spot the issue, thinks through multiple options, and continuously improves processes.',
    'The Well-Rounded Collaborator': 'Balanced and dependable across all traits — solid, consistent, and a reliable presence in any team setting.',
    'The Emerging Leader':           'Shows real leadership potential and is actively building the confidence and skills to take on greater responsibility.',
    'The Developing Professional':   'Early in professional development with strong growth potential; a coachable candidate who responds well to structured guidance.',
    'The Steady Contributor':        'Consistent and reliable, gets the job done, and contributes steadily without needing much oversight.',
  };
  return MAP[archetype] ?? 'A capable professional with a distinct work style that contributes value to the right team environment.';
}

export async function getWorkStyleResult(attemptId: string): Promise<WorkStyleResult | null> {
  const result = await prisma.assessmentPersonalityResult.findUnique({
    where: { attemptId },
  });
  if (!result) return null;

  // Reconstruct raw avg from T-score: raw = (T - 20) / 15 + 1
  function fromTScore(t: number | null): number {
    if (t == null) return 3;
    return Math.round(((t - 20) / 15 + 1) * 100) / 100;
  }

  const rawL  = fromTScore(result.tH);
  const rawLA = fromTScore(result.tES);
  const rawT  = fromTScore(result.tX);
  const rawPS = fromTScore(result.tO);

  function toTraitResult(
    trait: string,
    label: string,
    rawAvg: number,
    tScore: number,
    comp: number,
  ): WorkStyleTraitResult {
    const lvl = traitLevel(rawAvg);
    return { trait, label, rawAvg, tScore, level: lvl.level, levelLabel: lvl.label, comp };
  }

  const traits: WorkStyleTraitResult[] = [
    toTraitResult('LEADERSHIP',            'Leadership',      rawL,  result.tH  ?? 50, result.compLeadership        ?? 60),
    toTraitResult('LEARNING_ADAPTABILITY', 'Learning Agility', rawLA, result.tES ?? 50, result.compLearningAgility   ?? 60),
    toTraitResult('TEAMWORK',              'Team Player',     rawT,  result.tX  ?? 50, result.compTeamCompatibility ?? 60),
    toTraitResult('PROBLEM_SOLVING',       'Problem Solving', rawPS, result.tO  ?? 50, result.compAccountability    ?? 60),
  ];

  return {
    archetype: result.archetype ?? 'The Steady Contributor',
    fitBand:   result.fitBand   ?? 'Good Fit',
    traits,
    profileSummary: archetypeSummary(result.archetype ?? 'The Steady Contributor'),
  };
}
