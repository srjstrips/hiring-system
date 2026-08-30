import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validateBody } from '@/middlewares/validate';
import {
  AssignCandidatesSchema,
  BulkQuestionsSchema,
  CreateAssessmentSchema,
  CreateQuestionSchema,
  CreateTemplateSchema,
  ReorderQuestionsSchema,
  UpdateAssessmentSchema,
  UpdateQuestionSchema,
  UpdateTemplateSchema,
} from './assessments.validator';
import assessmentsController from './assessments.controller';
import recordingsController from './recordings.controller';

const router = Router();

// Short-lived signed stream (no HR session cookie required for <video src>)
router.get('/recordings/:recordingId/stream', recordingsController.stream);

router.use(authenticate);

// Phase 1 HR Assessment Management
router.get('/', authorize('assessments:read'), assessmentsController.list);
router.post('/', validateBody(CreateAssessmentSchema), authorize('assessments:create'), assessmentsController.create);
router.get('/:id', authorize('assessments:read'), assessmentsController.getById);
router.put('/:id', validateBody(UpdateAssessmentSchema), authorize('assessments:update'), assessmentsController.update);
router.delete('/:id', authorize('assessments:delete'), assessmentsController.archive);

router.get('/:id/questions', authorize('assessments:read'), assessmentsController.listQuestions);
router.post('/:id/questions', validateBody(CreateQuestionSchema), authorize('assessments:update'), assessmentsController.createQuestion);
router.put('/:id/questions/reorder', validateBody(ReorderQuestionsSchema), authorize('assessments:update'), assessmentsController.reorderQuestions);
router.put('/:id/questions/:questionId', validateBody(UpdateQuestionSchema), authorize('assessments:update'), assessmentsController.updateQuestion);
router.delete('/:id/questions/:questionId', authorize('assessments:update'), assessmentsController.deleteQuestion);

router.get('/:id/eligible-candidates', authorize('assessments:read'), assessmentsController.eligibleCandidates);
router.post('/:id/assign', validateBody(AssignCandidatesSchema), authorize('assessments:update'), assessmentsController.assignCandidates);
router.get('/:id/assignments', authorize('assessments:read'), assessmentsController.listAssignments);

// Phase 3 — HR results dashboard
router.get('/:id/results', authorize('assessments:read'), assessmentsController.getResultsDashboard);
router.get('/:id/assignments/:assignmentId/result', authorize('assessments:read'), assessmentsController.getAssignmentResultDetail);
router.post('/:id/assignments/:assignmentId/resend', authorize('assessments:update'), assessmentsController.resendAssignmentInvite);
router.post('/:id/assignments/:assignmentId/retake', authorize('assessments:update'), assessmentsController.allowRetake);

router.get(
  '/:id/recordings/:recordingId/view-url',
  authorize('assessments:read'),
  recordingsController.getViewUrl
);

// Legacy job-scoped routes (AssessmentBuilderPage + results)
router.post('/templates', validateBody(CreateTemplateSchema), authorize('assessments:create'), assessmentsController.createTemplate);
router.get('/jobs/:jobId/template', authorize('assessments:read'), assessmentsController.getTemplate);
router.put('/jobs/:jobId/template', validateBody(UpdateTemplateSchema), authorize('assessments:update'), assessmentsController.updateTemplate);
router.delete('/jobs/:jobId/template', authorize('assessments:delete'), assessmentsController.deleteTemplate);
router.put('/jobs/:jobId/questions', validateBody(BulkQuestionsSchema), authorize('assessments:update'), assessmentsController.saveQuestions);
router.get('/jobs/:jobId/results', authorize('assessments:read'), assessmentsController.getResults);

router.get('/applications/:applicationId/result', authorize('assessments:read'), assessmentsController.getAttemptResult);

// TalentSignal seeder — creates the pre-built personality assessment for a job
router.post('/seed-talent-signal', authorize('assessments:create'), assessmentsController.seedTalentSignal);

export default router;
