import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAny } from '../../middlewares/authorize';
import { validateBody } from '../../middlewares/validate';
import { ShareJobBodySchema } from './job-sharing.validators';
import jobSharingController from './job-sharing.controller';

/**
 * Job sharing routes — isolated from core Jobs CRUD.
 * Permissions: users who can update or publish jobs may share.
 */
const router = Router();

router.use(authenticate);

router.get(
  '/:jobId',
  authorizeAny('jobs:update', 'jobs:publish'),
  jobSharingController.getContext
);

router.get(
  '/:jobId/history',
  authorizeAny('jobs:update', 'jobs:publish'),
  jobSharingController.getHistory
);

router.post(
  '/:jobId',
  authorizeAny('jobs:update', 'jobs:publish'),
  validateBody(ShareJobBodySchema),
  jobSharingController.share
);

export default router;
