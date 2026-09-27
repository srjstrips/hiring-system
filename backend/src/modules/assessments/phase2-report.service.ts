/**
 * Phase 2 Personality Assessment — PDF Report Generator
 * Used for SRJ Talent Acquisition and other custom trait assessments.
 * Reads from AssessmentTraitScore table.
 */

import PDFDocument from 'pdfkit';
import { prisma } from '@/config/database';

const C = {
  dark:   '#1e293b',
  mid:    '#475569',
  light:  '#94a3b8',
  muted:  '#f8f5f0',
  white:  '#ffffff',
  rule:   '#e2d9cf',
  footer: '#78716c',
  accent: '#1d4ed8',
};

const LEVEL_COLORS = ['#dc2626', '#f97316', '#d97706', '#16a34a', '#0891b2'];
const LEVEL_LABELS = ['Emerging', 'Developing', 'Moderate', 'Good', 'Strong'];

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function drawProgressBar(doc: InstanceType<typeof PDFDocument>, x: number, y: number, width: number, height: number, fraction: number, color: string) {
  const [bgR, bgG, bgB] = hexToRgb('#e2e8f0');
  doc.save();
  doc.roundedRect(x, y, width, height, height/2).fillColor([bgR,bgG,bgB] as unknown as string).fill();
  const fillW = Math.max(height, width * Math.min(1, Math.max(0, fraction)));
  const [fR, fG, fB] = hexToRgb(color);
  doc.roundedRect(x, y, fillW, height, height/2).fillColor([fR,fG,fB] as unknown as string).fill();
  doc.restore();
}

function drawHRule(doc: InstanceType<typeof PDFDocument>, x: number, y: number, width: number) {
  doc.save();
  doc.moveTo(x, y).lineTo(x+width, y).strokeColor(C.rule).lineWidth(0.5).stroke();
  doc.restore();
}

function drawFooter(doc: InstanceType<typeof PDFDocument>, pageNum: number, pageW: number, pageH: number, margin: number) {
  const y = pageH - 30;
  doc.save();
  doc.fontSize(7).fillColor(C.footer)
    .text('Confidential — prepared for SRJ HR', margin, y, { width: (pageW - margin*2)*0.6 })
    .text(`Page ${pageNum}`, margin, y, { width: pageW - margin*2, align: 'right' });
  doc.restore();
}

