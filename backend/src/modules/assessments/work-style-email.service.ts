/**
 * Sends the Work Style Check result email to the candidate after submission.
 * Includes:
 *  - Archetype + profile summary
 *  - Trait breakdown (level + description) — same as what shows on screen
 *  - PDF report attached as SRJ_Fit_Report_[Name].pdf
 */

import { prisma } from '@/config/database';
import { emailService } from '@/services/email.service';
import { getWorkStyleResult } from './work-style-scoring.service';
import { generateWorkStyleReportPdf } from './work-style-report.service';

const TRAIT_COLORS: Record<string, string> = {
  LEADERSHIP:            '#b45309',
  LEARNING_ADAPTABILITY: '#0891b2',
  TEAMWORK:              '#9f1239',
  PROBLEM_SOLVING:       '#1d4ed8',
};

const TRAIT_CANDIDATE_DESC: Record<string, Record<number, string>> = {
  LEADERSHIP: {
    1: 'You are building foundational leadership awareness. Small steps of ownership will grow your confidence.',
    2: 'You show moments of leadership in familiar situations. Consistent practice will build confidence over time.',
    3: 'You are generally willing to take charge when needed and can make decisions without waiting to be told what to do.',
    4: 'You lead with confidence, make decisions under pressure, and bring others along. People trust your judgment.',
    5: 'You demonstrate exceptional leadership — directing teams, making bold calls, and inspiring those around you.',
  },
  LEARNING_ADAPTABILITY: {
    1: 'Change feels challenging right now. Focus on small wins with new tools to build your adaptability muscle.',
    2: 'You are beginning to embrace learning. Curiosity is your best growth tool.',
    3: 'You adjust to new situations at a normal, healthy pace. Change generally does not throw you off for long.',
    4: 'You thrive when learning is required — you ask smart questions, recover from mistakes quickly, and adapt fast.',
    5: 'You are an exceptional learner who actively seeks challenge and turns new skills into strengths.',
  },
  TEAMWORK: {
    1: 'Working in teams is still an area of development. Practising patience and active listening will help.',
    2: 'You contribute in team settings but may prefer working independently. Deeper engagement will unlock more from you.',
    3: 'You work well with others, listen to different opinions, and generally pull your weight in a group.',
    4: 'You are a strong team player — reliable, generous with credit, and steady during disagreements.',
    5: 'You are an anchor for any team — deeply collaborative, patient, and focused on collective success.',
  },
  PROBLEM_SOLVING: {
    1: 'Problem-solving is an area to develop. Start by practising structured thinking: define, explore options, then act.',
    2: 'You can solve problems when guided. Building the habit of exploring multiple options will accelerate your growth.',
    3: 'You proactively address issues and look for improvements, even when things are working adequately.',
    4: 'You are a strong problem-solver — you look for multiple solutions and continuously improve how things work.',
    5: 'You are an exceptional problem-solver who spots issues early, thinks creatively, and drives continuous improvement.',
  },
};

