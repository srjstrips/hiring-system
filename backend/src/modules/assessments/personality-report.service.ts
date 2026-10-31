/**
 * TalentSignal™ / SRJ Talent Acquisition — PDF Report
 * Page 1: Candidate-facing report matching the approved reference design.
 * Page 2: HR-only full HEXACO profile (not sent to candidate).
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/config/database';
import { generateInterviewProbes } from './personality-scoring.service';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  orange:  '#FF6B00',
  dark:    '#111827',
  navy:    '#1e293b',
  mid:     '#475569',
  light:   '#94a3b8',
  muted:   '#f8fafc',
  border:  '#e2e8f0',
  white:   '#ffffff',
  green:   '#16a34a',
  greenBg: '#f0fdf4',
  red:     '#dc2626',
  amber:   '#d97706',
  amberBg: '#fff7ed',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hex2rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function fill(doc: InstanceType<typeof PDFDocument>, hex: string) {
  const [r,g,b] = hex2rgb(hex);
  doc.fillColor([r,g,b] as unknown as string);
}

function stroke(doc: InstanceType<typeof PDFDocument>, hex: string) {
  const [r,g,b] = hex2rgb(hex);
  doc.strokeColor([r,g,b] as unknown as string);
}

/** Convert HEXACO T-score (20–80) to 1–5 display scale. */
function t5(t: number | null | undefined): number {
  if (t == null) return 3.0;
  const c = Math.min(80, Math.max(20, t));
  return Math.round(((c - 20) / 60 * 4 + 1) * 10) / 10;
}

/** Average a set of nullable numbers (ignores nulls). */
function avg(...vals: (number | null | undefined)[]): number {
  const v = vals.filter((x): x is number => x != null);
  return v.length ? v.reduce((a,b) => a+b, 0) / v.length : 50;
}

/** Rating label for a 1–5 trait score (card badges). */
function traitRating(s: number): { label: string; color: string; bg: string } {
  if (s >= 3.5) return { label: 'Good',       color: C.green, bg: C.greenBg };
  if (s >= 2.5) return { label: 'Moderate',   color: C.amber, bg: C.amberBg };
  if (s >= 1.5) return { label: 'Developing', color: C.amber, bg: C.amberBg };
  return         { label: 'Low',         color: C.red,   bg: '#fef2f2' };
}

/** Overall fit label (headline). */
function fitLabel(s: number): string {
  if (s >= 4.1) return 'Excellent Fit';
  if (s >= 3.1) return 'Good Fit';
  if (s >= 2.1) return 'Moderate Fit';
  return 'Low Fit';
}

/** Overall fit description sentence. */
function fitDesc(s: number): string {
  if (s >= 4.1) return 'The candidate demonstrates exceptional alignment with workplace behaviours required for this role.';
  if (s >= 3.1) return 'The candidate shows a positive overall alignment with key workplace behaviours for the role.';
  if (s >= 2.1) return 'The candidate shows moderate alignment. Some key behaviours may need further development.';
  return 'The candidate shows limited alignment with key behaviours. Structured development support is recommended.';
}

/** Trait card description based on trait name and score band. */
function traitDesc(label: string, score: number): string {
  const hi = score >= 3.5;
  const lo = score < 2.5;
  if (label === 'Leadership') {
    if (hi) return 'Shows strong initiative and naturally guides others. Demonstrates high confidence in taking responsibility and driving results.';
    if (lo) return 'Has potential to develop leadership confidence. Focused practice in guiding others and taking initiative will help.';
    return 'Shows initiative and comfort in guiding others. Demonstrates confidence in taking responsibility.';
  }
  if (label === 'Learning Adaptability') {
    if (hi) return 'Highly open to learning new tools and embraces change quickly. Shows strong willingness to develop skills and adapt to new environments.';
    if (lo) return 'Can further develop adaptability to new tools and changing situations. Structured learning support may help build confidence.';
    return 'Open to learning new tools and adapts well to change. Shows willingness to develop new skills.';
  }
  if (label === 'Problem Solving') {
    if (hi) return 'Demonstrates strong analytical ability and consistently finds effective solutions. Excels in handling complex situations independently.';
    if (lo) return 'Can improve in analysing issues and finding effective solutions. May need guidance in complex situations.';
    return 'Approaches problems methodically. Generally finds workable solutions with some guidance in complex cases.';
  }
  if (label === 'Teamwork') {
    if (hi) return 'Excellent collaborator who actively supports team goals. Builds strong working relationships and contributes positively to team dynamics.';
    if (lo) return 'Has potential to develop team collaboration skills. Building relationship confidence may improve team contributions.';
    return 'Collaborates well with others and supports team goals. Maintains a positive working relationship.';
  }
  return '';
}

