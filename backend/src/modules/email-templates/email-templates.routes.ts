import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validateBody } from '@/middlewares/validate';
import { CreateEmailTemplateSchema, UpdateEmailTemplateSchema, SendEmailSchema } from './email-templates.validator';
import emailTemplatesController from './email-templates.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('email-templates:read'), emailTemplatesController.getAll);
router.get('/:id', authorize('email-templates:read'), emailTemplatesController.getById);
router.post('/', validateBody(CreateEmailTemplateSchema), authorize('email-templates:create'), emailTemplatesController.create);
router.put('/:id', validateBody(UpdateEmailTemplateSchema), authorize('email-templates:update'), emailTemplatesController.update);
router.delete('/:id', authorize('email-templates:delete'), emailTemplatesController.delete);

export default router;
