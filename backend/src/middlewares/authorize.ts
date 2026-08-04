import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function authorize(...requiredPermissions: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    // Super Admin role bypasses all permission checks
    if (req.user.roleName === 'super_admin') {
      return next();
    }

    if (requiredPermissions.length === 0) {
      return next();
    }

    const hasPermission = requiredPermissions.every((perm) =>
      req.user!.permissions.includes(perm)
    );

    if (!hasPermission) {
      throw new ForbiddenError(
        `Required permissions: ${requiredPermissions.join(', ')}`
      );
    }

    next();
  };
}

export function authorizeAny(...requiredPermissions: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (req.user.roleName === 'super_admin') {
      return next();
    }

    const hasAny = requiredPermissions.some((perm) =>
      req.user!.permissions.includes(perm)
    );

    if (!hasAny) {
      throw new ForbiddenError(
        `Requires one of: ${requiredPermissions.join(', ')}`
      );
    }

    next();
  };
}
