import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import requisitionsController from './requisitions.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('requisitions:read'), requisitionsController.getAll);
router.get('/summary', authorize('requisitions:read'), requisitionsController.getSummary);
router.get('/:id', authorize('requisitions:read'), requisitionsController.getById);
router.post('/', authorize('requisitions:create'), requisitionsController.create);
router.put('/:id', authorize('requisitions:update'), requisitionsController.update);
router.post('/:id/submit', authorize('requisitions:update'), requisitionsController.submit);
router.post('/:id/close', authorize('requisitions:approve'), requisitionsController.close);
router.post('/:id/approve', authorize('requisitions:approve'), requisitionsController.approve);
router.post('/:id/reject', authorize('requisitions:approve'), requisitionsController.reject);

export default router;
