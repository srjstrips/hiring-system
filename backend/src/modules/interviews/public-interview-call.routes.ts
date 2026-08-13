import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import publicInterviewCallController from './public-interview-call.controller';

const router = Router();

const callLimiter = rateLimit({
  windowMs: 60_000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many video-call requests. Please wait a moment.' },
});

router.use(callLimiter);

router.get('/t/:token', (req, res, next) => {
  publicInterviewCallController.getRoom(req, res).catch(next);
});
router.post('/t/:token/join', (req, res, next) => {
  publicInterviewCallController.join(req, res).catch(next);
});
router.get('/t/:token/signal', (req, res, next) => {
  publicInterviewCallController.poll(req, res).catch(next);
});
router.post('/t/:token/signal', (req, res, next) => {
  publicInterviewCallController.signal(req, res).catch(next);
});

export default router;
