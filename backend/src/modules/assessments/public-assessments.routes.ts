import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
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

// Strict rate limit for public token-based endpoints — 30 req/min per IP
const tokenLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});

// Tighter limiter for answer-saving (write operations)
const answerLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});

// Reject requests where the token is not a 64-char hex string — no DB hit needed
function validateTokenFormat(req: Request, res: Response, next: NextFunction) {
  const token = (req.params as Record<string, string>)['secureToken'] ?? '';
  if (!/^[0-9a-f]{64}$/.test(token)) {
    res.status(404).json({ success: false, message: 'Assessment link is invalid or has expired.' });
    return;
  }
  next();
}

router.use(tokenLimiter);
router.use('/t/:secureToken', validateTokenFormat);

router.get('/t/:secureToken', publicAssessmentsController.getIntro);
router.post('/t/:secureToken/start', publicAssessmentsController.start);
router.get('/t/:secureToken/attempt', publicAssessmentsController.getAttempt);
router.post('/t/:secureToken/answers', answerLimiter, validateBody(SaveAnswerSchema), publicAssessmentsController.saveAnswer);
router.post('/t/:secureToken/answers/batch', answerLimiter, validateBody(SaveAnswersBatchSchema), publicAssessmentsController.saveAnswers);
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
