/**
 * Phase 2 Personality Assessment — Result Email Service
 * Sends candidate result email with HTML trait breakdown + PDF attachment.
 * Used for SRJ Talent Acquisition and other custom trait assessments.
 */

import { prisma } from '@/config/database';
import { emailService } from '@/services/email.service';
import { generatePhase2ReportPdf } from './phase2-report.service';

const LEVEL_COLORS = ['#dc2626', '#f97316', '#d97706', '#16a34a', '#0891b2'];
const LEVEL_LABELS = ['Emerging', 'Developing', 'Moderate', 'Good', 'Strong'];

function levelColor(level: number): string {
  return LEVEL_COLORS[Math.min(4, Math.max(0, level - 1))] ?? '#475569';
}

function levelLabel(level: number): string {
  return LEVEL_LABELS[Math.min(4, Math.max(0, level - 1))] ?? 'Moderate';
}

function traitDisplayName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function overallFitLabel(avgLevel: number): string {
  if (avgLevel >= 4.5) return 'Exceptional Fit';
  if (avgLevel >= 3.5) return 'Strong Fit';
  if (avgLevel >= 2.5) return 'Good Fit';
  if (avgLevel >= 1.5) return 'Developing Fit';
  return 'Needs Review';
}

function fitBandColor(fitBand: string): string {
  if (fitBand === 'Exceptional Fit') return '#0891b2';
  if (fitBand === 'Strong Fit')      return '#16a34a';
  if (fitBand === 'Good Fit')        return '#d97706';
  if (fitBand === 'Developing Fit')  return '#f97316';
  return '#dc2626';
}

