import type { Response } from 'express';
import type { CandidateAuthRequest } from '@/types';
import candidateNotificationsService from './candidate-notifications.service';

class CandidateNotificationsController {
  async getAll(req: CandidateAuthRequest, res: Response) {
    const page = Math.max(1, Number(req.query['page']) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query['limit']) || 20));
    const unreadOnly = req.query['unreadOnly'] === 'true';
    const result = await candidateNotificationsService.getAll(req.candidate!.id, { page, limit, unreadOnly });
    res.json({ success: true, ...result });
  }

  async getUnreadCount(req: CandidateAuthRequest, res: Response) {
    const data = await candidateNotificationsService.getUnreadCount(req.candidate!.id);
    res.json({ success: true, data });
  }

  async markAsRead(req: CandidateAuthRequest, res: Response) {
    const data = await candidateNotificationsService.markAsRead(req.params['id'] as string, req.candidate!.id);
    res.json({ success: true, data });
  }

  async markAllAsRead(req: CandidateAuthRequest, res: Response) {
    await candidateNotificationsService.markAllAsRead(req.candidate!.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  }
}

export default new CandidateNotificationsController();
