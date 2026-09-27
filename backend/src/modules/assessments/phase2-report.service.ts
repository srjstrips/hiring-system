/**
 * Phase 2 Personality Assessment — PDF Report Generator
 * SRJ Talent Acquisition and other custom trait assessments.
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
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

function drawProgressBar(
  doc: InstanceType<typeof PDFDocument>,
  x: number, y: number, width: number, height: number,
  fraction: number, color: string
) {
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

function drawFooter(
  doc: InstanceType<typeof PDFDocument>,
  pageNum: number, pageW: number, pageH: number, margin: number
) {
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

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
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

  // Full attempt with Q+A for question breakdown
  const fullAttempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attempt.id },
    include: {
      answers: true,
      questionSnapshots: {
        include: { options: { orderBy: { displayOrder: 'asc' } } },
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  let traitRows = await prisma.assessmentTraitScore.findMany({
    where: { attemptId: attempt.id },
    orderBy: { traitName: 'asc' },
  });

  if (!traitRows.length && fullAttempt) {
    const traitMap = new Map<string, { total: number; count: number }>();
    for (const q of fullAttempt.questionSnapshots) {
      const traitKey = (q.trait as string | null) ?? 'OVERALL';
      const answer = fullAttempt.answers.find((a) => a.attemptQuestionId === q.id);
      if (!answer?.selectedOptionId) continue;
      const optionIndex = q.options.findIndex((o) => o.id === answer.selectedOptionId);
      if (optionIndex === -1) continue;
      const entry = traitMap.get(traitKey) ?? { total: 0, count: 0 };
      entry.total += optionIndex + 1;
      entry.count += 1;
      traitMap.set(traitKey, entry);
    }
    traitRows = [...traitMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([traitName, { total, count }]) => {
      const avg = count > 0 ? total / count : 0;
      const level = avg <= 1.5 ? 1 : avg <= 2.5 ? 2 : avg <= 3.5 ? 3 : avg <= 4.5 ? 4 : 5;
      return { traitName, averageScore: Math.round(avg * 100) / 100, level, questionCount: count } as typeof traitRows[0];
    });
  }

  if (!traitRows.length) throw new Error('No answered questions found for this attempt.');

  const candidateName = `${assignment.candidate.firstName ?? ''} ${assignment.candidate.lastName ?? ''}`.trim() || 'Candidate';
  const candidateEmail = assignment.candidate.email ?? '';
  const jobTitle = assignment.job?.title ?? 'Role not specified';
  const assessmentName = assignment.assessment.name;
  const submittedAt = attempt.submittedAt ?? new Date();
  const startedAt = attempt.startedAt ?? submittedAt;
  const timeTakenMs = submittedAt.getTime() - startedAt.getTime();
  const avgLevel = traitRows.reduce((s, r) => s + r.level, 0) / traitRows.length;
  const fitBand = overallFitLabel(avgLevel);

  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `${assessmentName} — ${candidateName}` } });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  const pageW  = doc.page.width;
  const pageH  = doc.page.height;
  const margin = 48;
  const contentW = pageW - margin * 2;

  // ── LOGO path ──────────────────────────────────────────────────────────────
  const logoPath = path.join(__dirname, '../assets/srj-logo.png');
  const hasLogo = fs.existsSync(logoPath);

  // ── PAGE 1: Header ─────────────────────────────────────────────────────────
  doc.rect(0, 0, pageW, pageH).fill(C.muted);

  // Dark header banner
  const headerH = hasLogo ? 72 : 60;
  doc.rect(0, 0, pageW, headerH).fill(C.dark);

  if (hasLogo) {
    // Logo on left (max 120×40 within the header)
    const logoMaxW = 120;
    const logoMaxH = 40;
    doc.image(logoPath, margin, (headerH - logoMaxH) / 2, { fit: [logoMaxW, logoMaxH] });
    // Assessment name to the right of logo
    doc.fontSize(13).fillColor(C.white).font('Helvetica-Bold')
      .text(assessmentName, margin + logoMaxW + 12, 16, { width: contentW - logoMaxW - 12 });
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
      .text('Personality Assessment Report', margin + logoMaxW + 12, 32, { width: contentW - logoMaxW - 12 });
  } else {
    doc.fontSize(9).fillColor('#94a3b8').font('Helvetica')
      .text('SRJ GROUP', margin, 14, { width: contentW });
    doc.fontSize(14).fillColor(C.white).font('Helvetica-Bold')
      .text(assessmentName, margin, 26, { width: contentW });
  }

  let y = headerH + 14;

  // ── Candidate info block ───────────────────────────────────────────────────
  doc.rect(margin, y, contentW, 58).fill(C.white);
  doc.save();
  doc.rect(margin, y, 4, 58).fill(C.accent);
  doc.restore();

  const infoX = margin + 14;
  doc.fontSize(11).fillColor(C.dark).font('Helvetica-Bold')
    .text(candidateName, infoX, y + 8, { width: contentW - 14 });
  doc.fontSize(8.5).fillColor(C.mid).font('Helvetica')
    .text(candidateEmail, infoX, y + 22, { width: contentW/2 - 14 });
  doc.fontSize(8.5).fillColor(C.mid).font('Helvetica')
    .text(`Role: ${jobTitle}`, infoX, y + 33, { width: contentW/2 - 14 });

  // Right side: submitted + time taken
  const rightX = margin + contentW/2;
  doc.fontSize(8).fillColor(C.light).font('Helvetica')
    .text('SUBMITTED', rightX, y + 8, { width: contentW/2 });
  doc.fontSize(8.5).fillColor(C.dark).font('Helvetica-Bold')
    .text(formatDateTime(submittedAt), rightX, y + 18, { width: contentW/2 });
  doc.fontSize(8).fillColor(C.light).font('Helvetica')
    .text('TIME TAKEN', rightX, y + 33, { width: contentW/2 });
  doc.fontSize(8.5).fillColor(C.dark).font('Helvetica-Bold')
    .text(formatDuration(timeTakenMs), rightX, y + 43, { width: contentW/2 });

  y += 68;

  // ── Overall fit band ───────────────────────────────────────────────────────
  const fitColor = (() => {
    if (fitBand === 'Exceptional Fit') return '#0891b2';
    if (fitBand === 'Strong Fit')      return '#16a34a';
    if (fitBand === 'Good Fit')        return '#d97706';
    if (fitBand === 'Developing Fit')  return '#f97316';
    return '#dc2626';
  })();

  doc.rect(margin, y, contentW, 46).fill(C.dark);
  const [fr, fg, fb] = hexToRgb(fitColor);
  doc.save();
  doc.rect(margin, y, 5, 46).fill([fr,fg,fb] as unknown as string);
  doc.restore();
  doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
    .text('OVERALL FIT', margin + 14, y + 8, { width: contentW/2 });
  doc.fontSize(16).fillColor(fitColor).font('Helvetica-Bold')
    .text(fitBand, margin + 14, y + 18, { width: contentW - 120 });
  const badgeX = margin + contentW - 90;
  doc.rect(badgeX, y + 10, 88, 26).fill('#334155');
  doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
    .text('AVG LEVEL', badgeX, y + 13, { width: 88, align: 'center' });
  doc.fontSize(10).fillColor(C.white).font('Helvetica-Bold')
    .text(`${avgLevel.toFixed(1)} / 5`, badgeX, y + 22, { width: 88, align: 'center' });

  y += 58;
  doc.fontSize(10).fillColor(C.dark).font('Helvetica-Bold').text('TRAIT BREAKDOWN', margin, y);
  y += 16;
  drawHRule(doc, margin, y, contentW);
  y += 10;

  let page1FooterDrawn = false;

  for (const tr of traitRows) {
    const color = levelColor(tr.level);
    const fraction = (tr.averageScore - 1) / 4;
    const rowH = 52;

    if (y + rowH > pageH - 50) {
      if (!page1FooterDrawn) { drawFooter(doc, 1, pageW, pageH, margin); page1FooterDrawn = true; }
      doc.addPage();
      doc.rect(0, 0, pageW, pageH).fill(C.muted);
      y = 40;
    }

    doc.fontSize(10).fillColor(C.dark).font('Helvetica-Bold').text(traitLabel(tr.traitName), margin, y);
    doc.fontSize(8.5).fillColor(color).font('Helvetica-Bold')
      .text(`${tr.averageScore.toFixed(1)} / 5 — ${levelLabel(tr.level)}`, margin, y, { width: contentW, align: 'right' });
    y += 14;

    drawProgressBar(doc, margin, y, contentW, 8, fraction, color);
    y += 12;

    doc.fontSize(7.5).fillColor(C.mid).font('Helvetica')
      .text(`Based on ${tr.questionCount} question${tr.questionCount !== 1 ? 's' : ''}`, margin, y);
    y += 14;

    drawHRule(doc, margin, y, contentW);
    y += 10;
  }

  if (!page1FooterDrawn) drawFooter(doc, 1, pageW, pageH, margin);

  // ── QUESTION BREAKDOWN pages ───────────────────────────────────────────────
  if (fullAttempt && fullAttempt.questionSnapshots.length > 0) {
    doc.addPage();
    doc.rect(0, 0, pageW, pageH).fill(C.muted);

    // Section header
    doc.rect(0, 0, pageW, 42).fill(C.dark);
    doc.fontSize(13).fillColor(C.white).font('Helvetica-Bold')
      .text('Question-by-Question Breakdown', margin, 14, { width: contentW });

    y = 56;
    doc.fontSize(8.5).fillColor(C.mid).font('Helvetica')
      .text(`${candidateName}  ·  ${assessmentName}  ·  ${formatDateTime(submittedAt)}`, margin, y, { width: contentW });
    y += 18;
    drawHRule(doc, margin, y, contentW);
    y += 12;

    let qPage = 2;
    let qIdx = 0;

    for (const q of fullAttempt.questionSnapshots) {
      qIdx++;
      const answer = fullAttempt.answers.find((a) => a.attemptQuestionId === q.id);
      const selectedOptionId = answer?.selectedOptionId ?? null;
      const selectedOption = selectedOptionId
        ? q.options.find((o) => o.id === selectedOptionId)
        : null;
      const selectedText = selectedOption?.optionText ?? null;
      const isAnswered = selectedText !== null;
      const qTrait = (q.trait as string | null) ?? null;

      // Estimate height needed
      const qTextLines = Math.ceil((q.questionText?.length ?? 0) / 85) + 1;
      const optionLines = q.options.length;
      const estimatedH = 14 + qTextLines * 12 + optionLines * 14 + 16;

      if (y + estimatedH > pageH - 50) {
        drawFooter(doc, qPage, pageW, pageH, margin);
        doc.addPage();
        doc.rect(0, 0, pageW, pageH).fill(C.muted);
        qPage++;
        y = 36;
      }

      // Question number + trait badge
      const badgeColor = isAnswered ? C.dark : '#94a3b8';
      doc.fontSize(9).fillColor(badgeColor).font('Helvetica-Bold')
        .text(`Q${qIdx}.`, margin, y, { continued: false });

      if (qTrait) {
        doc.fontSize(7.5).fillColor(C.light).font('Helvetica')
          .text(traitLabel(qTrait), margin + 22, y + 1, { width: contentW - 22 });
      }

      // Status badge on right
      const statusText = isAnswered ? 'Answered' : 'Not Answered';
      const statusColor = isAnswered ? '#16a34a' : '#dc2626';
      doc.fontSize(7.5).fillColor(statusColor).font('Helvetica-Bold')
        .text(statusText, margin, y, { width: contentW, align: 'right' });

      y += 13;

      // Question text
      doc.fontSize(9).fillColor(C.dark).font('Helvetica')
        .text(q.questionText ?? '', margin + 10, y, { width: contentW - 10, lineGap: 1.5 });
      y = doc.y + 6;

      // Options
      for (const opt of q.options) {
        const isSelected = opt.id === selectedOptionId;
        const optBg = isSelected ? (isAnswered ? '#f0fdf4' : '#fef2f2') : null;

        if (optBg) {
          const [oR, oG, oB] = hexToRgb(isAnswered ? '#bbf7d0' : '#fecaca');
          doc.save();
          doc.rect(margin + 10, y - 1, contentW - 10, 13)
            .fillColor([oR,oG,oB] as unknown as string).fill();
          doc.restore();
        }

        const bullet = isSelected ? '▶' : '○';
        const optColor = isSelected ? (isAnswered ? '#15803d' : '#dc2626') : C.light;
        doc.fontSize(8.5).fillColor(optColor).font(isSelected ? 'Helvetica-Bold' : 'Helvetica')
          .text(`${bullet}  ${opt.optionText ?? ''}`, margin + 14, y, { width: contentW - 14, lineGap: 1 });
        y = doc.y + 2;
      }

      y += 8;
      drawHRule(doc, margin, y, contentW);
      y += 8;
    }

    drawFooter(doc, qPage, pageW, pageH, margin);
  }

  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}
