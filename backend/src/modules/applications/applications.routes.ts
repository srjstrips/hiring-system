import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validateBody, validateQuery } from '@/middlewares/validate';
import { ApplicationQuerySchema, UpdateStatusSchema } from './applications.validator';
import applicationsController from './applications.controller';
import emailTemplatesController from '../email-templates/email-templates.controller';
import { SendEmailSchema } from '../email-templates/email-templates.validator';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(ApplicationQuerySchema), authorize('applications:read'), applicationsController.getAll);
router.get('/pipeline-stats', authorize('applications:read'), applicationsController.getPipelineStats);
router.get('/analytics', authorize('applications:read'), applicationsController.getAnalytics);
router.get('/:id', authorize('applications:read'), applicationsController.getById);
router.patch('/:id/status', validateBody(UpdateStatusSchema), authorize('applications:update'), applicationsController.updateStatus);
router.post('/:id/send-email', validateBody(SendEmailSchema), authorize('applications:update'), emailTemplatesController.sendForApplication);

export default router;
