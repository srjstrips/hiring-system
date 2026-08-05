import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAny } from '../../middlewares/authorize';
import * as controller from './dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/summary', authorizeAny('dashboard:read', 'reports:read'), controller.getSummary);
router.get('/pipeline', authorizeAny('dashboard:read', 'reports:read'), controller.getPipeline);
router.get('/upcoming-interviews', authorizeAny('dashboard:read', 'reports:read'), controller.getUpcomingInterviews);

export default router;