function traitLabel(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function levelColor(level: number): string {
  return LEVEL_COLORS[Math.min(4, Math.max(0, level - 1))] ?? C.accent;
}

function levelLabel(level: number): string {
  return LEVEL_LABELS[Math.min(4, Math.max(0, level - 1))] ?? 'Unknown';
}

function overallFitLabel(avgLevel: number): string {
  if (avgLevel >= 4.5) return 'Exceptional Fit';
  if (avgLevel >= 3.5) return 'Strong Fit';
  if (avgLevel >= 2.5) return 'Good Fit';
  if (avgLevel >= 1.5) return 'Developing Fit';
  return 'Needs Review';
}

function nextStep(fitBand: string): string {
  if (fitBand === 'Exceptional Fit') return 'Proceed directly to final-stage interview. This profile is rare — move quickly.';
  if (fitBand === 'Strong Fit')      return 'Schedule a competency-based interview. Strong recommendation to advance.';
  if (fitBand === 'Good Fit')        return 'Advance to interview with targeted questions on lower-scoring traits.';
  if (fitBand === 'Developing Fit')  return 'Consider with strong onboarding and mentoring. A 30/60/90-day coaching plan is recommended.';
  return 'Review with hiring manager before advancing.';
}

export async function generatePhase2ReportPdf(assessmentId: string, assignmentId: string): Promise<Buffer> {
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

  const traitRows = await prisma.assessmentTraitScore.findMany({
    where: { attemptId: attempt.id },
    orderBy: { traitName: 'asc' },
  });
  if (!traitRows.length) throw new Error('Trait scores not found. Scoring may not have completed yet.');

  const candidateName = `${assignment.candidate.firstName ?? ''} ${assignment.candidate.lastName ?? ''}`.trim() || 'Candidate';
  const jobTitle = assignment.job?.title ?? 'Role not specified';
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const avgLevel = traitRows.reduce((s, r) => s + r.level, 0) / traitRows.length;
  const fitBand = overallFitLabel(avgLevel);

  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `${assignment.assessment.name} — ${candidateName}` } });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  const pageW  = doc.page.width;
  const pageH  = doc.page.height;
  const margin = 48;
  const contentW = pageW - margin * 2;

  // ── PAGE 1 ──────────────────────────────────────────────────────────────────
  doc.rect(0, 0, pageW, pageH).fill(C.muted);
  doc.rect(0, 0, pageW, 56).fill(C.dark);
  doc.fontSize(15).fillColor(C.white).font('Helvetica-Bold')
    .text(assignment.assessment.name, margin, 20, { width: contentW * 0.6 });
  doc.fontSize(8).fillColor('#94a3b8')
    .text(candidateName, margin, 18, { width: contentW, align: 'right' });
  doc.fontSize(7.5).fillColor('#64748b')
    .text(`${jobTitle}  |  ${dateStr}`, margin, 30, { width: contentW, align: 'right' });

  let y = 72;

  // Overall fit band
  doc.rect(margin, y, contentW, 50).fill(C.dark);
  doc.fontSize(9).fillColor('#94a3b8').font('Helvetica')
    .text('OVERALL FIT', margin + 16, y + 10, { width: contentW - 32 });
  doc.fontSize(15).fillColor(C.white).font('Helvetica-Bold')
    .text(fitBand, margin + 16, y + 22, { width: contentW - 120 });
  const badgeX = pageW - margin - 100;
  doc.rect(badgeX, y + 10, 100, 26).fill('#334155');
  doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
    .text('AVG LEVEL', badgeX, y + 13, { width: 100, align: 'center' });
  doc.fontSize(9).fillColor(C.white).font('Helvetica-Bold')
    .text(`${avgLevel.toFixed(1)} / 5`, badgeX, y + 22, { width: 100, align: 'center' });

  y += 64;
  doc.fontSize(10).fillColor(C.dark).font('Helvetica-Bold').text('TRAIT BREAKDOWN', margin, y);
  y += 18;

  for (const tr of traitRows) {
    const color = levelColor(tr.level);
    const fraction = (tr.averageScore - 1) / 4;

    doc.fontSize(10).fillColor(C.dark).font('Helvetica-Bold').text(traitLabel(tr.traitName), margin, y);
    doc.fontSize(8.5).fillColor(color).font('Helvetica-Bold')
      .text(`${tr.averageScore.toFixed(1)}/5 — ${levelLabel(tr.level)}`, margin, y, { width: contentW, align: 'right' });
    y += 14;

    drawProgressBar(doc, margin, y, contentW, 8, fraction, color);
    y += 14;

    doc.fontSize(8).fillColor(C.mid).font('Helvetica')
      .text(`Based on ${tr.questionCount} question${tr.questionCount !== 1 ? 's' : ''}`, margin, y);
    y = doc.y + 12;

    drawHRule(doc, margin, y, contentW);
    y += 10;

    if (y > pageH - 80) {
      drawFooter(doc, 1, pageW, pageH, margin);
      doc.addPage();
      doc.rect(0, 0, pageW, pageH).fill(C.muted);
      y = 40;
    }
  }

  drawFooter(doc, 1, pageW, pageH, margin);

  // ── PAGE 2 ──────────────────────────────────────────────────────────────────
  doc.addPage();
  doc.rect(0, 0, pageW, pageH).fill(C.muted);
  doc.rect(0, 0, pageW, 42).fill(C.dark);
  doc.fontSize(12).fillColor(C.white).font('Helvetica-Bold')
    .text('HR Guidance & Next Steps', margin, 14, { width: contentW });

  y = 58;
  doc.fontSize(9).fillColor(C.mid).font('Helvetica')
    .text(`Candidate: ${candidateName}  |  Role: ${jobTitle}  |  Assessment: ${assignment.assessment.name}`, margin, y, { width: contentW });
  y += 20;
  drawHRule(doc, margin, y, contentW);
  y += 16;

  doc.fontSize(10).fillColor(C.dark).font('Helvetica-Bold').text('Trait Scores Summary', margin, y);
  y += 16;

  for (const tr of traitRows) {
    const color = levelColor(tr.level);
    const [dotR, dotG, dotB] = hexToRgb(color);
    doc.save();
    doc.circle(margin + 5, y + 5, 4).fill([dotR,dotG,dotB] as unknown as string);
    doc.restore();
    doc.fontSize(9).fillColor(C.dark).font('Helvetica-Bold')
      .text(`${traitLabel(tr.traitName)}  —  ${levelLabel(tr.level)} (${tr.averageScore.toFixed(1)}/5)`, margin + 14, y, { width: contentW - 14 });
    y = doc.y + 8;
  }

  y += 8;
  drawHRule(doc, margin, y, contentW);
  y += 16;

  doc.fontSize(10).fillColor(C.dark).font('Helvetica-Bold').text('Suggested Next Step', margin, y);
  y += 14;
  doc.rect(margin, y, contentW, 38).fill('#fefce8');
  doc.fontSize(9).fillColor('#78350f').font('Helvetica')
    .text(nextStep(fitBand), margin + 10, y + 8, { width: contentW - 20, lineGap: 3 });
  y += 52;

  drawHRule(doc, margin, y, contentW);
  y += 14;
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
