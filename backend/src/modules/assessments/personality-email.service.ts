/**
 * Candidate summary email — rich HTML with trait bars, scores, archetype, and suggestions.
 * Sent after TalentSignal personality assessment submission.
 */

import { prisma } from '@/config/database';
import { emailService } from '@/services/email.service';

const TRAIT_META: Record<string, { label: string; color: string; desc: string; dev: string }> = {
  H:  {
    label: 'Honesty & Integrity',
    color: '#7c3aed',
    desc:  'You demonstrate strong ethical grounding and a preference for transparent, principled conduct. People around you know what to expect — your word carries weight.',
    dev:   'Continue building your personal brand of transparency — proactively communicate your intent in high-stakes situations.',
  },
  ES: {
    label: 'Emotional Stability',
    color: '#0891b2',
    desc:  'You remain composed and effective under pressure. When others feel stressed, your steady presence becomes an asset for the whole team.',
    dev:   'Strengthen your composure toolkit for high-pressure moments. Small practices like pause-and-reflect can build this muscle over time.',
  },
  X:  {
    label: 'Extraversion & Energy',
    color: '#d97706',
    desc:  'You bring energy and confidence to group settings. You naturally engage others and can rally people around a shared goal.',
    dev:   'Increase your visibility — share your insights and contributions more actively in group forums and team meetings.',
  },
  A:  {
    label: 'Agreeableness & Teamwork',
    color: '#16a34a',
    desc:  'You work constructively with others, showing flexibility and genuine care in collaborative situations. Colleagues find you easy to work with.',
    dev:   'Practise engaging in productive tension when different views surface. Healthy disagreement often leads to better outcomes.',
  },
  C:  {
    label: 'Conscientiousness & Drive',
    color: '#b45309',
    desc:  'You are disciplined and dependable. You follow through on commitments with consistent quality and attention to detail.',
    dev:   'Balance thoroughness with pace when speed matters more than perfection. Done is sometimes better than perfect.',
  },
  O:  {
    label: 'Openness & Adaptability',
    color: '#0284c7',
    desc:  'You embrace learning and change, bringing curiosity and fresh thinking to your work. New challenges energise rather than discourage you.',
    dev:   'Expand your exposure to new methods and cross-functional perspectives to keep growing professionally.',
  },
};

function tLabel(t: number): string {
  if (t >= 65) return 'High';
  if (t >= 55) return 'Above Average';
  if (t >= 45) return 'Average';
  if (t >= 35) return 'Below Average';
  return 'Low';
}

