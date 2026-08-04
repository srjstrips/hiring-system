import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import candidatesController from './candidates.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('candidates:read'), candidatesController.getAll);
router.get('/:id', authorize('candidates:read'), candidatesController.getById);

export default router;
