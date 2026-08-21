import { Router } from 'express';
import { authenticateCandidate } from '@/middlewares/authenticateCandidate';
import candidateNotificationsController from './candidate-notifications.controller';

const router = Router();

router.use(authenticateCandidate);

router.get('/', candidateNotificationsController.getAll);
router.get('/unread-count', candidateNotificationsController.getUnreadCount);
router.patch('/read-all', candidateNotificationsController.markAllAsRead);
router.patch('/:id/read', candidateNotificationsController.markAsRead);

export default router;