export async function sendPhase2ResultEmail(attemptId: string): Promise<void> {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      assessment: { select: { id: true, name: true } },
      candidate:  { select: { firstName: true, lastName: true, email: true } },
      assignment: { select: { id: true } },
    },
  });

  if (!attempt?.candidate?.email) return;

  const traitRows = await prisma.assessmentTraitScore.findMany({
    where: { attemptId },
    orderBy: { traitName: 'asc' },
  });
  if (!traitRows.length) return;

  const firstName = attempt.candidate.firstName ?? '';
  const lastName  = attempt.candidate.lastName  ?? '';
  const name      = `${firstName} ${lastName}`.trim() || 'Candidate';
  const email     = attempt.candidate.email;
  const avgLevel  = traitRows.reduce((s, r) => s + r.level, 0) / traitRows.length;
  const fitBand   = overallFitLabel(avgLevel);
  const fitColor  = fitBandColor(fitBand);

  // ── Generate PDF ──────────────────────────────────────────────────────────
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generatePhase2ReportPdf(attempt.assessmentId, attempt.assignment?.id ?? '');
  } catch (err) {
    console.error('[Phase2Email] PDF generation failed, sending without attachment', err);
  }

  // ── Trait rows HTML ───────────────────────────────────────────────────────
  const traitRowsHtml = traitRows.map((tr) => {
    const color  = levelColor(tr.level);
    const barPct = Math.round(((tr.averageScore - 1) / 4) * 100);
    const lvl    = levelLabel(tr.level);
    return `
      <div style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
          <span style="font-weight:700;font-size:15px;color:#1e293b;">${traitDisplayName(tr.traitName)}</span>
          <span style="font-size:13px;color:${color};font-weight:600;">${tr.averageScore.toFixed(1)}/5 — ${lvl}</span>
        </div>
        <div style="background:#e2e8f0;border-radius:4px;height:8px;margin-bottom:6px;">
          <div style="background:${color};width:${barPct}%;height:8px;border-radius:4px;min-width:6px;"></div>
        </div>
        <p style="margin:0;font-size:12px;color:#94a3b8;">Based on ${tr.questionCount} question${tr.questionCount !== 1 ? 's' : ''}</p>
      </div>
    `;
  }).join('');

  // ── Top strengths ─────────────────────────────────────────────────────────
  const sorted = [...traitRows].sort((a, b) => b.averageScore - a.averageScore);
  const top3   = sorted.slice(0, 3).map((r) => traitDisplayName(r.traitName));
  const top3Html = top3.map((t) =>
    `<span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:600;margin:0 6px 6px 0;">✓ ${t}</span>`
  ).join('');

  // ── Full email HTML ───────────────────────────────────────────────────────
  const html = `
    <div style="font-family:Georgia,serif;max-width:620px;margin:0 auto;background:#faf8f5;border:1px solid #e2d9cf;border-radius:8px;overflow:hidden;">

      <!-- Header -->
      <div style="background:#1e293b;padding:28px 32px;">
        <p style="margin:0;font-size:11px;letter-spacing:0.1em;color:#94a3b8;text-transform:uppercase;">SRJ Talent Acquisition</p>
        <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Your Personality Assessment Results</h1>
      </div>

      <!-- Body -->
      <div style="padding:32px;">

        <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
          Hi <strong style="color:#1e293b;">${name}</strong>, thank you for completing the
          <strong>${attempt.assessment.name}</strong>.
          Here's a summary of your personality trait scores.
        </p>

        <!-- Overall fit card -->
        <div style="background:#ffffff;border:1px solid #e2d9cf;border-left:4px solid ${fitColor};border-radius:6px;padding:20px 24px;margin-bottom:28px;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;color:#78716c;text-transform:uppercase;">Overall Assessment</p>
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:${fitColor};">${fitBand}</p>
          <p style="margin:0;font-size:13px;color:#94a3b8;">Average trait level: <strong style="color:#1e293b;">${avgLevel.toFixed(1)} / 5</strong></p>
        </div>

        <!-- Top strengths -->
        ${top3.length > 0 ? `
        <div style="margin-bottom:28px;">
          <h2 style="margin:0 0 12px;font-size:15px;color:#1e293b;">Your Key Strengths</h2>
          <div>${top3Html}</div>
        </div>
        ` : ''}

        <!-- Trait breakdown -->
        <h2 style="margin:0 0 18px;font-size:16px;color:#1e293b;border-bottom:1px solid #e2d9cf;padding-bottom:8px;">
          Trait Breakdown
        </h2>
        ${traitRowsHtml}

        <!-- PDF note -->
        ${pdfBuffer ? `
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:16px 20px;margin-top:8px;">
          <p style="margin:0;font-size:13px;color:#0c4a6e;">
            📄 <strong>Your full PDF report is attached</strong> — it includes a complete breakdown and can be saved for your records.
          </p>
        </div>
        ` : ''}

        <!-- Note to candidate -->
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px 20px;margin-top:20px;">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
            These results reflect your tendencies and preferences as reported at the time of the assessment.
            The hiring team will review them as part of the overall selection process.
          </p>
        </div>

        <!-- Disclaimer -->
        <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;line-height:1.6;border-top:1px solid #e2d9cf;padding-top:16px;">
          This assessment is a structured self-report tool. Results should be used alongside interviews,
          reference checks, and other evaluation methods in any hiring decision.
        </p>

      </div>

      <!-- Footer -->
      <div style="background:#1e293b;padding:16px 32px;">
        <p style="margin:0;font-size:11px;color:#64748b;">SRJ Group · Talent Acquisition · <a href="https://careers.srjsteel.in" style="color:#64748b;">careers.srjsteel.in</a></p>
      </div>

    </div>
  `;

  const text = `Hi ${name}, your ${attempt.assessment.name} results: Overall ${fitBand} (avg level ${avgLevel.toFixed(1)}/5). ` +
    traitRows.map((r) => `${traitDisplayName(r.traitName)}: ${r.averageScore.toFixed(1)}/5`).join(', ') + '.';

  await emailService.send({
    to: email,
    subject: `Your ${attempt.assessment.name} Results`,
    html,
    text,
    attachments: pdfBuffer
      ? [{
          filename: `SRJ_Assessment_Report_${firstName}_${lastName}.pdf`.replace(/\s+/g, '_'),
          content: pdfBuffer,
          contentType: 'application/pdf',
        }]
      : [],
  });

  console.log(`[Phase2Email] Sent result email to ${email} for attempt ${attemptId}`);
}
