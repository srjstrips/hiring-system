/**
 * TalentSignal™ PDF Report Generator
 * Produces a two-section report:
 *   Page 1–2  — Candidate copy (no derailer flags, no raw T-scores)
 *   Page 3–4  — HR copy (full profile including derailers, role-fit, interview probes)
 */

import PDFDocument from 'pdfkit';
import { prisma } from '@/config/database';
import { generateInterviewProbes } from './personality-scoring.service';

// ─── Brand palette ────────────────────────────────────────────────────────────
const C = {
  orange:    '#FF6B00',
  amber:     '#b45309',
  dark:      '#1e293b',
  mid:       '#475569',
  light:     '#94a3b8',
  muted:     '#f1f5f9',
  white:     '#ffffff',
  green:     '#16a34a',
  blue:      '#0284c7',
  red:       '#dc2626',
  yellow:    '#d97706',
  purple:    '#7c3aed',
  teal:      '#0891b2',
};

const TRAIT_META: Record<string, { label: string; desc: string; color: string }> = {
  H:  { label: 'Honesty & Integrity',        desc: 'Ethical grounding, transparency, sincerity',      color: C.purple },
  ES: { label: 'Emotional Stability',         desc: 'Composure under pressure, low anxiety',           color: C.teal   },
  X:  { label: 'Extraversion & Energy',       desc: 'Confidence, assertiveness, social energy',        color: C.yellow },
  A:  { label: 'Agreeableness & Teamwork',    desc: 'Cooperation, flexibility, care for others',       color: C.green  },
  C:  { label: 'Conscientiousness & Drive',   desc: 'Discipline, reliability, goal-focus',             color: C.amber  },
  O:  { label: 'Openness & Adaptability',     desc: 'Curiosity, creativity, embrace of change',        color: C.blue   },
};

const STRENGTH_DESCRIPTIONS: Record<string, string> = {
  H:  'You have strong ethical grounding and a preference for transparent, principled conduct. People around you know what to expect — your word carries weight.',
  ES: 'You remain composed and effective under pressure. When others feel stressed, your steady presence becomes an asset for the whole team.',
  X:  'You bring energy and confidence to group settings. You naturally engage others and can rally people around a shared goal.',
  A:  'You work constructively with others, showing flexibility and genuine care in collaborative situations. Colleagues find you easy to work with.',
  C:  'You are disciplined and dependable. You follow through on commitments with consistent quality and attention to detail.',
  O:  'You embrace learning and change, bringing curiosity and fresh thinking to your work. New challenges energise rather than discourage you.',
};

const DEVELOPMENT_THEMES: Record<string, string> = {
  H:  'Continue building your personal brand of transparency — proactively communicate your intent in high-stakes situations.',
  ES: 'Strengthen your composure toolkit for high-pressure moments. Small practices like pause-and-reflect can build this muscle over time.',
  X:  'Increase your visibility — share your insights and contributions more actively in group forums and team meetings.',
  A:  'Practise engaging in productive tension when different views surface. Healthy disagreement often leads to better outcomes.',
  C:  'Balance thoroughness with pace when speed matters more than perfection. Done is sometimes better than perfect.',
  O:  'Expand your exposure to new methods and cross-functional perspectives to keep growing professionally.',
};

const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  'The Anchor':     'Reliable, steady, and process-oriented. You bring stability and consistency to your team. Others depend on you to keep things on track.',
  'The Guardian':   'Principled and trustworthy. You uphold standards and act with integrity even under pressure. A natural protector of team values.',
  'The Driver':     'Energetic and goal-focused. You push for results and motivate others to act. You thrive when there is a clear target to chase.',
  'The Diplomat':   'Warm and persuasive. You build bridges between people and resolve tension constructively. A natural relationship-builder.',
  'The Pioneer':    'Curious and inventive. You bring fresh ideas and challenge the status quo. You flourish when given space to explore.',
  'The Craftsman':  'Methodical and quality-driven. You take pride in doing things right and see projects through with precision and care.',
  'The Stabilizer': 'Calm and supportive. You provide emotional grounding for your team during difficult periods. Others feel safe around you.',
  'The Strategist': 'Analytical and visionary. You think several steps ahead and combine insight with structure to shape outcomes.',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function tScoreLabel(t: number): string {
  if (t >= 65) return 'High';
  if (t >= 55) return 'Above Average';
  if (t >= 45) return 'Average';
  if (t >= 35) return 'Below Average';
  return 'Low';
}

