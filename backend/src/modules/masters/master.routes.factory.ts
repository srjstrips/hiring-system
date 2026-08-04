import { Router } from 'express';
import { ZodSchema } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validateBody, validateQuery } from '../../middlewares/validate';
import { masterQuerySchema, toggleActiveSchema } from './master.validators';
import { MasterController } from './master.controller';

/**
 * Factory that builds a standard CRUD router for any master entity.
 * All masters are protected by masters:read/create/update/delete permissions.
 */
export function createMasterRouter<T extends { id: string }>(
  controller: MasterController<T>,
  createSchema: ZodSchema,
  updateSchema: ZodSchema
): Router {
  const router = Router();

  router.use(authenticate);

  router.get(
    '/',
    authorize('masters:read'),
    validateQuery(masterQuerySchema),
    controller.getAll
  );

  router.get('/active', authorize('masters:read'), controller.getAllActive);

  router.get('/:id', authorize('masters:read'), controller.getById);

  router.post(
    '/',
    authorize('masters:create'),
    validateBody(createSchema),
    controller.create
  );

  router.put(
    '/:id',
    authorize('masters:update'),
    validateBody(updateSchema),
    controller.update
  );

  router.patch(
    '/:id/toggle-active',
    authorize('masters:update'),
    validateBody(toggleActiveSchema),
    controller.toggleActive
  );

  router.delete('/:id', authorize('masters:delete'), controller.delete);

  return router;
}
