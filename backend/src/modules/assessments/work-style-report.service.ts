/**
 * SRJ Work Style Check — PDF Report Generator
 * Produces a clean 2-page report:
 *   Page 1 — Candidate profile with trait breakdown
 *   Page 2 — HR guidance and next steps
 */

import PDFDocument from 'pdfkit';
import { prisma } from '@/config/database';
import { getWorkStyleResult, traitLevel } from './work-style-scoring.service';

// ─── Colour palette ────────────────────────────────────────────────────────────
const C = {
  dark:       '#1e293b',
  mid:        '#475569',
  light:      '#94a3b8',
  muted:      '#f8f5f0',
  white:      '#ffffff',
  gold:       '#b45309',   // Leadership
  teal:       '#0891b2',   // Learning Agility
  maroon:     '#9f1239',   // Team Player
  blue:       '#1d4ed8',   // Problem Solving
  rule:       '#e2d9cf',
  footer:     '#78716c',
  accent:     '#78350f',
};

const TRAIT_COLORS: Record<string, string> = {
  LEADERSHIP:            C.gold,
  LEARNING_ADAPTABILITY: C.teal,
  TEAMWORK:              C.maroon,
  PROBLEM_SOLVING:       C.blue,
};

// ─── Candidate-facing descriptions per trait + level ────────────────────────

const CANDIDATE_DESC: Record<string, Record<number, string>> = {
  LEADERSHIP: {
    1: 'You are building foundational leadership awareness. Seek opportunities to contribute ideas and take small ownership of tasks.',
    2: 'You show moments of leadership, especially in familiar situations. Consistent, small steps will build confidence over time.',
    3: 'You guide others effectively in most situations and step up when needed. Continuing to seek stretch assignments will accelerate growth.',
    4: 'You lead with confidence, make decisions under pressure, and bring others along. People trust your judgment.',
    5: 'You demonstrate exceptional leadership — directing teams, making bold calls, and inspiring those around you consistently.',
  },
  LEARNING_ADAPTABILITY: {
    1: 'Change feels challenging right now. Focus on small wins with new tools or methods to build adaptability muscle.',
    2: 'You are beginning to embrace learning, though discomfort with change is still present. Curiosity is your best growth tool.',
    3: 'You adapt reasonably well and seek clarity when uncertain. Continue pushing into unfamiliar territory deliberately.',
    4: 'You thrive when learning is required. You ask smart questions, recover from mistakes quickly, and adjust fast.',
    5: 'You are an exceptional learner — you actively seek challenge, pivot rapidly, and turn new skills into strengths.',
  },
  TEAMWORK: {
    1: 'Working in teams is still an area of development. Practising patience and active listening will build stronger peer relationships.',
    2: 'You contribute in team settings but may prefer working independently. Deeper engagement with teammates will unlock more from you.',
    3: 'You collaborate well, support teammates, and manage conflict constructively. You are a valued team member.',
    4: 'You are a strong team player — reliable, generous with credit, and steady during disagreements. Peers appreciate your presence.',
    5: 'You are an anchor for any team — deeply collaborative, patient, and consistently focused on collective success.',
  },
  PROBLEM_SOLVING: {
    1: 'Problem-solving is an area to develop. Start by practising structured thinking: define, explore options, then act.',
    2: 'You address problems but may default to the first solution. Slowing down to consider alternatives will improve outcomes.',
    3: 'You approach problems methodically and look for improvements. You are a reliable contributor when things go wrong.',
    4: 'You are a strong problem-solver — you scan for options before acting, look for systemic fixes, and stay proactive.',
    5: 'You are an exceptional problem-solver who is often the first to spot issues and the last to give up on finding a solution.',
  },
};

