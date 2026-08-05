import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validateBody, validateQuery } from '@/middlewares/validate';
import { CreateJobSchema, UpdateJobSchema, JobQuerySchema } from './jobs.validator';
import jobsController from './jobs.controller';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(JobQuerySchema), authorize('jobs:read'), jobsController.getAll);
router.get('/open-positions', authorize('jobs:read'), jobsController.getOpenPositions);
router.get('/:id', authorize('jobs:read'), jobsController.getById);
router.post('/', validateBody(CreateJobSchema), authorize('jobs:create'), jobsController.create);
router.put('/:id', validateBody(UpdateJobSchema), authorize('jobs:update'), jobsController.update);
router.patch('/:id/publish', authorize('jobs:update'), jobsController.publish);
router.patch('/:id/unpublish', authorize('jobs:update'), jobsController.unpublish);
router.delete('/:id', authorize('jobs:delete'), jobsController.delete);

export default router;
