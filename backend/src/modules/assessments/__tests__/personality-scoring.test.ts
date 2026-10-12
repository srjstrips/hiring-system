/**
 * Unit tests for the TalentSignal™ personality scoring engine.
 * Mocks the Prisma client so no database connection is required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these are created before vi.mock hoisting runs
const { mockFindUnique, mockUpsert } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock('@/config/database', () => ({
  prisma: {
    assessmentAttempt: { findUnique: mockFindUnique },
    assessmentPersonalityResult: { upsert: mockUpsert },
  },
}));

import { scorePersonalityAttempt } from '../personality-scoring.service';

// ── Test data builders ────────────────────────────────────────────────────────

function likertQuestion(id: string, trait: 'RES' | 'ADA' | 'ACH', isReversed = false) {
  const options = [1, 2, 3, 4, 5].map((n) => ({
    id: `${id}-opt${n}`,
    optionText: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'][n - 1],
    displayOrder: n,
  }));
  return { id, questionType: 'MCQ', questionText: `Likert (${trait})`, marks: 0, displayOrder: 0,
    sjtPart: null, sjtKey: null, validityScale: null, isReversed, trait, options };
}

function imQuestion(id: string) {
  const options = [1, 2, 3, 4, 5].map((n) => ({
    id: `${id}-opt${n}`, optionText: String(n), displayOrder: n,
  }));
  return { id, questionType: 'MCQ', questionText: 'IM question', marks: 0, displayOrder: 0,
    sjtPart: null, sjtKey: null, validityScale: 'IM', isReversed: false, trait: null, options };
}

function sjtQuestion(id: string, part: 'B1' | 'B2' | 'B3', integrityItem = false) {
  return { id, questionType: 'SJT', questionText: `SJT ${part}`, marks: 0, displayOrder: 0,
    sjtPart: part, sjtKey: integrityItem ? [{ optionIndex: 0, score: 2, integrityItem: true }] : null,
    validityScale: null, isReversed: false, trait: null, options: [] };
}

function forcedChoiceQuestion(id: string) {
  return { id, questionType: 'FORCED_CHOICE', questionText: 'FC', marks: 0, displayOrder: 0,
    sjtPart: null, sjtKey: null, validityScale: null, isReversed: false, trait: null,
    options: [
      { id: `${id}-H`,  optionText: 'Option [H]',  displayOrder: 1 },
      { id: `${id}-ES`, optionText: 'Option [ES]', displayOrder: 2 },
      { id: `${id}-X`,  optionText: 'Option [X]',  displayOrder: 3 },
      { id: `${id}-A`,  optionText: 'Option [A]',  displayOrder: 4 },
    ] };
}

function makeAttempt(snapshots: unknown[], answers: unknown[], mode = 'PERSONALITY') {
  return {
    id: 'test-attempt', assessmentId: 'test-assessment',
    candidateId: 'test-candidate', applicationId: 'test-application',
    assessment: { mode, name: 'SRJ Talent Acquisition', assessmentType: 'PERSONALITY' },
    answers, questionSnapshots: snapshots,
  };
}

function answer(
  questionId: string,
  opts: { optId?: string; mostId?: string; leastId?: string; sjtScore?: number | null },
) {
  return {
    attemptQuestionId: questionId,
    selectedOptionId: opts.optId ?? null,
    selectedMostId: opts.mostId ?? null,
    selectedLeastId: opts.leastId ?? null,
    answerText: null,
    sjtScore: opts.sjtScore ?? null,
  };
}

function capturedCreate() {
  return (mockUpsert.mock.calls[0]?.[0] as { create: Record<string, unknown> })?.create;
}

// ── Likert scoring ────────────────────────────────────────────────────────────

describe('Likert scoring — uses selectedOption.displayOrder, not parseInt(answerText)', () => {
  beforeEach(() => { vi.clearAllMocks(); mockUpsert.mockResolvedValue({}); });

  it('all-5 RES answers yield tRES = 74 (raw=30, mean=18, sd=5)', async () => {
    const qs = Array.from({ length: 6 }, (_, i) => likertQuestion(`r${i}`, 'RES'));
    const answers = qs.map((q) => answer(q.id, { optId: `${q.id}-opt5` }));
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    // toT(30, 18, 5) = 50 + 10*12/5 = 74
    expect(capturedCreate()?.tRES).toBe(74);
  });

  it('all-1 RES answers yield tRES = 26 (raw=6, mean=18, sd=5)', async () => {
    const qs = Array.from({ length: 6 }, (_, i) => likertQuestion(`r${i}`, 'RES'));
    const answers = qs.map((q) => answer(q.id, { optId: `${q.id}-opt1` }));
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    // toT(6, 18, 5) = 50 + 10*(-12)/5 = 26
    expect(capturedCreate()?.tRES).toBe(26);
  });

  it('mid-range RES answers (all-3, raw=18) yield tRES = 50', async () => {
    const qs = Array.from({ length: 6 }, (_, i) => likertQuestion(`r${i}`, 'RES'));
    const answers = qs.map((q) => answer(q.id, { optId: `${q.id}-opt3` }));
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    // toT(18, 18, 5) = 50
    expect(capturedCreate()?.tRES).toBe(50);
  });

  it('unanswered Likert questions contribute 0 to raw score', async () => {
    const qs = Array.from({ length: 6 }, (_, i) => likertQuestion(`r${i}`, 'RES'));
    const answers: unknown[] = []; // all unanswered
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    // raw=0, toT(0, 18, 5) = 50 + 10*(-18)/5 = 14, clamped to 20
    expect(capturedCreate()?.tRES).toBe(20);
  });
});

describe('Likert scoring — reverse-scored items', () => {
  beforeEach(() => { vi.clearAllMocks(); mockUpsert.mockResolvedValue({}); });

  it('reversed item with displayOrder=5 contributes 1 (6-5), not 5', async () => {
    // 3 normal + 3 reversed, all answered with opt5
    const qs = [
      ...Array.from({ length: 3 }, (_, i) => likertQuestion(`fwd-${i}`, 'RES', false)),
      ...Array.from({ length: 3 }, (_, i) => likertQuestion(`rev-${i}`, 'RES', true)),
    ];
    const answers = qs.map((q) => answer(q.id, { optId: `${q.id}-opt5` }));
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    // 3×5 + 3×(6-5=1) = 15+3 = 18 → toT(18, 18, 5) = 50
    expect(capturedCreate()?.tRES).toBe(50);
  });

  it('reversed item with displayOrder=1 contributes 5 (6-1)', async () => {
    const qs = [
      ...Array.from({ length: 3 }, (_, i) => likertQuestion(`fwd-${i}`, 'RES', false)),
      ...Array.from({ length: 3 }, (_, i) => likertQuestion(`rev-${i}`, 'RES', true)),
    ];
    // Normal items answered opt1, reversed items answered opt1 → reversed=5 each
    const answers = qs.map((q) => answer(q.id, { optId: `${q.id}-opt1` }));
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    // 3×1 + 3×(6-1=5) = 3+15 = 18 → toT(18, 18, 5) = 50
    expect(capturedCreate()?.tRES).toBe(50);
  });
});

describe('IM validity scale scoring', () => {
  beforeEach(() => { vi.clearAllMocks(); mockUpsert.mockResolvedValue({}); });

  it('flags IM when 5 items all answered with displayOrder=5 (sum=25 >= 22)', async () => {
    const qs = Array.from({ length: 5 }, (_, i) => imQuestion(`im${i}`));
    const answers = qs.map((q) => answer(q.id, { optId: `${q.id}-opt5` }));
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    expect(capturedCreate()?.imScore).toBe(25);
    expect(capturedCreate()?.imFlagged).toBe(true);
  });

  it('does not flag IM when answers are moderate (sum < 22)', async () => {
    // 5 items all opt3 → sum = 15
    const qs = Array.from({ length: 5 }, (_, i) => imQuestion(`im${i}`));
    const answers = qs.map((q) => answer(q.id, { optId: `${q.id}-opt3` }));
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    expect(capturedCreate()?.imScore).toBe(15);
    expect(capturedCreate()?.imFlagged).toBe(false);
  });
});

// ── SJT B3 / sjtLeadership ────────────────────────────────────────────────────

describe('SJT Part B3 — sjtLeadership null vs scored', () => {
  beforeEach(() => { vi.clearAllMocks(); mockUpsert.mockResolvedValue({}); });

  it('sjtLeadership is null when no B3 questions exist', async () => {
    const qs = [sjtQuestion('b1', 'B1'), sjtQuestion('b2', 'B2')];
    const answers = qs.map((q) => answer(q.id, { sjtScore: 2 }));
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    expect(capturedCreate()?.sjtLeadership).toBeNull();
  });

  it('sjtLeadership is 30 (not null) when B3 questions exist with score 0 — zero must not be treated as missing', async () => {
    const qs = [sjtQuestion('b3a', 'B3'), sjtQuestion('b3b', 'B3')];
    const answers = qs.map((q) => answer(q.id, { sjtScore: 0 }));
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    // raw=0, toT(0, 4, 2) = 50+10*(0-4)/2 = 30
    expect(capturedCreate()?.sjtLeadership).toBe(30);
  });

  it('sjtLeadership is 70 when 4 B3 questions all answered best (score 2 each, raw=8)', async () => {
    const qs = Array.from({ length: 4 }, (_, i) => sjtQuestion(`b3-${i}`, 'B3'));
    const answers = qs.map((q) => answer(q.id, { sjtScore: 2 }));
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    // toT(8, 4, 2) = 50+10*(8-4)/2 = 70
    expect(capturedCreate()?.sjtLeadership).toBe(70);
  });
});

// ── Mutually exclusive scoring paths ─────────────────────────────────────────

describe('Scoring path selection', () => {
  beforeEach(() => { vi.clearAllMocks(); mockUpsert.mockResolvedValue({}); });

  it('runs scoring and writes one upsert when mode=PERSONALITY', async () => {
    mockFindUnique.mockResolvedValue(makeAttempt([], [], 'PERSONALITY'));
    await scorePersonalityAttempt('test-attempt');
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('exits early with no upsert when mode is not PERSONALITY', async () => {
    mockFindUnique.mockResolvedValue(makeAttempt([], [], 'STANDARD'));
    await scorePersonalityAttempt('test-attempt');
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

// ── Null safety ───────────────────────────────────────────────────────────────

describe('Null safety', () => {
  beforeEach(() => { vi.clearAllMocks(); mockUpsert.mockResolvedValue({}); });

  it('throws a descriptive error when attempt is not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(scorePersonalityAttempt('bad-id')).rejects.toThrow('Attempt not found');
  });

  it('scores cleanly with empty questions and answers (all scores at floor)', async () => {
    mockFindUnique.mockResolvedValue(makeAttempt([], []));
    await scorePersonalityAttempt('test-attempt');
    const c = capturedCreate();
    expect(c).toBeDefined();
    // With no answers, raw scores are 0.
    // tH: toT(0, 4.0, 6.5) = 50+10*(0-4)/6.5 ≈ 44
    // tRES: toT(0, 18, 5) = 50+10*(0-18)/5 = 14 → clamped to 20
    expect(c?.tH).toBe(44);
    expect(c?.tRES).toBe(20);
    expect(c?.sjtLeadership).toBeNull();
  });
});

// ── FORCED_CHOICE (HEXACO Part A) ─────────────────────────────────────────────

describe('FORCED_CHOICE scoring', () => {
  beforeEach(() => { vi.clearAllMocks(); mockUpsert.mockResolvedValue({}); });

  it('+1 to H for most, −1 to ES for least', async () => {
    const q = forcedChoiceQuestion('fc1');
    mockFindUnique.mockResolvedValue(
      makeAttempt([q], [answer('fc1', { mostId: 'fc1-H', leastId: 'fc1-ES' })])
    );
    await scorePersonalityAttempt('test-attempt');
    const c = capturedCreate()!;
    // H raw=1 → above mean 4.0, still below 50 since range is wide
    // ES raw=-1 → below mean 5.0 → below 50
    expect(c.tES).toBeLessThan(50);
  });

  it('5 questions all choosing H as most and A as least produces tH > 50, tA < 50', async () => {
    const qs = Array.from({ length: 5 }, (_, i) => forcedChoiceQuestion(`fc${i}`));
    const answers = qs.map((q) => answer(q.id, { mostId: `${q.id}-H`, leastId: `${q.id}-A` }));
    mockFindUnique.mockResolvedValue(makeAttempt(qs, answers));
    await scorePersonalityAttempt('test-attempt');
    const c = capturedCreate()!;
    // H raw=5, toT(5, 4, 6.5) ≈ 52 → > 50
    // A raw=-5, toT(-5, 4.5, 5.5) ≈ 33 → < 50
    expect(c.tH).toBeGreaterThan(50);
    expect(c.tA).toBeLessThan(50);
  });
});
