import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import * as controller from './interviews.controller';

const router = Router();

router.use(authenticate);

router.get('/', authorize('interviews:read'), controller.getAll);
router.get('/summary', authorize('interviews:read'), controller.getSummary);
router.get('/:id', authorize('interviews:read'), controller.getById);
router.post('/', authorize('interviews:create'), controller.create);
router.put('/:id', authorize('interviews:update'), controller.update);
router.patch('/:id/status', authorize('interviews:update'), controller.updateStatus);
router.post('/:id/feedback', authorize('interviews:feedback'), controller.addFeedback);

export default router;
