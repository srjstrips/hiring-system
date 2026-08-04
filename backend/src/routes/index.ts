import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/users.routes';
import masterRoutes from '../modules/masters';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/masters', masterRoutes);

export default router;
