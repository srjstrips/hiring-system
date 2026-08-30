/**
 * Candidate summary email sent after personality assessment submission.
 * Gives top 3 strengths + 1 development theme — no scores, no derailers.
 */

import { prisma } from '@/config/database';
import { emailService } from '@/services/email.service';

const TRAIT_LABELS: Record<string, string> = {
  H: 'Honesty & Integrity',
  ES: 'Emotional Stability',
  X: 'Extraversion & Energy',
  A: 'Agreeableness & Teamwork',
  C: 'Conscientiousness & Drive',
  O: 'Openness & Adaptability',
};

const STRENGTH_DESCRIPTIONS: Record<string, string> = {
  H: 'You demonstrate strong ethical grounding and a preference for transparent, principled conduct.',
  ES: 'You remain composed and effective under pressure — a key asset in demanding environments.',
  X: 'You bring energy and confidence to group settings, naturally engaging others around shared goals.',
  A: 'You work constructively with others, showing flexibility and care in collaborative situations.',
  C: 'You are disciplined and dependable, following through on commitments with consistent quality.',
  O: 'You embrace learning and change, bringing curiosity and fresh thinking to your work.',
};

const DEVELOPMENT_THEMES: Record<string, string> = {
  H: 'Building a personal brand of transparency — proactively communicating intent in high-stakes situations.',
  ES: 'Strengthening your composure toolkit for high-pressure moments.',
  X: 'Increasing your visibility — sharing insights and contributions more actively in group forums.',
  A: 'Stretching into productive tension when different views surface.',
  C: 'Balancing thoroughness with pace when speed matters more than perfection.',
  O: 'Expanding your exposure to new methods and cross-functional perspectives.',
};

export async function sendCandidateAssessmentSummaryEmail(attemptId: string): Promise<void> {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      assessment: { select: { name: true } },
      candidate: { select: { firstName: true, lastName: true, email: true } },
      personalityResult: true,
    },
  });

  if (!attempt?.personalityResult || !attempt.candidate?.email) return;

  const r = attempt.personalityResult;
  const name = `${attempt.candidate.firstName ?? ''} ${attempt.candidate.lastName ?? ''}`.trim() || 'Candidate';

  // Build top-3 trait strengths from T-scores
  const traitMap: Record<string, number | null> = {
    H: r.tH, ES: r.tES, X: r.tX, A: r.tA, C: r.tC, O: r.tO,
  };
  const sorted = Object.entries(traitMap)
    .filter(([, v]) => v !== null)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));

  const top3 = sorted.slice(0, 3).map(([k]) => k);
  const lowest = sorted[sorted.length - 1]?.[0];

  const strengthsHtml = top3
    .map((t) => `
      <li style="margin-bottom:12px;">
        <strong>${TRAIT_LABELS[t] ?? t}</strong><br>
        <span style="color:#4b5563;">${STRENGTH_DESCRIPTIONS[t] ?? ''}</span>
      </li>`)
    .join('');

  const devTheme = lowest ? `
    <p style="margin:0 0 8px;"><strong>One area to continue developing:</strong></p>
    <p style="color:#4b5563;margin:0;">${DEVELOPMENT_THEMES[lowest] ?? ''}</p>
  ` : '';

  const archetype = r.archetype ?? '';
  const archetypeHtml = archetype ? `
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Your Profile</p>
    <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#92400e;">${archetype}</p>
  ` : '';

  const html = `
    <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;color:#111827;">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Thank you for completing your assessment, ${name}!</h2>
      <p style="margin:0 0 24px;color:#4b5563;">
        You've completed the <strong>${attempt.assessment.name}</strong>.
        Our hiring team will review your full profile. Here's a brief look at what your responses revealed about your strengths.
      </p>
      ${archetypeHtml}
      <p style="margin:0 0 12px;font-size:15px;font-weight:600;">Your top strengths</p>
      <ul style="margin:0 0 24px;padding-left:20px;line-height:1.7;">
        ${strengthsHtml}
      </ul>
      ${devTheme ? `<div style="background:#f9fafb;border-left:4px solid #d97706;padding:16px;border-radius:4px;margin-bottom:24px;">${devTheme}</div>` : ''}
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
        Please note: this is a brief summary for your reference. Your full profile will be reviewed by our HR team as part of the selection process.
        Results are one input among several — your experience, interview, and other assessments all contribute to the decision.
      </p>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">SRJ Group Talent Acquisition</p>
    </div>
  `;

  await emailService.send({
    to: attempt.candidate.email,
    subject: `Your assessment summary — ${attempt.assessment.name}`,
    html,
    text: `Thank you for completing ${attempt.assessment.name}, ${name}. Your top strengths: ${top3.map((t) => TRAIT_LABELS[t]).join(', ')}. Our team will be in touch.`,
  });
}
