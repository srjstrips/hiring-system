import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateBody, validateQuery } from '../../middlewares/validate';
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  userQuerySchema,
} from './users.validators';

const router = Router();

router.use(authenticate);

router.get('/', authorize('users:read'), validateQuery(userQuerySchema), usersController.getAll);
router.get('/:id', authorize('users:read'), usersController.getById);
router.post('/', authorize('users:create'), validateBody(createUserSchema), usersController.create);
router.put('/:id', authorize('users:update'), validateBody(updateUserSchema), usersController.update);
router.delete('/:id', authorize('users:delete'), usersController.delete);
router.put('/me/change-password', validateBody(changePasswordSchema), usersController.changePassword);

export default router;
