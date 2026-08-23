import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import offersController from './offers.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('offers:read'), offersController.getAll);
router.get('/summary', authorize('offers:read'), offersController.getSummary);
router.get('/:id', authorize('offers:read'), offersController.getById);
router.post('/', authorize('offers:create'), offersController.create);
router.put('/:id', authorize('offers:update'), offersController.update);
router.post('/:id/send', authorize('offers:update'), offersController.send);
router.post('/:id/accept', authorize('offers:update'), offersController.accept);
router.post('/:id/reject', authorize('offers:update'), offersController.reject);
router.delete('/:id', authorize('offers:delete'), offersController.delete);

export default router;
