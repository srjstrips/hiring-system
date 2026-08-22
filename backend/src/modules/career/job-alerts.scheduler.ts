import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { emailService } from '@/services/email.service';
import careerService from './career.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKLY_MS = 7 * DAY_MS;
const MONTHLY_MS = 30 * DAY_MS;

/**
 * Send job-alert emails to subscribers. Each subscriber can receive both a
 * weekly digest and a separate monthly summary, tracked by independent
 * timestamps so the two cadences never interfere. Idempotent — safe to run
 * daily; a candidate is only emailed once their interval has elapsed.
 */
export async function runJobAlerts(now: Date = new Date()): Promise<void> {
  const subscribers = await prisma.candidate.findMany({
    where: { deletedAt: null, isActive: true, jobAlertSubscribed: true },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      jobAlertWeeklySentAt: true,
      jobAlertMonthlySentAt: true,
    },
  });

  let sent = 0;
  for (const c of subscribers) {
    const weeklyDue = !c.jobAlertWeeklySentAt || now.getTime() - c.jobAlertWeeklySentAt.getTime() >= WEEKLY_MS;
    const monthlyDue = !c.jobAlertMonthlySentAt || now.getTime() - c.jobAlertMonthlySentAt.getTime() >= MONTHLY_MS;
    if (!weeklyDue && !monthlyDue) continue;

    let jobs: any[] = [];
    try {
      jobs = await careerService.getRecommendedJobs(c.id, 8);
    } catch (err) {
      logger.error(`Job alert lookup failed for candidate ${c.id}:`, err);
      continue;
    }
    if (jobs.length === 0) continue; // nothing to send; retry next run

    const mapped = jobs.map((j: any) => ({
      title: j.title,
      slug: j.slug,
      department: j.department?.name,
      location: [j.location?.city, j.location?.state].filter(Boolean).join(', ') || undefined,
    }));
    const candidateName = `${c.firstName} ${c.lastName}`.trim();

    for (const period of ['WEEKLY', 'MONTHLY'] as const) {
      if (period === 'WEEKLY' ? !weeklyDue : !monthlyDue) continue;
      try {
        await emailService.sendJobAlertEmail({ email: c.email, candidateName, frequency: period, jobs: mapped });
        await prisma.candidate.update({
          where: { id: c.id },
          data: period === 'WEEKLY' ? { jobAlertWeeklySentAt: now } : { jobAlertMonthlySentAt: now },
        });
        sent += 1;
      } catch (err) {
        logger.error(`${period} job alert failed for candidate ${c.id}:`, err);
      }
    }
  }

  if (sent > 0) logger.info(`Job alert emails sent: ${sent}`);
}

/** Start a daily timer that dispatches due weekly/monthly job alerts. */
export function startJobAlertScheduler(): void {
  const kickoff = setTimeout(() => {
    runJobAlerts().catch((err) => logger.error('Job alert run failed', err));
  }, 60 * 1000);
  kickoff.unref?.();

  const timer = setInterval(() => {
    runJobAlerts().catch((err) => logger.error('Job alert run failed', err));
  }, DAY_MS);
  timer.unref?.();
}
