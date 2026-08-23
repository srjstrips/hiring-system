import { AppError } from '@/utils/errors';
import { prisma } from '@/config/database';
import { sendPushNotification, sendPushToMany } from '@/services/firebase.service';
import candidateNotificationsRepository from './candidate-notifications.repository';

class CandidateNotificationsService {
  async getAll(candidateId: string, query: { page: number; limit: number; unreadOnly?: boolean }) {
    return candidateNotificationsRepository.findAllForCandidate(candidateId, query);
  }

  async getUnreadCount(candidateId: string) {
    const count = await candidateNotificationsRepository.countUnread(candidateId);
    return { count };
  }

  async markAsRead(id: string, candidateId: string) {
    const notification = await candidateNotificationsRepository.findById(id, candidateId);
    if (!notification) throw new AppError('Notification not found', 404);
    await candidateNotificationsRepository.markAsRead(id, candidateId);
    return { ...notification, isRead: true, readAt: notification.readAt ?? new Date() };
  }

  async markAllAsRead(candidateId: string) {
    await candidateNotificationsRepository.markAllAsRead(candidateId);
  }

  /**
   * Called when a job is published, so every registered candidate is notified.
   */
  async notifyJobPublished(job: {
    id: string;
    slug: string;
    title: string;
    department?: { name: string } | null;
    location?: { city: string; state: string } | null;
  }) {
    await candidateNotificationsRepository.notifyAllCandidates({
      id: job.id,
      slug: job.slug,
      title: job.title,
      departmentName: job.department?.name ?? 'General',
      locationLabel: job.location ? `${job.location.city}, ${job.location.state}` : 'Multiple Locations',
    });
    // Push to all candidates with FCM token
    const candidates = await prisma.candidate.findMany({
      where: { deletedAt: null, fcmToken: { not: null } },
      select: { fcmToken: true },
    });
    const tokens = candidates.map((c) => c.fcmToken!).filter(Boolean);
    void sendPushToMany(tokens, `New Job: ${job.title}`, `${job.department?.name ?? ''} — Apply now!`, { jobSlug: job.slug });
  }

  async notifyApplicationReceived(applicationId: string, candidateName: string, jobTitle: string) {
    // Notify all HR users
    const hrUsers = await prisma.user.findMany({
      where: { deletedAt: null, fcmToken: { not: null } },
      select: { fcmToken: true },
    });
    const tokens = hrUsers.map((u) => u.fcmToken!).filter(Boolean);
    void sendPushToMany(tokens, 'New Application', `${candidateName} applied for ${jobTitle}`, { applicationId });
  }

  async notifyStatusChanged(candidateId: string, newStatus: string, jobTitle: string) {
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { fcmToken: true } });
    if (candidate?.fcmToken) {
      const statusLabel = newStatus.replace(/_/g, ' ');
      void sendPushNotification(candidate.fcmToken, 'Application Update', `Your application for ${jobTitle} has moved to ${statusLabel}`);
    }
  }

  async notifyInterviewScheduled(candidateId: string, jobTitle: string, scheduledAt: Date) {
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { fcmToken: true } });
    if (candidate?.fcmToken) {
      const dateStr = scheduledAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      void sendPushNotification(candidate.fcmToken, 'Interview Scheduled', `Interview for ${jobTitle} on ${dateStr}`);
    }
  }
}


export default new CandidateNotificationsService();
