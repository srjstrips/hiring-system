import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validateBody } from '@/middlewares/validate';
import { CreateTemplateSchema, UpdateTemplateSchema, BulkQuestionsSchema } from './assessments.validator';
import assessmentsController from './assessments.controller';

const router = Router();

router.use(authenticate);

// HR routes
router.post('/templates', validateBody(CreateTemplateSchema), authorize('assessments:create'), assessmentsController.createTemplate);
router.get('/jobs/:jobId/template', authorize('assessments:read'), assessmentsController.getTemplate);
router.put('/jobs/:jobId/template', validateBody(UpdateTemplateSchema), authorize('assessments:update'), assessmentsController.updateTemplate);
router.delete('/jobs/:jobId/template', authorize('assessments:delete'), assessmentsController.deleteTemplate);
router.put('/jobs/:jobId/questions', validateBody(BulkQuestionsSchema), authorize('assessments:update'), assessmentsController.saveQuestions);
router.get('/jobs/:jobId/results', authorize('assessments:read'), assessmentsController.getResults);

// Shared: get attempt result
router.get('/applications/:applicationId/result', assessmentsController.getAttemptResult);

export default router;