function formatDate(d: Date): string {
  return d.toLocaleString('en-IN', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true,
    timeZone:'Asia/Kolkata',
  });
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

/** Draws a rounded rectangle fill. */
function roundedRect(
  doc: InstanceType<typeof PDFDocument>,
  x: number, y: number, w: number, h: number,
  r: number, hexFill: string, hexStroke?: string, strokeW = 0.5,
) {
  const [fr,fg,fb] = hex2rgb(hexFill);
  doc.save()
    .roundedRect(x, y, w, h, r)
    .fillColor([fr,fg,fb] as unknown as string);
  if (hexStroke) {
    const [sr,sg,sb] = hex2rgb(hexStroke);
    doc.strokeColor([sr,sg,sb] as unknown as string).lineWidth(strokeW).fillAndStroke();
  } else {
    doc.fill();
  }
  doc.restore();
}

/** Draws a filled progress bar (orange on light gray). */
function progressBar(
  doc: InstanceType<typeof PDFDocument>,
  x: number, y: number, w: number, h: number, fraction: number,
) {
  roundedRect(doc, x, y, w, h, h/2, '#e2e8f0');
  const fw = Math.max(h, w * Math.min(1, Math.max(0, fraction)));
  roundedRect(doc, x, y, fw, h, h/2, C.orange);
}

/** Draws the donut/arc chart. */
function donutChart(
  doc: InstanceType<typeof PDFDocument>,
  cx: number, cy: number, radius: number, score: number, maxScore = 5,
) {
  const thickness = 14;
  // 270-degree arc, starting at ~215° (7-o'clock position clockwise from east)
  const startAngle = (215 / 180) * Math.PI;
  const totalSweep = (270 / 180) * Math.PI;
  const scoreEnd   = startAngle + totalSweep * Math.min(1, score / maxScore);
  const fullEnd    = startAngle + totalSweep;

  // Background arc (gray)
  doc.save();
  (doc as any).arc(cx, cy, radius, startAngle, fullEnd, false);
  doc.lineWidth(thickness).lineCap('round');
  stroke(doc, '#e2e8f0');
  doc.stroke();
  doc.restore();

  // Filled arc (orange)
  if (score > 0) {
    doc.save();
    (doc as any).arc(cx, cy, radius, startAngle, scoreEnd, false);
    doc.lineWidth(thickness).lineCap('round');
    stroke(doc, C.orange);
    doc.stroke();
    doc.restore();
  }

  // Center score text
  const scoreStr = score.toFixed(1);
  doc.save();
  fill(doc, C.dark);
  doc.font('Helvetica-Bold').fontSize(20)
    .text(scoreStr, cx - 24, cy - 14, { width: 48, align: 'center' });
  fill(doc, C.mid);
  doc.font('Helvetica').fontSize(9)
    .text(`/ ${maxScore}`, cx - 24, cy + 8, { width: 48, align: 'center' });
  doc.font('Helvetica').fontSize(7)
    .text('Average', cx - 20, cy + 20, { width: 40, align: 'center' });
  doc.font('Helvetica').fontSize(7)
    .text('Score', cx - 20, cy + 28, { width: 40, align: 'center' });
  doc.restore();
}

