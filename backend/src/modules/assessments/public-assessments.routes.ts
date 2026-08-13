import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateBody } from '@/middlewares/validate';
import { SaveAnswerSchema, SaveAnswersBatchSchema } from './public-assessments.validator';
import {
  CompleteRecordingSchema,
  RecordingEventSchema,
  StartRecordingsSchema,
} from './recordings.validator';
import publicAssessmentsController from './public-assessments.controller';
import recordingsController, { recordingChunkUpload } from './recordings.controller';

const router = Router();

const tokenLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});

router.use(tokenLimiter);

router.get('/t/:secureToken', publicAssessmentsController.getIntro);
router.post('/t/:secureToken/start', publicAssessmentsController.start);
router.get('/t/:secureToken/attempt', publicAssessmentsController.getAttempt);
router.post('/t/:secureToken/answers', validateBody(SaveAnswerSchema), publicAssessmentsController.saveAnswer);
router.post('/t/:secureToken/answers/batch', validateBody(SaveAnswersBatchSchema), publicAssessmentsController.saveAnswers);
router.post('/t/:secureToken/submit', publicAssessmentsController.submit);
router.get('/t/:secureToken/status', publicAssessmentsController.getStatus);

// Assessment recordings (candidate / secure token) — additive; does not replace assessment APIs
router.post(
  '/t/:secureToken/recordings/start',
  validateBody(StartRecordingsSchema),
  recordingsController.start
);
router.post(
  '/t/:secureToken/recordings/:recordingId/chunks',
  recordingChunkUpload,
  recordingsController.uploadChunk
);
router.post(
  '/t/:secureToken/recordings/:recordingId/complete',
  validateBody(CompleteRecordingSchema),
  recordingsController.complete
);
router.post(
  '/t/:secureToken/recordings/events',
  validateBody(RecordingEventSchema),
  recordingsController.logEvent
);

export default router;
