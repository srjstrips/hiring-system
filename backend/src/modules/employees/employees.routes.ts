import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import employeesController from './employees.controller';

const router = Router();
router.use(authenticate);

router.get('/', authorize('employees:read'), employeesController.getAll);
router.get('/:id', authorize('employees:read'), employeesController.getById);
router.post('/from-offer/:offerId', authorize('employees:create'), employeesController.createFromOffer);
router.patch('/:id/status', authorize('employees:update'), employeesController.updateStatus);

export default router;
