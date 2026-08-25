import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { getAll, create, update, remove, reorder } from './pipeline-stages.controller';

const router = Router();

router.get('/', getAll);
router.post('/', authenticate, create);
router.put('/reorder', authenticate, reorder);
router.put('/:key', authenticate, update);
router.delete('/:key', authenticate, remove);

export default router;
