import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateBody } from '../../middlewares/validate';
import * as controller from './interviews.controller';
import {
  CreateInterviewSchema,
  UpdateInterviewSchema,
  UpdateInterviewStatusSchema,
} from './interviews.validator';

const router = Router();

router.use(authenticate);

router.get('/', authorize('interviews:read'), controller.getAll);
router.get('/summary', authorize('interviews:read'), controller.getSummary);
router.get('/:id', authorize('interviews:read'), controller.getById);
router.post('/', authorize('interviews:create'), validateBody(CreateInterviewSchema), controller.create);
router.put('/:id', authorize('interviews:update'), validateBody(UpdateInterviewSchema), controller.update);
router.patch('/:id/status', authorize('interviews:update'), validateBody(UpdateInterviewStatusSchema), controller.updateStatus);
router.post('/:id/feedback', authorize('interviews:feedback'), controller.addFeedback);

export default router;
