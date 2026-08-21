import { careerAxios } from './career';

export interface CandidateNotification {
  id: string;
  candidateId: string;
  jobId: string | null;
  jobSlug: string | null;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const candidateNotificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    careerAxios.get('/notifications', { params }),
  getUnreadCount: () => careerAxios.get('/notifications/unread-count'),
  markAsRead: (id: string) => careerAxios.patch(`/notifications/${id}/read`),
  markAllAsRead: () => careerAxios.patch('/notifications/read-all'),
};
