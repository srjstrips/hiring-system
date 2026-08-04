import { Response } from 'express';
import { usersService } from './users.service';
import { ApiResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthRequest } from '../../types';

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */
export class UsersController {
  getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await usersService.findAll(req.query as any);
    return ApiResponse.paginated(res, result.data, result.pagination);
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await usersService.findById(req.params['id'] as string);
    return ApiResponse.success(res, user);
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await usersService.create(req.body as any);
    return ApiResponse.created(res, user, 'User created successfully');
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await usersService.update(req.params['id'] as string, req.body as any);
    return ApiResponse.success(res, user, 'User updated successfully');
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    await usersService.delete(req.params['id'] as string);
    return ApiResponse.success(res, null, 'User deleted successfully');
  });

  changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    await usersService.changePassword(req.user!.id, req.body as any);
    return ApiResponse.success(res, null, 'Password changed successfully');
  });
}

export const usersController = new UsersController();
