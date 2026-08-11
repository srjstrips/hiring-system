import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import * as controller from './insights.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('reports:read'));

router.get('/hiring-overview', controller.hiringOverview);
router.get('/by-department', controller.byDepartment);
router.get('/by-position', controller.byPosition);
router.get('/by-recruiter', controller.byRecruiter);
router.get('/onboarding', controller.onboarding);
router.get('/retention', controller.retention);
router.get('/notice-period', controller.noticePeriod);
router.get('/time-to-hire', controller.timeToHire);
router.get('/in-progress', controller.inProgress);
router.get('/backed-out', controller.backedOut);
router.get('/rejected', controller.rejected);
router.get('/on-hold', controller.onHold);
router.get('/company-left', controller.companyLeft);

export default router;
