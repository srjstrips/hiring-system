import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validateQuery } from '@/middlewares/validate';
import { CandidateQuerySchema } from './candidates.validator';
import candidatesController from './candidates.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('candidates:read'), validateQuery(CandidateQuerySchema), candidatesController.getAll);
router.get('/:id', authorize('candidates:read'), candidatesController.getById);

export default router;