function traitBarHtml(key: string, t: number): string {
  const meta = TRAIT_META[key];
  if (!meta) return '';
  const pct = Math.round(Math.max(4, ((t - 20) / 60) * 100));
  // norm band: T 40-60 → 33%-66%
  return `
    <div style="margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
        <tr>
          <td style="font-size:14px;font-weight:600;color:#1e293b;">${meta.label}</td>
          <td align="right" style="font-size:13px;font-weight:700;color:${meta.color};">${Math.round(t)} — ${tLabel(t)}</td>
        </tr>
      </table>
      <!-- Bar track -->
      <div style="position:relative;height:10px;background:#f1f5f9;border-radius:999px;overflow:hidden;">
        <!-- Norm band shading (40-60 = 33%-66%) -->
        <div style="position:absolute;top:0;left:33%;width:33%;height:100%;background:#cbd5e1;"></div>
        <!-- Score fill -->
        <div style="position:absolute;top:0;left:0;height:100%;width:${pct}%;background:${meta.color};border-radius:999px;"></div>
      </div>
      <p style="margin:6px 0 0;font-size:12px;color:#64748b;line-height:1.5;">${meta.desc}</p>
    </div>`;
}

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
  const firstName = attempt.candidate.firstName ?? 'Candidate';
  const fullName = `${attempt.candidate.firstName ?? ''} ${attempt.candidate.lastName ?? ''}`.trim() || 'Candidate';

  // Sort traits by T-score
  const traitScores: Array<{ key: string; t: number }> = [
    { key: 'H', t: r.tH ?? 50 }, { key: 'ES', t: r.tES ?? 50 },
    { key: 'X', t: r.tX ?? 50 }, { key: 'A', t: r.tA ?? 50 },
    { key: 'C', t: r.tC ?? 50 }, { key: 'O', t: r.tO ?? 50 },
  ];
  const sorted = [...traitScores].sort((a, b) => b.t - a.t);
  const top3 = sorted.slice(0, 3);
  const lowest = sorted[sorted.length - 1]!;

  // Working style section
  const styleItems = [
    { label: 'Communication Style', value: r.compCommStyle },
    { label: 'Decision Style',      value: r.compDecisionStyle },
    { label: 'Under Stress',        value: r.compStressBand },
    { label: 'Conflict Style',      value: r.compConflictStyle },
  ].filter((s) => s.value);

  const styleHtml = styleItems.length > 0 ? `
    <h3 style="margin:32px 0 12px;font-size:15px;font-weight:700;color:#1e293b;border-bottom:2px solid #FF6B00;padding-bottom:6px;">Your Working Style</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${styleItems.slice(0, 2).map((s) => `
          <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
            <div style="background:#f8fafc;border-radius:8px;padding:12px 14px;">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">${s.label}</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">${s.value}</p>
            </div>
          </td>`).join('')}
      </tr>
      ${styleItems.length > 2 ? `<tr>
        ${styleItems.slice(2).map((s) => `
          <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
            <div style="background:#f8fafc;border-radius:8px;padding:12px 14px;">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">${s.label}</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">${s.value}</p>
            </div>
          </td>`).join('')}
      </tr>` : ''}
    </table>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Your Assessment Summary</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <!-- Header -->
  <div style="background:#FF6B00;padding:28px 32px;">
    <p style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px;">SRJ GROUP</p>
    <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.08em;">Talent Acquisition</p>
  </div>

  <!-- Body -->
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:36px 32px 40px;">

    <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#111827;">
      Thank you, ${firstName}!
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
      You've completed the <strong style="color:#111827;">${attempt.assessment.name}</strong>.
      Here's a detailed look at what your responses reveal about your personality and working style.
      Our HR team will review your full profile as part of the selection process.
    </p>

    <!-- Archetype card -->
    ${r.archetype ? `
    <div style="background:linear-gradient(135deg,#fff7ed 0%,#fef3c7 100%);border:1px solid #fed7aa;border-left:5px solid #FF6B00;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Your Personality Archetype</p>
      <p style="margin:0 0 6px;font-size:24px;font-weight:800;color:#FF6B00;">${r.archetype}</p>
      ${r.fitBand ? `<p style="margin:0;font-size:13px;color:#78350f;">Overall fit: <strong>${r.fitBand}</strong></p>` : ''}
    </div>` : ''}

    <!-- Top 3 strengths -->
    <h3 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1e293b;border-bottom:2px solid #FF6B00;padding-bottom:6px;">Your Key Strengths</h3>
    ${top3.map(({ key, t }) => {
      const meta = TRAIT_META[key]!;
      return `
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;background:#f8fafc;border-radius:8px;padding:14px 16px;border-left:4px solid ${meta.color};">
        <div style="min-width:42px;text-align:center;padding-top:2px;">
          <span style="font-size:13px;font-weight:700;color:${meta.color};">${Math.round(t)}</span><br>
          <span style="font-size:10px;color:#94a3b8;">${tLabel(t)}</span>
        </div>
        <div>
          <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#1e293b;">${meta.label}</p>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">${meta.desc}</p>
        </div>
      </div>`;
    }).join('')}

    <!-- All trait bars -->
    <h3 style="margin:28px 0 16px;font-size:15px;font-weight:700;color:#1e293b;border-bottom:2px solid #FF6B00;padding-bottom:6px;">Full Personality Trait Profile</h3>
    <p style="margin:0 0 16px;font-size:12px;color:#94a3b8;">The shaded band shows the average range (T 40–60). Your score is the filled bar.</p>
    ${traitScores.map(({ key, t }) => traitBarHtml(key, t)).join('')}

    <!-- Working style -->
    ${styleHtml}

    <!-- Development area -->
    ${lowest ? `
    <h3 style="margin:28px 0 12px;font-size:15px;font-weight:700;color:#1e293b;border-bottom:2px solid #FF6B00;padding-bottom:6px;">An Area to Continue Developing</h3>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #d97706;border-radius:8px;padding:16px 20px;">
      <p style="margin:0 0 5px;font-size:14px;font-weight:600;color:#92400e;">${TRAIT_META[lowest.key]?.label ?? lowest.key}</p>
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">${TRAIT_META[lowest.key]?.dev ?? ''}</p>
    </div>` : ''}

    <!-- Disclaimer -->
    <div style="margin-top:32px;padding:16px;background:#f8fafc;border-radius:8px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
        This summary is for your personal reference. Your full profile — including detailed composite scores and role-fit analysis — will be reviewed by our HR team. Assessment results are one input among several in our selection process; your experience, interview performance, and other factors all contribute to the final decision.
      </p>
    </div>

    <p style="margin:28px 0 0;font-size:12px;color:#cbd5e1;">SRJ Group · Talent Acquisition</p>
  </div>

  <!-- Footer bar -->
  <div style="background:#1e293b;padding:16px 32px;">
    <p style="margin:0;font-size:11px;color:#64748b;text-align:center;">© SRJ Group · This email was sent to ${attempt.candidate.email}</p>
  </div>

</body>
</html>`;

  const text = `Thank you for completing ${attempt.assessment.name}, ${fullName}.\n\nYour top strengths: ${top3.map(({ key }) => TRAIT_META[key]?.label ?? key).join(', ')}.\n\nOur team will review your full profile and be in touch.`;

  await emailService.send({
    to: attempt.candidate.email,
    subject: `Your assessment results — ${attempt.assessment.name}`,
    html,
    text,
  });
}