const HR_GUIDANCE: Record<string, Record<number, string>> = {
  LEADERSHIP: {
    1: 'Place in roles with clear supervision. Provide regular coaching conversations. Avoid roles requiring autonomous decision-making at this stage.',
    2: 'Assign a mentor. Create low-risk leadership opportunities (project co-lead, team rep). Review progress at 60 days.',
    3: 'Suitable for team lead or senior individual-contributor roles. Will benefit from stretch assignments in the next 6 months.',
    4: 'Strong fit for management or senior roles requiring direct leadership. Likely to excel with autonomy and accountability.',
    5: 'Immediately deployable in leadership-critical roles. High potential for senior or people-management tracks.',
  },
  LEARNING_ADAPTABILITY: {
    1: 'Needs structured onboarding with clear expectations. High-change environments are not recommended at this stage.',
    2: 'Moderate pace of change is manageable. Provide training with ample support; avoid rapid-change projects initially.',
    3: 'Can handle standard change pace well. Good fit for roles where systems and processes evolve moderately.',
    4: 'Adapts quickly — suitable for dynamic teams, cross-functional projects, or roles undergoing transformation.',
    5: 'Best deployed in high-change or innovation-facing roles. Will drive adoption of new tools and approaches.',
  },
  TEAMWORK: {
    1: 'Consider individual-contributor roles first. Introduce team exposure gradually with structured check-ins.',
    2: 'Can function in teams with clear structure. Pair with a high-collaborator buddy to model team behaviours.',
    3: 'Reliable team contributor. Suitable for most collaborative environments with standard team sizes.',
    4: 'Strong team fit. Will add positive energy to existing teams and help maintain morale during difficult periods.',
    5: 'Anchor-quality team player. Place in teams that need cohesion, conflict resolution, or cross-functional coordination.',
  },
  PROBLEM_SOLVING: {
    1: 'Provide very structured role definitions. Avoid roles that require frequent independent troubleshooting.',
    2: 'Role should have clear escalation paths. Pair with experienced problem-solvers during the first few months.',
    3: 'Handles routine challenges independently. Suitable for operational roles with moderate problem frequency.',
    4: 'Can own problem-resolution in their domain. Good fit for QA, operations, or continuous improvement roles.',
    5: 'Deploy in roles where initiative and innovation matter. Likely to identify inefficiencies the team has missed.',
  },
};

// ─── Suggested next step ────────────────────────────────────────────────────────

function suggestedNextStep(fitBand: string): string {
  if (fitBand === 'Exceptional Fit') return 'Proceed directly to final-stage interview and reference checks. This profile is rare — move quickly.';
  if (fitBand === 'Strong Fit')      return 'Schedule a competency-based interview focusing on leadership and team scenarios. Strong recommendation to advance.';
  if (fitBand === 'Good Fit')        return 'Advance to interview with targeted questions on the lower-scoring traits. Suitable for most open roles.';
  if (fitBand === 'Developing Fit')  return 'Consider for roles with strong onboarding structure and mentoring. A 30/60/90-day coaching plan is recommended.';
  return 'Review with hiring manager before advancing. Consider whether the role demands match the current profile.';
}

// ─── pdfkit helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function drawProgressBar(
  doc: InstanceType<typeof PDFDocument>,
  x: number, y: number,
  width: number, height: number,
  fillFraction: number,
  color: string,
  bgColor = '#e2e8f0'
) {
  const [bgR, bgG, bgB] = hexToRgb(bgColor);
  doc.save();
  doc.roundedRect(x, y, width, height, height / 2).fillColor([bgR, bgG, bgB] as unknown as string).fill();
  const fillW = Math.max(height, width * fillFraction);
  const [fR, fG, fB] = hexToRgb(color);
  doc.roundedRect(x, y, fillW, height, height / 2).fillColor([fR, fG, fB] as unknown as string).fill();
  doc.restore();
}

function drawHRule(doc: InstanceType<typeof PDFDocument>, x: number, y: number, width: number) {
  doc.save();
  doc.moveTo(x, y).lineTo(x + width, y).strokeColor(C.rule).lineWidth(0.5).stroke();
  doc.restore();
}

