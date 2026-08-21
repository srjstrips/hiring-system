import { prisma } from '@/config/database';

export interface JobPublishedInfo {
  id: string;
  slug: string;
  title: string;
  departmentName: string;
  locationLabel: string;
}

class CandidateNotificationsRepository {
  async findAllForCandidate(candidateId: string, { page, limit, unreadOnly }: { page: number; limit: number; unreadOnly?: boolean }) {
    const skip = (page - 1) * limit;
    const where: any = { candidateId };
    if (unreadOnly) where.isRead = false;

    const [data, total] = await Promise.all([
      prisma.candidateNotification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.candidateNotification.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async countUnread(candidateId: string) {
    return prisma.candidateNotification.count({ where: { candidateId, isRead: false } });
  }

  async findById(id: string, candidateId: string) {
    return prisma.candidateNotification.findFirst({ where: { id, candidateId } });
  }

  async markAsRead(id: string, candidateId: string) {
    return prisma.candidateNotification.updateMany({
      where: { id, candidateId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(candidateId: string) {
    return prisma.candidateNotification.updateMany({
      where: { candidateId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async notifyAllCandidates(job: JobPublishedInfo) {
    const candidates = await prisma.candidate.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (candidates.length === 0) return;

    await prisma.candidateNotification.createMany({
      data: candidates.map((c) => ({
        candidateId: c.id,
        jobId: job.id,
        jobSlug: job.slug,
        title: job.title,
        message: `${job.departmentName} • ${job.locationLabel}`,
      })),
    });
  }
}

export default new CandidateNotificationsRepository();