/** Page footer line. */
function pageFooter(
  doc: InstanceType<typeof PDFDocument>,
  pageH: number, pageW: number, margin: number, pageNum: number,
) {
  const y = pageH - 30;
  doc.save();
  fill(doc, C.light);
  doc.moveTo(margin, y - 6).lineTo(pageW - margin, y - 6);
  stroke(doc, C.border);
  doc.lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(7.5)
    .text('Confidential — prepared for SRJ HR', margin, y, { width: pageW - margin * 2 - 60 });
  doc.text(`Page ${pageNum}`, margin, y, { width: pageW - margin * 2, align: 'right' });
  doc.restore();
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generatePersonalityReportPdf(
  assessmentId: string,
  assignmentId: string,
  opts?: { candidateOnly?: boolean },
): Promise<Buffer> {

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const assignment = await prisma.assessmentAssignment.findFirst({
    where: { id: assignmentId, assessmentId },
    include: {
      assessment: { select: { name: true } },
      candidate: { select: { firstName: true, lastName: true, email: true, phone: true,
        currentCompany: true, currentDesignation: true, totalExperience: true } },
      job: { select: { title: true } },
    },
  });
  if (!assignment) throw new Error('Assignment not found');

  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { assignmentId, submittedAt: { not: null } },
    orderBy: { attemptNumber: 'desc' },
  });
  if (!attempt) throw new Error('No completed attempt found');

  let result = await prisma.assessmentPersonalityResult.findUnique({
    where: { attemptId: attempt.id },
  });
  if (!result) {
    // Scoring may have failed asynchronously after submission — retry it now.
    try {
      const { scorePersonalityAttempt } = await import('./personality-scoring.service');
      await scorePersonalityAttempt(attempt.id);
      result = await prisma.assessmentPersonalityResult.findUnique({ where: { attemptId: attempt.id } });
    } catch (err) {
      console.error('[PDF] Re-scoring failed for attempt', attempt.id, err);
    }
    if (!result) throw new Error('Assessment result is not yet available. Please wait a moment and try again.');
  }

  // Count questions per HEXACO trait from snapshots
  const fullAttempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attempt.id },
    include: { questionSnapshots: { select: { trait: true } } },
  });
  const qCounts: Record<string, number> = {};
  for (const q of fullAttempt?.questionSnapshots ?? []) {
    const tr = (q.trait as string) || 'OTHER';
    qCounts[tr] = (qCounts[tr] ?? 0) + 1;
  }

  // ── Compute 4 display traits ───────────────────────────────────────────────
  const leadershipScore = t5(result.compLeadership ?? avg(result.tX, result.tC));
  const learningScore   = t5(result.compAdaptability ?? result.compLearningAgility ?? result.tO);
  const problemScore    = t5(result.tES);
  const teamworkScore   = t5(result.compTeamCompatibility ?? avg(result.tA, result.tH));
  const overallScore    = Math.round((leadershipScore + learningScore + problemScore + teamworkScore) / 4 * 10) / 10;

  const displayTraits = [
    { label: 'Leadership',           score: leadershipScore, qCount: (qCounts['X']??0)+(qCounts['C']??0) },
    { label: 'Learning Adaptability',score: learningScore,   qCount: (qCounts['O']??0) },
    { label: 'Problem Solving',       score: problemScore,    qCount: (qCounts['ES']??0) },
    { label: 'Teamwork',              score: teamworkScore,   qCount: (qCounts['A']??0)+(qCounts['H']??0) },
  ];
  // Ensure at least 1 question shown per trait (fallback if trait tagging differs)
  for (const t of displayTraits) {
    if (t.qCount === 0) t.qCount = Math.round(25 / 4);
  }

  // Strengths = traits scored ≥ 3.5; Improvements = traits scored < 2.5
  const STRENGTH_BULLETS: Record<string, string[]> = {
    'Leadership':           ['Comfortable in leadership situations', 'Willingness to take initiative'],
    'Learning Adaptability':['Positive attitude towards learning',   'Strong adaptability to change'],
    'Problem Solving':       ['Effective at analysing situations',   'Good decision-making approach'],
    'Teamwork':              ['Good team collaboration approach',    'Supports team goals effectively'],
  };
  const IMPROVEMENT_BULLETS: Record<string, string[]> = {
    'Leadership':           ['Leadership confidence can be further developed'],
    'Learning Adaptability':['Adaptability to new situations can be improved'],
    'Problem Solving':       ['Problem solving skills can be further developed',
                              'Needs to build more confidence in complex situations'],
    'Teamwork':              ['Team collaboration skills can be enhanced'],
  };

  const strengths: string[] = [];
  const improvements: string[] = [];
  for (const dt of [...displayTraits].sort((a,b) => b.score - a.score)) {
    if (dt.score >= 3.5) strengths.push(...(STRENGTH_BULLETS[dt.label] ?? []));
    if (dt.score < 2.5)  improvements.push(...(IMPROVEMENT_BULLETS[dt.label] ?? []));
  }
  if (improvements.length === 0) {
    improvements.push('Can improve consistency in decision making');
  }
  if (strengths.length === 0) {
    strengths.push('Shows potential across assessed behaviours');
  }

  const candidateName = `${assignment.candidate.firstName ?? ''} ${assignment.candidate.lastName ?? ''}`.trim() || 'Candidate';
  const submittedAt   = attempt.submittedAt ?? new Date();
  const startedAt     = attempt.startedAt ?? submittedAt;
  const timeTakenMs   = submittedAt.getTime() - startedAt.getTime();

  // Logo
  const logoPath = path.join(__dirname, '../assets/srj-logo.png');
  const hasLogo  = fs.existsSync(logoPath);

  // ── Create PDF ─────────────────────────────────────────────────────────────
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `Candidate Assessment Report — ${candidateName}`,
      Author: 'SRJ Group',
      Subject: 'SRJ Talent Acquisition — Personality & Workplace Behaviour Analysis',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  const PW  = doc.page.width;   // 595
  const PH  = doc.page.height;  // 842
  const M   = 36;               // margin
  const CW  = PW - M * 2;      // content width = 523

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Candidate Report
  // ══════════════════════════════════════════════════════════════════════════

  // ── 1. White header band (0–88) ──────────────────────────────────────────
  doc.rect(0, 0, PW, 88).fill(C.white);

  // SRJ Logo
  if (hasLogo) {
    doc.image(logoPath, M, 16, { height: 50 });
  } else {
    fill(doc, C.orange);
    doc.font('Helvetica-Bold').fontSize(18).text('SRJ', M, 26);
    fill(doc, C.mid);
    doc.font('Helvetica').fontSize(7).text('WORLD OF STEEL', M, 46);
  }

  // Top-right tagline
  fill(doc, C.navy);
  doc.font('Helvetica-Bold').fontSize(8).text('BUILDING A STRONGER INDIA', 0, 24, { width: PW - M, align: 'right' });
  fill(doc, C.orange);
  doc.font('Helvetica-Bold').fontSize(8).text('THROUGH PEOPLE', 0, 34, { width: PW - M, align: 'right' });

  // Orange divider line
  doc.rect(0, 85, PW, 3).fill(C.orange);

  // ── 2. Title section (92–178) ────────────────────────────────────────────
  const titleY = 96;

  // "SRJ TALENT ACQUISITION" label
  fill(doc, C.orange);
  doc.rect(M, titleY, 18, 1.5).fill(C.orange);
  doc.font('Helvetica-Bold').fontSize(8).text('SRJ TALENT ACQUISITION', M + 22, titleY - 1);

  // Main title: "Candidate" (dark) + "Assessment Report" (orange)
  fill(doc, C.dark);
  doc.font('Helvetica-Bold').fontSize(22).text('Candidate ', M, titleY + 12, { continued: true });
  fill(doc, C.orange);
  doc.font('Helvetica-Bold').fontSize(22).text('Assessment Report');

  // Subtitle
  fill(doc, C.mid);
  doc.font('Helvetica').fontSize(10).text('Personality & Workplace Behaviour Analysis', M, titleY + 38);

  // Right side: report date + time taken
  const rd = { x: PW - M - 170, y: titleY + 4 };
  fill(doc, C.light);
  doc.font('Helvetica').fontSize(7.5).text('Report Generated', rd.x, rd.y);
  fill(doc, C.dark);
  doc.font('Helvetica-Bold').fontSize(9).text(formatDate(submittedAt), rd.x, rd.y + 10);
  fill(doc, C.light);
  doc.font('Helvetica').fontSize(7.5).text('Time Taken', rd.x, rd.y + 24);
  fill(doc, C.dark);
  doc.font('Helvetica-Bold').fontSize(9).text(formatDuration(timeTakenMs), rd.x, rd.y + 34);

  // ── 3. Candidate card (185–265) ──────────────────────────────────────────
  const cardY = 182;
  const cardH = 74;
  roundedRect(doc, M, cardY, CW, cardH, 8, C.white, C.border);

  // Avatar circle
  doc.save();
  fill(doc, '#f1f5f9');
  doc.circle(M + 38, cardY + cardH / 2, 26).fill();
  // Person icon (simplified)
  fill(doc, C.light);
  doc.circle(M + 38, cardY + cardH / 2 - 8, 9).fill();
  doc.ellipse(M + 38, cardY + cardH / 2 + 13, 14, 10).fill();
  doc.restore();

  // Name + role + email
  const cix = M + 72;
  fill(doc, C.dark);
  doc.font('Helvetica-Bold').fontSize(13).text(candidateName, cix, cardY + 10);
  fill(doc, C.mid);
  doc.font('Helvetica').fontSize(9).text(assignment.job?.title ?? 'Applicant', cix, cardY + 26);
  fill(doc, C.mid);
  // Email icon approximation
  doc.font('Helvetica').fontSize(8.5).text(`✉  ${assignment.candidate.email ?? ''}`, cix, cardY + 40);
  if (assignment.job?.title) {
    doc.font('Helvetica').fontSize(8.5).text(`⬛  ${assignment.job.title}`, cix, cardY + 52);
  }

  // Right stats
  const statX = M + CW - 240;
  const statW = 110;

  const candidateStats = [
    { icon: '🏢', label: 'Current Company', value: assignment.candidate.currentCompany ?? '—' },
    { icon: '👔', label: 'Designation',      value: assignment.candidate.currentDesignation ?? '—' },
  ];
  const expStats = [
    { icon: '💼', label: 'Experience',
      value: assignment.candidate.totalExperience != null
        ? `${assignment.candidate.totalExperience} years` : '—' },
  ];

  let sY = cardY + 8;
  for (const st of [...candidateStats]) {
    fill(doc, C.light);
    doc.font('Helvetica').fontSize(7.5).text(st.label, statX, sY);
    fill(doc, C.dark);
    doc.font('Helvetica-Bold').fontSize(9).text(st.value, statX, sY + 10);
    sY += 28;
  }
  sY = cardY + 8;
  for (const st of expStats) {
    fill(doc, C.light);
    doc.font('Helvetica').fontSize(7.5).text(st.label, statX + statW + 10, sY);
    fill(doc, C.dark);
    doc.font('Helvetica-Bold').fontSize(9).text(st.value, statX + statW + 10, sY + 10);
    sY += 28;
  }

  // ── 4. Overall Assessment card (272–368) ─────────────────────────────────
  const oaY = 265;
  const oaH = 102;
  roundedRect(doc, M, oaY, CW, oaH, 8, C.white, C.orange, 1);

  // Label
  fill(doc, C.mid);
  doc.font('Helvetica-Bold').fontSize(8).text('OVERALL ASSESSMENT', M + 16, oaY + 12);

  // Big fit label
  fill(doc, C.orange);
  doc.font('Helvetica-Bold').fontSize(22).text(fitLabel(overallScore), M + 16, oaY + 24);

  // Description
  fill(doc, C.mid);
  doc.font('Helvetica').fontSize(8.5).text(fitDesc(overallScore), M + 16, oaY + 52, { width: 180 });

  // Donut chart
  const donutCX = M + CW - 220;
  const donutCY = oaY + oaH / 2 + 2;
  donutChart(doc, donutCX, donutCY, 36, overallScore);

  // Rating legend
  const legX = M + CW - 154;
  const legY = oaY + 10;
  const legendItems = [
    { range: '4.1 – 5.0', label: 'Excellent Fit', color: C.green },
    { range: '3.1 – 4.0', label: 'Good Fit',      color: C.orange },
    { range: '2.1 – 3.0', label: 'Moderate Fit',  color: C.amber },
    { range: '1.0 – 2.0', label: 'Low Fit',        color: C.red },
  ];
  for (const [i, li] of legendItems.entries()) {
    const ly = legY + i * 22;
    fill(doc, C.mid);
    doc.font('Helvetica').fontSize(8).text(li.range, legX, ly + 3, { width: 55 });
    fill(doc, li.color);
    doc.font('Helvetica-Bold').fontSize(8).text(li.label, legX + 60, ly + 3, { width: 80 });
  }

  // ── 5. Trait Summary (376–612) ────────────────────────────────────────────
  const tsY = 375;

  fill(doc, C.dark);
  doc.font('Helvetica-Bold').fontSize(12).text('TRAIT SUMMARY', M, tsY);
  // Orange underline
  doc.rect(M, tsY + 14, 52, 2).fill(C.orange);

  fill(doc, C.mid);
  doc.font('Helvetica').fontSize(8).text(
    `The scores below are based on the candidate's responses to ${
      Object.values(qCounts).reduce((a,b)=>a+b,0) || 25
    } questions across key behavioural traits.`,
    M + CW - 300, tsY + 2, { width: 296 },
  );

  // 4 trait cards — 2 columns × 2 rows
  const tcW  = (CW - 12) / 2;   // card width
  const tcH  = 110;              // card height
  const tcGap = 12;              // gap between cards
  const tc1Y  = tsY + 26;       // row 1 top
  const tc2Y  = tc1Y + tcH + tcGap;  // row 2 top

  const tcPositions = [
    { x: M,             y: tc1Y },
    { x: M + tcW + tcGap, y: tc1Y },
    { x: M,             y: tc2Y },
    { x: M + tcW + tcGap, y: tc2Y },
  ];

  for (const [i, dt] of displayTraits.entries()) {
    const { x: tx, y: ty } = tcPositions[i]!;
    const rating = traitRating(dt.score);
    roundedRect(doc, tx, ty, tcW, tcH, 8, C.white, C.border);

    // Trait icon area (colored circle placeholder)
    fill(doc, rating.bg);
    doc.circle(tx + 18, ty + 18, 12).fill();
    // Simple icon letter
    fill(doc, rating.color);
    doc.font('Helvetica-Bold').fontSize(10)
      .text(dt.label[0]!, tx + 14, ty + 12, { width: 12, align: 'center' });

    // Trait name
    fill(doc, C.dark);
    doc.font('Helvetica-Bold').fontSize(9).text(dt.label.toUpperCase(), tx + 36, ty + 10);

    // Score + rating badge on same row
    fill(doc, C.dark);
    doc.font('Helvetica-Bold').fontSize(14)
      .text(`${dt.score.toFixed(1)} `, tx + 10, ty + 34, { continued: true });
    fill(doc, C.mid);
    doc.font('Helvetica').fontSize(9).text('/ 5', { continued: false });

    // Rating badge
    const ratingW = doc.widthOfString(rating.label) + 14;
    roundedRect(doc, tx + 70, ty + 35, ratingW, 16, 8, rating.bg);
    fill(doc, rating.color);
    doc.font('Helvetica-Bold').fontSize(8).text(rating.label, tx + 77, ty + 39);

    // Progress bar
    progressBar(doc, tx + 10, ty + 60, tcW - 20, 7, dt.score / 5);

    // Question count
    fill(doc, C.light);
    doc.font('Helvetica').fontSize(7.5).text(`Based on ${dt.qCount} question${dt.qCount !== 1 ? 's' : ''}`, tx + 10, ty + 72);

    // Description
    fill(doc, C.mid);
    doc.font('Helvetica').fontSize(7.5).text(traitDesc(dt.label, dt.score), tx + 10, ty + 83, { width: tcW - 20 });
  }

  // ── 6. Key Strengths + Areas (tc2Y + tcH + 16 …) ─────────────────────────
  const botY = tc2Y + tcH + 16;
  const halfW = (CW - 12) / 2;

  // Strengths
  roundedRect(doc, M, botY, halfW, 90, 8, C.white, C.border);
  fill(doc, C.green);
  doc.circle(M + 14, botY + 15, 6).fill();
  fill(doc, C.white);
  doc.font('Helvetica-Bold').fontSize(8).text('✓', M + 11, botY + 10);
  fill(doc, C.dark);
  doc.font('Helvetica-Bold').fontSize(9).text('KEY STRENGTHS', M + 24, botY + 10);
  fill(doc, C.green);
  doc.rect(M + 10, botY + 21, 36, 1.5).fill(C.green);

  let sby = botY + 28;
  for (const s of strengths.slice(0, 4)) {
    fill(doc, C.green);
    doc.circle(M + 16, sby + 4, 5).fill();
    fill(doc, C.white);
    doc.font('Helvetica-Bold').fontSize(7).text('✓', M + 13, sby + 1);
    fill(doc, C.dark);
    doc.font('Helvetica').fontSize(8).text(s, M + 26, sby, { width: halfW - 34 });
    sby += 14;
  }

  // Areas for Improvement
  const afix = M + halfW + tcGap;
  roundedRect(doc, afix, botY, halfW, 90, 8, C.white, C.border);
  fill(doc, C.orange);
  doc.circle(afix + 14, botY + 15, 6).fill();
  fill(doc, C.white);
  doc.font('Helvetica-Bold').fontSize(9).text('!', afix + 12, botY + 9);
  fill(doc, C.dark);
  doc.font('Helvetica-Bold').fontSize(9).text('AREAS FOR IMPROVEMENT', afix + 24, botY + 10);
  fill(doc, C.orange);
  doc.rect(afix + 10, botY + 21, 56, 1.5).fill(C.orange);

  let aby = botY + 28;
  for (const a of improvements.slice(0, 4)) {
    fill(doc, C.orange);
    doc.circle(afix + 16, aby + 4, 5).fill();
    fill(doc, C.white);
    doc.font('Helvetica-Bold').fontSize(8).text('!', afix + 13, aby + 1);
    fill(doc, C.dark);
    doc.font('Helvetica').fontSize(8).text(a, afix + 26, aby, { width: halfW - 34 });
    aby += 14;
  }

  // Footer page 1
  pageFooter(doc, PH, PW, M, 1);

  // ══════════════════════════════════════════════════════════════════════════
  // Candidate-only: end here (email attachment)
  // ══════════════════════════════════════════════════════════════════════════
  if (opts?.candidateOnly) {
    doc.end();
    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — HR Confidential: Full HEXACO profile
  // ══════════════════════════════════════════════════════════════════════════

  doc.addPage();

  // Header
  doc.rect(0, 0, PW, 52).fill(C.navy);
  fill(doc, C.white);
  doc.font('Helvetica-Bold').fontSize(13).text('HR Assessment Report — Confidential', M, 14);
  fill(doc, C.orange);
  doc.font('Helvetica').fontSize(8.5)
    .text('FOR HR USE ONLY · Do not share with the candidate', M, 32);
  doc.rect(0, 52, PW, 3).fill(C.orange);

  // Candidate summary strip
  doc.rect(0, 55, PW, 36).fill('#f8fafc');
  fill(doc, C.dark);
  doc.font('Helvetica-Bold').fontSize(11).text(candidateName, M, 63);
  fill(doc, C.mid);
  doc.font('Helvetica').fontSize(9)
    .text(`${assignment.job?.title ?? ''}  ·  ${assignment.candidate.email ?? ''}`, M, 77);
  fill(doc, C.mid);
  doc.font('Helvetica').fontSize(9)
    .text(`Submitted: ${formatDate(submittedAt)}  ·  Time taken: ${formatDuration(timeTakenMs)}`,
      M + CW - 280, 70, { width: 280, align: 'right' });

  let y = 104;

  // Validity flags
  const flags = [
    result.imFlagged  && 'Impression Management',
    result.infFlagged && 'Attention Check Failed',
    result.consFlagged && 'Consistency Flag',
  ].filter(Boolean) as string[];

  if (flags.length > 0) {
    roundedRect(doc, M, y, CW, 22, 4, '#fef3c7', '#d97706', 0.5);
    fill(doc, C.amber);
    doc.font('Helvetica-Bold').fontSize(8)
      .text('⚠  Validity Flags: ' + flags.join(' · '), M + 10, y + 7, { width: CW - 20 });
    y += 30;
  }

  // Archetype + fit row
  const aRow = [
    { lbl: 'Archetype',        val: result.archetype ?? '—' },
    { lbl: 'Fit Band',         val: result.fitBand ?? '—' },
    { lbl: 'Profile Confidence', val: `${result.confidenceScore ?? 0}/100` },
    { lbl: 'Decision Style',   val: result.compDecisionStyle ?? '—' },
  ];
  roundedRect(doc, M, y, CW, 42, 6, C.navy);
  const colW4 = CW / 4;
  for (const [i, col] of aRow.entries()) {
    fill(doc, C.light);
    doc.font('Helvetica').fontSize(7).text(col.lbl.toUpperCase(), M + i*colW4 + 8, y + 8, { width: colW4 - 16 });
    fill(doc, C.white);
    doc.font('Helvetica-Bold').fontSize(9.5).text(col.val, M + i*colW4 + 8, y + 20, { width: colW4 - 16 });
  }
  y += 52;

  // Section: HEXACO trait T-scores
  fill(doc, C.dark);
  doc.rect(M, y, 3, 14).fill(C.orange);
  doc.font('Helvetica-Bold').fontSize(10).text('HEXACO Trait Scores  (T-score scale: 20–80, average = 50)', M + 10, y + 1);
  fill(doc, C.light);
  doc.font('Helvetica').fontSize(7.5)
    .text('Shaded band = norm range (T 40–60). Filled bar = candidate score.', M + 10, y + 14, { width: CW });
  y += 28;

  const HEXACO_META: Record<string, { label: string; color: string }> = {
    H:  { label: 'Honesty & Integrity',       color: '#7c3aed' },
    ES: { label: 'Emotional Stability',        color: '#0891b2' },
    X:  { label: 'Extraversion & Energy',      color: '#d97706' },
    A:  { label: 'Agreeableness & Teamwork',   color: '#16a34a' },
    C:  { label: 'Conscientiousness & Drive',  color: '#b45309' },
    O:  { label: 'Openness & Adaptability',    color: '#0284c7' },
  };

  const tScores = [
    { key:'H',  t: result.tH  ?? 50 },
    { key:'ES', t: result.tES ?? 50 },
    { key:'X',  t: result.tX  ?? 50 },
    { key:'A',  t: result.tA  ?? 50 },
    { key:'C',  t: result.tC  ?? 50 },
    { key:'O',  t: result.tO  ?? 50 },
  ];

  function tLabel(t: number) {
    if (t >= 65) return 'High';
    if (t >= 55) return 'Above Average';
    if (t >= 45) return 'Average';
    if (t >= 35) return 'Below Average';
    return 'Low';
  }

  for (const { key, t } of tScores) {
    const meta = HEXACO_META[key]!;
    const barX = M + 165;
    const barW = CW - 230;
    const barH = 10;

    fill(doc, C.dark);
    doc.font('Helvetica-Bold').fontSize(8.5).text(meta.label, M, y + 1, { width: 160 });

    // Track
    doc.rect(barX, y, barW, barH).fillColor('#f1f5f9').fill();
    // Norm band
    const nb = ((40-20)/60)*barW;
    const nw = ((60-40)/60)*barW;
    doc.rect(barX+nb, y, nw, barH).fillColor('#cbd5e1').fill();
    // Score fill
    const fw = Math.max(4, ((t-20)/60)*barW);
    const [mr,mg,mb] = hex2rgb(meta.color);
    doc.rect(barX, y, fw, barH).fillColor([mr,mg,mb] as unknown as string).fill();

    fill(doc, { color: meta.color } as unknown as string);
    doc.fillColor([mr,mg,mb] as unknown as string)
      .font('Helvetica-Bold').fontSize(8)
      .text(`${t} — ${tLabel(t)}`, barX + barW + 6, y + 1, { width: 90 });

    y += 18;
  }

  y += 6;

  // Composites section
  doc.rect(M, y, 3, 14).fill(C.orange);
  fill(doc, C.dark);
  doc.font('Helvetica-Bold').fontSize(10).text('Composite Scores', M + 10, y + 1);
  y += 22;

  const composites = [
    ['Leadership Potential',   result.compLeadership],
    ['Learning Agility',       result.compLearningAgility],
    ['Accountability',         result.compAccountability],
    ['Integrity & Ethics',     result.compIntegrity],
    ['Team Compatibility',     result.compTeamCompatibility],
    ['Emotional Resilience',   result.compEmotionalResilience],
    ['Adaptability',           result.compAdaptability],
    ['Risk Appetite',          result.compRiskAppetite],
  ].filter(([,v]) => v != null) as [string, number][];

  const half = Math.ceil(composites.length / 2);
  const lcols = composites.slice(0, half);
  const rcols = composites.slice(half);
  const cStartY = y;
  for (const [i, [lbl, val]] of lcols.entries()) {
    const cy2 = cStartY + i * 17;
    const color = val >= 65 ? C.green : val >= 50 ? '#0284c7' : val >= 40 ? C.amber : C.red;
    fill(doc, C.mid);
    doc.font('Helvetica').fontSize(8.5).text(lbl, M, cy2, { width: CW/2 - 60 });
    fill(doc, color);
    doc.font('Helvetica-Bold').fontSize(8.5).text(String(Math.round(val)), M + CW/2 - 55, cy2, { width: 25, align:'right' });
  }
  for (const [i, [lbl, val]] of rcols.entries()) {
    const cy2 = cStartY + i * 17;
    const color = val >= 65 ? C.green : val >= 50 ? '#0284c7' : val >= 40 ? C.amber : C.red;
    fill(doc, C.mid);
    doc.font('Helvetica').fontSize(8.5).text(lbl, M + CW/2 + 10, cy2, { width: CW/2 - 60 });
    fill(doc, color);
    doc.font('Helvetica-Bold').fontSize(8.5).text(String(Math.round(val)), M + CW - 50, cy2, { width: 25, align:'right' });
  }
  y = cStartY + Math.max(lcols.length, rcols.length) * 17 + 16;

  // Interview probes
  doc.rect(M, y, 3, 14).fill(C.orange);
  fill(doc, C.dark);
  doc.font('Helvetica-Bold').fontSize(10).text('Suggested Interview Questions', M + 10, y + 1);
  fill(doc, C.mid);
  doc.font('Helvetica').fontSize(8).text("Based on this candidate's profile. Use behavioural (STAR) framing.", M + 10, y + 14);
  y += 28;

  const probes = generateInterviewProbes(
    result.tH ?? 50, result.tES ?? 50, result.tX ?? 50,
    result.tC ?? 50, result.tO ?? 50,
    (result.derailerFlags ?? []) as string[],
  );
  for (const [i, probe] of probes.entries()) {
    if (y > PH - 80) break; // prevent overflow
    roundedRect(doc, M, y, CW, 26, 4, i % 2 === 0 ? C.muted : C.white);
    fill(doc, C.orange);
    doc.font('Helvetica-Bold').fontSize(8).text(`Q${i+1}`, M + 8, y + 8);
    fill(doc, C.dark);
    doc.font('Helvetica').fontSize(8.5).text(probe, M + 26, y + 8, { width: CW - 34 });
    y += 32;
  }

  pageFooter(doc, PH, PW, M, 2);

  // ── Finalise ───────────────────────────────────────────────────────────────
  doc.end();
  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}
