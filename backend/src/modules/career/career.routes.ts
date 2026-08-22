import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { validateBody, validateQuery } from '@/middlewares/validate';
import { authenticateCandidate } from '@/middlewares/authenticateCandidate';
import { PublicJobQuerySchema, ApplyJobSchema, AlertSubscriptionSchema } from './career.validator';
import careerController from './career.controller';
import candidateAuthRoutes from '../candidate-auth/candidate-auth.routes';
import candidateNotificationsRoutes from '../candidate-notifications/candidate-notifications.routes';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/resumes'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const router = Router();

// Candidate signup/login/refresh/logout/me
router.use('/auth', candidateAuthRoutes);

// Requires a logged-in candidate (auth applied inside the router)
router.use('/notifications', candidateNotificationsRoutes);

// Public — no auth
router.get('/jobs', validateQuery(PublicJobQuerySchema), careerController.getJobs);
router.get('/jobs/filters', careerController.getFilters);
// Requires a logged-in candidate — must precede '/jobs/:slug'
router.get('/jobs/recommended', authenticateCandidate, careerController.getRecommended);
router.get('/jobs/:slug', careerController.getJob);

// Job-alert subscription (requires a logged-in candidate)
router.get('/alert-subscription', authenticateCandidate, careerController.getAlertSubscription);
router.put(
  '/alert-subscription',
  authenticateCandidate,
  validateBody(AlertSubscriptionSchema),
  careerController.updateAlertSubscription
);

// Requires a logged-in candidate
router.post(
  '/jobs/:jobId/apply',
  authenticateCandidate,
  upload.single('resume'),
  validateBody(ApplyJobSchema),
  careerController.apply
);

export default router;