export async function sendWorkStyleResultEmail(attemptId: string): Promise<void> {
  // ── Fetch attempt + candidate + assessment ──────────────────────────────────
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      assessment: { select: { id: true, name: true } },
      candidate:  { select: { firstName: true, lastName: true, email: true } },
      assignment: { select: { id: true, jobId: true } },
    },
  });

  if (!attempt?.candidate?.email) return;

  const result = await getWorkStyleResult(attemptId);
  if (!result) return;

  const firstName = attempt.candidate.firstName ?? '';
  const lastName  = attempt.candidate.lastName  ?? '';
  const name      = `${firstName} ${lastName}`.trim() || 'Candidate';
  const email     = attempt.candidate.email;

  // ── Generate PDF ────────────────────────────────────────────────────────────
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateWorkStyleReportPdf(
      attempt.assessmentId,
      attempt.assignment?.id ?? '',
    );
  } catch (err) {
    console.error('[WorkStyleEmail] PDF generation failed, sending email without attachment', err);
  }

  // ── Build trait rows HTML ───────────────────────────────────────────────────
  const traitRowsHtml = result.traits.map((t) => {
    const color = TRAIT_COLORS[t.trait] ?? '#475569';
    const barPct = Math.round(((t.rawAvg - 1) / 4) * 100);
    const desc = TRAIT_CANDIDATE_DESC[t.trait]?.[t.level] ?? '';
    return `
      <div style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
          <span style="font-weight:700;font-size:15px;color:#1e293b;">${t.label}</span>
          <span style="font-size:13px;color:${color};font-weight:600;">Level ${t.level} of 5 — ${t.levelLabel}</span>
        </div>
        <div style="background:#e2d9cf;border-radius:4px;height:8px;margin-bottom:8px;">
          <div style="background:${color};width:${barPct}%;height:8px;border-radius:4px;"></div>
        </div>
        <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">${desc}</p>
      </div>
    `;
  }).join('');

  // ── Build email HTML ────────────────────────────────────────────────────────
  const html = `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#faf8f5;border:1px solid #e2d9cf;border-radius:8px;overflow:hidden;">

      <!-- Header -->
      <div style="background:#1e293b;padding:28px 32px;">
        <p style="margin:0;font-size:11px;letter-spacing:0.1em;color:#94a3b8;text-transform:uppercase;">SRJ Talent</p>
        <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Your Workplace Fit Results</h1>
      </div>

      <!-- Body -->
      <div style="padding:32px;">

        <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
          Hi <strong style="color:#1e293b;">${name}</strong>, thank you for completing the <strong>${attempt.assessment.name}</strong>.
          Here's what your responses reveal about your working style.
        </p>

        <!-- Archetype card -->
        <div style="background:#ffffff;border:1px solid #e2d9cf;border-left:4px solid #b45309;border-radius:6px;padding:20px 24px;margin-bottom:28px;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;color:#78716c;text-transform:uppercase;">Your Profile</p>
          <p style="margin:0 0 10px;font-size:22px;font-weight:700;color:#78350f;">${result.archetype}</p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">${result.profileSummary}</p>
          <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Overall fit: <strong style="color:#1e293b;">${result.fitBand}</strong></p>
        </div>

        <!-- Trait breakdown -->
        <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;border-bottom:1px solid #e2d9cf;padding-bottom:8px;">
          Your Trait Breakdown
        </h2>
        ${traitRowsHtml}

        <!-- PDF note -->
        ${pdfBuffer ? `
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:16px 20px;margin-top:8px;">
          <p style="margin:0;font-size:13px;color:#0c4a6e;">
            📄 <strong>Your full PDF report is attached</strong> — it includes HR guidance notes and can be saved for your records.
          </p>
        </div>
        ` : ''}

        <!-- Disclaimer -->
        <p style="margin:28px 0 0;font-size:11px;color:#94a3b8;line-height:1.6;border-top:1px solid #e2d9cf;padding-top:16px;">
          This assessment is a structured self-report, not a clinical or diagnostic tool. It reflects how you describe your own working style at the time of taking it, and should be used as one input among several — alongside interviews, reference checks, and work samples — in any hiring or team-placement decision.
        </p>

      </div>

      <!-- Footer -->
      <div style="background:#1e293b;padding:16px 32px;">
        <p style="margin:0;font-size:11px;color:#64748b;">SRJ Group · Talent Acquisition · <a href="https://srjsteel.in" style="color:#64748b;">srjsteel.in</a></p>
      </div>

    </div>
  `;

  const text = `Hi ${name}, your ${attempt.assessment.name} result: ${result.archetype} — ${result.fitBand}. ${result.profileSummary}`;

  // ── Send ────────────────────────────────────────────────────────────────────
  await emailService.send({
    to: email,
    subject: `Your SRJ Workplace Fit Results — ${result.archetype}`,
    html,
    text,
    attachments: pdfBuffer
      ? [{
          filename: `SRJ_Fit_Report_${firstName}_${lastName}.pdf`.replace(/\s+/g, '_'),
          content: pdfBuffer,
          contentType: 'application/pdf',
        }]
      : [],
  });

  console.log(`[WorkStyleEmail] Sent result email to ${email} for attempt ${attemptId}`);
}