function drawFooter(doc: InstanceType<typeof PDFDocument>, pageNum: number, pageW: number, pageH: number, margin: number) {
  const y = pageH - 30;
  doc.save();
  doc.fontSize(7).fillColor(C.footer)
    .text('Confidential — prepared for SRJ HR', margin, y, { width: (pageW - margin * 2) * 0.6 })
    .text(`Page ${pageNum}`, margin, y, { width: pageW - margin * 2, align: 'right' });
  doc.restore();
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function generateWorkStyleReportPdf(
  assessmentId: string,
  assignmentId: string,
): Promise<Buffer> {
  // ── Fetch data ──────────────────────────────────────────────────────────────
  const assignment = await prisma.assessmentAssignment.findFirst({
    where: { id: assignmentId, assessmentId },
    include: {
      assessment: { select: { name: true } },
      candidate: { select: { firstName: true, lastName: true, email: true } },
      job: { select: { title: true } },
    },
  });
  if (!assignment) throw new Error('Assignment not found');

  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { assignmentId, submittedAt: { not: null } },
    orderBy: { attemptNumber: 'desc' },
  });
  if (!attempt) throw new Error('No completed attempt found');

  const wsResult = await getWorkStyleResult(attempt.id);
  if (!wsResult) throw new Error('Work style result not found. Scoring may not have completed yet.');

  const candidateName = `${assignment.candidate.firstName ?? ''} ${assignment.candidate.lastName ?? ''}`.trim() || 'Candidate';
  const jobTitle = assignment.job?.title ?? 'Role not specified';
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // ── Build PDF ───────────────────────────────────────────────────────────────
  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `SRJ Fit Report — ${candidateName}` } });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  const pageW  = doc.page.width;
  const pageH  = doc.page.height;
  const margin = 48;
  const contentW = pageW - margin * 2;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ═══════════════════════════════════════════════════════════════════════════

  // Cream background
  doc.rect(0, 0, pageW, pageH).fill(C.muted);

  // Header bar
  doc.rect(0, 0, pageW, 56).fill(C.dark);
  doc.fontSize(15).fillColor(C.white)
    .font('Helvetica-Bold')
    .text('SRJ Workplace Fit Report', margin, 20, { width: contentW * 0.6 });

  // Candidate info block (right aligned in header)
  doc.fontSize(8).fillColor('#94a3b8')
    .text(candidateName, margin, 18, { width: contentW, align: 'right' });
  doc.fontSize(7.5).fillColor('#64748b')
    .text(`${jobTitle}  |  ${dateStr}`, margin, 30, { width: contentW, align: 'right' });

  let y = 72;

  // Archetype block
  doc.rect(margin, y, contentW, 56).fill(C.dark);
  doc.fontSize(9).fillColor('#94a3b8').font('Helvetica')
    .text('OVERALL PROFILE', margin + 16, y + 10, { width: contentW - 32 });
  doc.fontSize(16).fillColor(C.white).font('Helvetica-Bold')
    .text(wsResult.archetype, margin + 16, y + 22, { width: contentW - 120 });

  // Fit band badge
  const badgeX = pageW - margin - 100;
  doc.rect(badgeX, y + 12, 100, 28).fill('#334155');
  doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
    .text('FIT BAND', badgeX, y + 15, { width: 100, align: 'center' });
  doc.fontSize(9).fillColor(C.white).font('Helvetica-Bold')
    .text(wsResult.fitBand, badgeX, y + 24, { width: 100, align: 'center' });

  y += 68;

  // Profile summary
  doc.fontSize(9.5).fillColor(C.mid).font('Helvetica')
    .text(wsResult.profileSummary, margin, y, { width: contentW, lineGap: 3 });

  y = doc.y + 18;
  drawHRule(doc, margin, y, contentW);
  y += 14;

  // Section heading
  doc.fontSize(10).fillColor(C.dark).font('Helvetica-Bold')
    .text('TRAIT BREAKDOWN', margin, y);
  y += 18;

  // Trait cards
  for (const tr of wsResult.traits) {
    const barColor = TRAIT_COLORS[tr.trait] ?? C.blue;
    const fraction = (tr.rawAvg - 1) / 4; // 1-5 mapped to 0-1
    const levelInfo = traitLevel(tr.rawAvg);
    const candDesc  = (CANDIDATE_DESC[tr.trait]?.[levelInfo.level]) ?? '';

    // Trait row header
    doc.fontSize(10).fillColor(C.dark).font('Helvetica-Bold')
      .text(tr.label, margin, y);

    const levelLabel = `Level ${levelInfo.level} of 5 — ${levelInfo.label}`;
    doc.fontSize(8.5).fillColor(barColor).font('Helvetica-Bold')
      .text(levelLabel, margin, y, { width: contentW, align: 'right' });

    y += 14;

    // Progress bar
    drawProgressBar(doc, margin, y, contentW, 8, fraction, barColor);
    y += 14;

    // Candidate description
    doc.fontSize(8.5).fillColor(C.mid).font('Helvetica')
      .text(candDesc, margin, y, { width: contentW, lineGap: 2 });
    y = doc.y + 4;

    // HR guidance
    const hrText = HR_GUIDANCE[tr.trait]?.[levelInfo.level] ?? '';
    doc.fontSize(8).fillColor(C.dark).font('Helvetica-Bold').text('HR guidance:  ', margin, y, { continued: true });
    doc.fontSize(8).fillColor(C.mid).font('Helvetica').text(hrText, { width: contentW - 10, lineGap: 2 });
    y = doc.y + 12;

    drawHRule(doc, margin, y, contentW);
    y += 10;
  }

  drawFooter(doc, 1, pageW, pageH, margin);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  doc.rect(0, 0, pageW, pageH).fill(C.muted);

  // Header bar
  doc.rect(0, 0, pageW, 42).fill(C.dark);
  doc.fontSize(12).fillColor(C.white).font('Helvetica-Bold')
    .text('Team Fit Guidance for SRJ HR', margin, 14, { width: contentW });

  y = 58;

  // Candidate summary
  doc.fontSize(9).fillColor(C.mid).font('Helvetica')
    .text(`Candidate: ${candidateName}  |  Role: ${jobTitle}  |  Assessment: ${assignment.assessment.name}`, margin, y, { width: contentW });
  y += 20;

  drawHRule(doc, margin, y, contentW);
  y += 16;

  // Per-trait HR bullet points
  doc.fontSize(10).fillColor(C.dark).font('Helvetica-Bold')
    .text('Trait-by-Trait HR Guidance', margin, y);
  y += 16;

  for (const tr of wsResult.traits) {
    const barColor = TRAIT_COLORS[tr.trait] ?? C.blue;
    const levelInfo = traitLevel(tr.rawAvg);
    const hrText    = HR_GUIDANCE[tr.trait]?.[levelInfo.level] ?? '';

    // Small colour dot
    const [dotR, dotG, dotB] = hexToRgb(barColor);
    doc.save();
    doc.circle(margin + 5, y + 5, 4).fill([dotR, dotG, dotB] as unknown as string);
    doc.restore();

    doc.fontSize(9).fillColor(C.dark).font('Helvetica-Bold')
      .text(`${tr.label}  (Level ${levelInfo.level} — ${levelInfo.label})`, margin + 14, y, { width: contentW - 14 });
    y = doc.y + 2;

    doc.fontSize(8.5).fillColor(C.mid).font('Helvetica')
      .text(hrText, margin + 14, y, { width: contentW - 14, lineGap: 2 });
    y = doc.y + 10;
  }

  y += 4;
  drawHRule(doc, margin, y, contentW);
  y += 16;

  // Suggested next step
  doc.fontSize(10).fillColor(C.dark).font('Helvetica-Bold')
    .text('Suggested Next Step', margin, y);
  y += 14;

  doc.rect(margin, y, contentW, 38).fill('#fefce8');
  const nextStep = suggestedNextStep(wsResult.fitBand);
  doc.fontSize(9).fillColor('#78350f').font('Helvetica')
    .text(nextStep, margin + 10, y + 8, { width: contentW - 20, lineGap: 3 });
  y += 50;

  drawHRule(doc, margin, y, contentW);
  y += 14;

  // Disclaimer
  doc.fontSize(7.5).fillColor(C.light).font('Helvetica')
    .text(
      'Disclaimer: This report is generated by an automated personality assessment tool and is intended for informational purposes only. ' +
      'It should be used as one input among many in the hiring decision and does not constitute a definitive evaluation of the candidate. ' +
      'SRJ HR is responsible for all final hiring decisions. Do not share this document outside the hiring team.',
      margin, y, { width: contentW, lineGap: 2 }
    );

  drawFooter(doc, 2, pageW, pageH, margin);

  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}
