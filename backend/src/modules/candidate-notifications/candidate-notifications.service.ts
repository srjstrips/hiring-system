import { AppError } from '@/utils/errors';
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
  }
}

export default new CandidateNotificationsService();