function scoreColor(t: number): string {
  if (t >= 65) return C.green;
  if (t >= 45) return C.blue;
  return C.yellow;
}

function compositeColor(v: number): string {
  if (v >= 65) return C.green;
  if (v >= 50) return C.blue;
  if (v >= 40) return C.yellow;
  return C.red;
}

function fitColor(band: string | null): string {
  if (band === 'Strong Fit') return C.green;
  if (band === 'Fit') return C.blue;
  if (band === 'Conditional') return C.yellow;
  return C.red;
}

// ─── PDF builder ──────────────────────────────────────────────────────────────

export async function generatePersonalityReportPdf(
  assessmentId: string,
  assignmentId: string,
): Promise<Buffer> {
  // ── Fetch data ──────────────────────────────────────────────────────────────
  const assignment = await prisma.assessmentAssignment.findFirst({
    where: { id: assignmentId, assessmentId },
    include: {
      assessment: { select: { name: true } },
      candidate: { select: { firstName: true, lastName: true, email: true, phone: true } },
      job: { select: { title: true } },
    },
  });
  if (!assignment) throw new Error('Assignment not found');

  // Find latest completed attempt
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { assignmentId, submittedAt: { not: null } },
    orderBy: { attemptNumber: 'desc' },
  });
  if (!attempt) throw new Error('No completed attempt found');

  const result = await prisma.assessmentPersonalityResult.findUnique({
    where: { attemptId: attempt.id },
  });
  if (!result) throw new Error('Personality result not found');

  const branding = await prisma.emailBranding.findFirst();

  // ── Build trait list ────────────────────────────────────────────────────────
  const traitScores: Array<{ key: string; t: number }> = [
    { key: 'H', t: result.tH ?? 50 },
    { key: 'ES', t: result.tES ?? 50 },
    { key: 'X', t: result.tX ?? 50 },
    { key: 'A', t: result.tA ?? 50 },
    { key: 'C', t: result.tC ?? 50 },
    { key: 'O', t: result.tO ?? 50 },
  ];
  const sorted = [...traitScores].sort((a, b) => b.t - a.t);
  const top3 = sorted.slice(0, 3);
  const lowest = sorted[sorted.length - 1]!;

  const interviewProbes = generateInterviewProbes(
    result.tH ?? 50, result.tES ?? 50, result.tX ?? 50,
    result.tC ?? 50, result.tO ?? 50,
    (result.derailerFlags ?? []) as string[],
  );

  const roleFitScores = (result.roleFitScores ?? {}) as Record<string, number>;
  const topRoles = Object.entries(roleFitScores).sort(([, a], [, b]) => b - a).slice(0, 5);

  const candidateName = `${assignment.candidate.firstName ?? ''} ${assignment.candidate.lastName ?? ''}`.trim() || 'Candidate';
  const companyName = branding?.companyName ?? 'SRJ Group';
  const primaryColor = branding?.primaryColor ?? C.orange;

  // ── Create PDF ──────────────────────────────────────────────────────────────
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 56, left: 56, right: 56 },
    info: {
      Title: `Personality Report — ${candidateName}`,
      Author: companyName,
      Subject: 'TalentSignal™ Personality Assessment Report',
      Creator: 'SRJ Hiring System',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const contentW = pageW - 112; // margins 56 each side
  const LEFT = 56;

  // ── Utility draw functions ─────────────────────────────────────────────────

  function header(title: string, subtitle: string) {
    // Orange top bar
    doc.rect(0, 0, pageW, 72).fill(primaryColor);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(20).text(companyName, LEFT, 18);
    doc.fillColor('rgba(255,255,255,0.75)').font('Helvetica').fontSize(10).text(title, LEFT, 44);

    // Candidate name strip
    doc.rect(0, 72, pageW, 40).fill(C.dark);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(13).text(candidateName, LEFT, 83);
    if (assignment!.job?.title) {
      doc.fillColor(C.light).font('Helvetica').fontSize(10)
        .text(assignment!.job.title, LEFT + doc.widthOfString(candidateName) + 16, 86);
    }
    doc.fillColor(C.light).font('Helvetica').fontSize(9)
      .text(`Assessment: ${assignment!.assessment.name}`, pageW - 56 - 220, 83, { width: 220, align: 'right' })
      .text(`Completed: ${attempt!.submittedAt ? new Date(attempt!.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}`, pageW - 56 - 220, 94, { width: 220, align: 'right' });

    doc.y = 130;
    if (subtitle) {
      doc.fillColor(C.mid).font('Helvetica').fontSize(9)
        .text(subtitle, LEFT, doc.y, { width: contentW });
      doc.y += 18;
    }
  }

  function sectionTitle(text: string) {
    doc.moveDown(0.4);
    const rgb = hexToRgb(primaryColor);
    doc.rect(LEFT, doc.y, 3, 14).fill(primaryColor);
    doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(11)
      .text(text, LEFT + 10, doc.y, { width: contentW - 10 });
    doc.y += 4;
    doc.moveTo(LEFT, doc.y).lineTo(LEFT + contentW, doc.y)
      .strokeColor(`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`, ).lineWidth(0.4).stroke();
    doc.y += 8;
  }

  function traitBar(key: string, t: number, yPos: number) {
    const meta = TRAIT_META[key]!;
    const barW = contentW - 170;
    const barH = 10;
    const barX = LEFT + 170;

    // Label
    doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(9)
      .text(meta.label, LEFT, yPos + 1, { width: 160 });

    // Track
    doc.rect(barX, yPos, barW, barH).fillColor(C.muted).fill();

    // Norm band (T 40–60 = 33%–66%)
    const normStart = ((40 - 20) / 60) * barW;
    const normWidth = ((60 - 40) / 60) * barW;
    doc.rect(barX + normStart, yPos, normWidth, barH).fillColor('#cbd5e1').fill();

    // Score fill
    const fillW = Math.max(4, ((t - 20) / 60) * barW);
    doc.rect(barX, yPos, fillW, barH).fillColor(meta.color).fill();

    // T-score label
    doc.fillColor(meta.color).font('Helvetica-Bold').fontSize(8)
      .text(`${t} — ${tScoreLabel(t)}`, barX + barW + 6, yPos + 1, { width: 70 });
  }

  function compositeRow(label: string, value: number | null, yPos: number) {
    if (value == null) return;
    const color = compositeColor(value);
    doc.fillColor(C.mid).font('Helvetica').fontSize(9)
      .text(label, LEFT, yPos, { width: contentW - 60 });
    doc.fillColor(color).font('Helvetica-Bold').fontSize(9)
      .text(String(Math.round(value)), LEFT + contentW - 55, yPos, { width: 25, align: 'right' });

    const barX = LEFT + contentW - 26;
    const barW = 26;
    const barH = 7;
    doc.rect(barX, yPos, barW, barH).fillColor(C.muted).fill();
    const fillW = Math.max(2, (value / 80) * barW);
    doc.rect(barX, yPos, fillW, barH).fillColor(color).fill();
  }

  function footer(pageNum: number, section: string) {
    doc.fillColor(C.light).font('Helvetica').fontSize(7)
      .text(`${companyName} · TalentSignal™ Personality Assessment Report · ${section}`,
        LEFT, pageH - 36, { width: contentW - 60 })
      .text(`Page ${pageNum}`, LEFT + contentW - 30, pageH - 36, { width: 30, align: 'right' });
    doc.moveTo(LEFT, pageH - 42).lineTo(LEFT + contentW, pageH - 42)
      .strokeColor(C.muted).lineWidth(0.5).stroke();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Candidate: Archetype + Strengths
  // ════════════════════════════════════════════════════════════════════════════

  header(
    'PERSONALITY ASSESSMENT REPORT — YOUR PROFILE',
    'This report summarises your personality assessment results. It highlights your key strengths and areas for growth.',
  );

  // Archetype card
  const archetype = result.archetype ?? 'Your Profile';
  const archetypeDesc = ARCHETYPE_DESCRIPTIONS[archetype] ?? '';
  doc.rect(LEFT, doc.y, contentW, 56).fill(C.muted);
  doc.rect(LEFT, doc.y, 4, 56).fill(primaryColor);
  doc.fillColor(C.light).font('Helvetica').fontSize(8)
    .text('YOUR PERSONALITY ARCHETYPE', LEFT + 14, doc.y + 8);
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(18)
    .text(archetype, LEFT + 14, doc.y + 18);
  doc.fillColor(C.mid).font('Helvetica').fontSize(9)
    .text(archetypeDesc, LEFT + 14, doc.y + 36, { width: contentW - 24 });
  doc.y += 68;

  // Confidence + fit band
  const confidenceColor = result.confidenceScore >= 80 ? C.green : result.confidenceScore >= 60 ? C.yellow : C.red;
  doc.fillColor(C.mid).font('Helvetica').fontSize(9)
    .text(`Overall Fit: `, LEFT, doc.y, { continued: true })
    .fillColor(fitColor(result.fitBand)).font('Helvetica-Bold')
    .text(result.fitBand ?? '—', { continued: true })
    .fillColor(C.mid).font('Helvetica')
    .text(`   ·   Profile Confidence: `, { continued: true })
    .fillColor(confidenceColor).font('Helvetica-Bold')
    .text(`${result.confidenceScore}/100`);
  doc.y += 20;

  sectionTitle('Your Key Strengths');

  for (const { key } of top3) {
    const meta = TRAIT_META[key]!;
    const score = traitScores.find((t) => t.key === key)!;
    doc.rect(LEFT, doc.y, contentW, 44).fill(C.muted);
    doc.rect(LEFT, doc.y, 3, 44).fill(meta.color);
    doc.fillColor(meta.color).font('Helvetica-Bold').fontSize(10)
      .text(meta.label, LEFT + 10, doc.y + 6);
    doc.fillColor(C.dark).font('Helvetica').fontSize(9)
      .text(STRENGTH_DESCRIPTIONS[key] ?? '', LEFT + 10, doc.y + 18, { width: contentW - 20 });
    doc.y += 52;
  }

  sectionTitle('An Area to Continue Developing');

  doc.rect(LEFT, doc.y, contentW, 36).fill('#fefce8');
  doc.rect(LEFT, doc.y, 3, 36).fill(C.yellow);
  doc.fillColor(C.amber).font('Helvetica-Bold').fontSize(10)
    .text(TRAIT_META[lowest.key]!.label, LEFT + 10, doc.y + 6);
  doc.fillColor(C.dark).font('Helvetica').fontSize(9)
    .text(DEVELOPMENT_THEMES[lowest.key] ?? '', LEFT + 10, doc.y + 18, { width: contentW - 20 });
  doc.y += 44;

  footer(1, 'Candidate Copy');

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Candidate: Communication & Teamwork style
  // ════════════════════════════════════════════════════════════════════════════

  doc.addPage();
  header('YOUR WORKING STYLE', '');

  sectionTitle('How You Work Best');

  const styles = [
    { label: 'Communication Style', value: result.compCommStyle },
    { label: 'Decision Style',      value: result.compDecisionStyle },
    { label: 'Conflict Style',      value: result.compConflictStyle },
    { label: 'Stress Response',     value: result.compStressBand },
  ].filter((s) => s.value);

  for (const s of styles) {
    doc.rect(LEFT, doc.y, contentW, 30).fill(C.muted);
    doc.fillColor(C.light).font('Helvetica').fontSize(8)
      .text(s.label.toUpperCase(), LEFT + 10, doc.y + 6);
    doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(11)
      .text(s.value!, LEFT + 10, doc.y + 14);
    doc.y += 38;
  }

  doc.moveDown(0.5);

  sectionTitle('Your Personality Trait Profile');
  doc.fillColor(C.light).font('Helvetica').fontSize(8)
    .text('Shaded band shows the average range. Your score is the filled bar.',
      LEFT, doc.y, { width: contentW });
  doc.y += 12;

  for (const { key, t } of traitScores) {
    traitBar(key, t, doc.y);
    doc.y += 16;
  }

  doc.moveDown(0.8);

  // SJT if available
  if (result.sjtWork != null) {
    sectionTitle('Situational Judgment');
    const sjtItems = [
      { label: 'Work & Professional Judgment', t: result.sjtWork },
      { label: 'Safety Awareness',              t: result.sjtSafety },
      { label: 'Leadership Judgment',           t: result.sjtLeadership },
    ].filter((s) => s.t != null) as Array<{ label: string; t: number }>;

    for (const s of sjtItems) {
      traitBar(s.label as any, s.t, doc.y);
      doc.y += 16;
    }
  }

  doc.moveDown(0.5);
  doc.rect(LEFT, doc.y, contentW, 36).fill(C.muted);
  doc.fillColor(C.mid).font('Helvetica').fontSize(8).text(
    'This report is based on your responses to the TalentSignal™ personality assessment. ' +
    'Results reflect your tendencies and preferences — not a fixed judgement of your ability. ' +
    'All results are reviewed by the HR team as part of a holistic selection process.',
    LEFT + 10, doc.y + 8, { width: contentW - 20 },
  );
  doc.y += 44;

  footer(2, 'Candidate Copy');

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 3 — HR: Full profile + composites
  // ════════════════════════════════════════════════════════════════════════════

  doc.addPage();
  header(
    'HR ASSESSMENT REPORT — CONFIDENTIAL',
    'FOR HR USE ONLY. Do not share this section with the candidate. Contains full scoring, derailer flags, and interview guidance.',
  );

  // Confidential banner
  doc.rect(LEFT, doc.y - 6, contentW, 18).fill('#fef2f2');
  doc.fillColor(C.red).font('Helvetica-Bold').fontSize(8)
    .text('⚑  CONFIDENTIAL — HR COPY ONLY', LEFT + 8, doc.y - 2);
  doc.y += 18;

  // Summary row
  doc.rect(LEFT, doc.y, contentW, 48).fill(C.dark);
  const cols = [
    { label: 'Archetype',   value: result.archetype ?? '—' },
    { label: 'Fit Band',    value: result.fitBand ?? '—' },
    { label: 'Confidence',  value: `${result.confidenceScore}/100` },
    { label: 'Decision',    value: result.compDecisionStyle ?? '—' },
  ];
  const colW = contentW / 4;
  cols.forEach(({ label, value }, i) => {
    doc.fillColor(C.light).font('Helvetica').fontSize(7)
      .text(label.toUpperCase(), LEFT + i * colW + 8, doc.y + 8, { width: colW - 8 });
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10)
      .text(value, LEFT + i * colW + 8, doc.y + 18, { width: colW - 8 });
  });
  doc.y += 58;

  // Validity flags
  const validityFlags = [
    result.imFlagged && 'Impression Management',
    result.infFlagged && 'Attention Check Failed',
    result.consFlagged && 'Consistency Flag',
  ].filter(Boolean) as string[];

  if (validityFlags.length > 0) {
    doc.rect(LEFT, doc.y, contentW, 24).fill('#fef3c7');
    doc.fillColor(C.amber).font('Helvetica-Bold').fontSize(8)
      .text('⚠  Validity Flags: ' + validityFlags.join(' · '),
        LEFT + 8, doc.y + 8, { width: contentW - 16 });
    doc.y += 32;
  }

  sectionTitle('Composite Scores (T-score scale 20–80, average = 50)');

  const composites = [
    { label: 'Leadership Potential',  v: result.compLeadership },
    { label: 'Learning Agility',      v: result.compLearningAgility },
    { label: 'Accountability',        v: result.compAccountability },
    { label: 'Integrity & Ethics',    v: result.compIntegrity },
    { label: 'Team Compatibility',    v: result.compTeamCompatibility },
    { label: 'Emotional Resilience',  v: result.compEmotionalResilience },
    { label: 'Adaptability',          v: result.compAdaptability },
    { label: 'Risk Appetite',         v: result.compRiskAppetite },
  ].filter((c) => c.v != null);

  const half = Math.ceil(composites.length / 2);
  const leftCol  = composites.slice(0, half);
  const rightCol = composites.slice(half);
  const startY = doc.y;
  leftCol.forEach((c, i) => compositeRow(c.label, c.v!, startY + i * 18));
  rightCol.forEach((c, i) => {
    if (c.v == null) return;
    const color = compositeColor(c.v);
    doc.fillColor(C.mid).font('Helvetica').fontSize(9)
      .text(c.label, LEFT + contentW / 2 + 10, startY + i * 18, { width: contentW / 2 - 70 });
    doc.fillColor(color).font('Helvetica-Bold').fontSize(9)
      .text(String(Math.round(c.v)), LEFT + contentW - 55, startY + i * 18,
        { width: 25, align: 'right' });
  });
  doc.y = startY + Math.max(leftCol.length, rightCol.length) * 18 + 10;

  sectionTitle('HEXACO Trait Scores');
  doc.fillColor(C.light).font('Helvetica').fontSize(8)
    .text('Shaded band = norm range (T 40–60)', LEFT, doc.y, { width: contentW });
  doc.y += 10;
  for (const { key, t } of traitScores) {
    traitBar(key, t, doc.y);
    doc.y += 16;
  }

  footer(3, 'HR Confidential');

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 4 — HR: Role-fit + derailers + interview probes
  // ════════════════════════════════════════════════════════════════════════════

  doc.addPage();
  header('HR ASSESSMENT REPORT — HIRING GUIDANCE', '');

  sectionTitle('Role-Fit Matrix');

  for (const [role, score] of topRoles) {
    const color = score >= 70 ? C.green : score >= 55 ? C.blue : score >= 40 ? C.yellow : C.red;
    const band = score >= 70 ? 'Strong Fit' : score >= 55 ? 'Fit' : score >= 40 ? 'Conditional' : 'Low Fit';
    const barW = contentW - 160;
    const barX = LEFT + 145;

    doc.fillColor(C.dark).font('Helvetica').fontSize(9).text(role, LEFT, doc.y + 2, { width: 140 });
    doc.rect(barX, doc.y + 1, barW, 9).fill(C.muted);
    const fillW = Math.max(3, (score / 80) * barW);
    doc.rect(barX, doc.y + 1, fillW, 9).fill(color);
    doc.fillColor(color).font('Helvetica-Bold').fontSize(8)
      .text(`${score} — ${band}`, barX + barW + 6, doc.y + 2, { width: 60 });
    doc.y += 18;
  }

  doc.fillColor(C.light).font('Helvetica').fontSize(7)
    .text('≥70 Strong Fit  ·  55–69 Fit  ·  40–54 Conditional  ·  <40 Low Fit',
      LEFT, doc.y, { width: contentW });
  doc.y += 16;

  // Derailer flags
  const derailers = (result.derailerFlags ?? []) as string[];
  sectionTitle('Potential Risk Flags');
  if (derailers.length === 0) {
    doc.rect(LEFT, doc.y, contentW, 22).fill(C.muted);
    doc.fillColor(C.green).font('Helvetica-Bold').fontSize(9)
      .text('✓  No derailer flags detected', LEFT + 10, doc.y + 7);
    doc.y += 30;
  } else {
    doc.rect(LEFT, doc.y, contentW, 18).fill('#fef3c7');
    doc.fillColor(C.amber).font('Helvetica').fontSize(8)
      .text('These flags indicate behavioural risks to probe at interview — not character verdicts.',
        LEFT + 8, doc.y + 5, { width: contentW - 16 });
    doc.y += 24;
    for (const flag of derailers) {
      doc.rect(LEFT, doc.y, contentW, 20).fill('#fff7ed');
      doc.rect(LEFT, doc.y, 3, 20).fill(C.orange);
      doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(9)
        .text(flag, LEFT + 10, doc.y + 6);
      doc.y += 26;
    }
  }

  doc.moveDown(0.3);
  sectionTitle('Suggested Interview Questions');
  doc.fillColor(C.mid).font('Helvetica').fontSize(8)
    .text('Based on this candidate\'s profile. Use behavioural (STAR) framing.',
      LEFT, doc.y, { width: contentW });
  doc.y += 12;

  interviewProbes.forEach((probe, i) => {
    doc.rect(LEFT, doc.y, contentW, 28).fill(i % 2 === 0 ? C.muted : C.white);
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8)
      .text(`Q${i + 1}`, LEFT + 8, doc.y + 8);
    doc.fillColor(C.dark).font('Helvetica').fontSize(9)
      .text(probe, LEFT + 26, doc.y + 8, { width: contentW - 34 });
    doc.y += 34;
  });

  doc.moveDown(0.5);

  // HR disclaimer
  doc.rect(LEFT, doc.y, contentW, 44).fill(C.muted);
  doc.fillColor(C.mid).font('Helvetica').fontSize(7.5).text(
    'DISCLAIMER: This report is generated by an automated psychometric tool and is intended as one input in a holistic ' +
    'selection process. Results should always be interpreted by a qualified HR professional alongside other evidence ' +
    '(interview, references, work samples). No hiring decision should be made solely on the basis of this report. ' +
    `${companyName} assumes full responsibility for the appropriate use of this tool in compliance with applicable employment laws.`,
    LEFT + 10, doc.y + 8, { width: contentW - 20 },
  );
  doc.y += 52;

  footer(4, 'HR Confidential');

  // ── Finalise ─────────────────────────────────────────────────────────────────
  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}
