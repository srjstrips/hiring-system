import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { getUserScope } from '../utils/scope';

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const scope = await getUserScope(payload.sub, payload.roleName);

    req.user = {
      id: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
      roleName: payload.roleName,
      permissions: payload.permissions,
      departmentIds: scope.departmentIds ?? [],
      locationIds: scope.locationIds ?? [],
    };

    next();
  } catch (err) {
    next(err);
  }
}
