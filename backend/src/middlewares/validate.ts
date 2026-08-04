import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Express 5 makes req.query read-only (getter-only property).
// We work around this by using Object.defineProperty to force-overwrite it.
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      // Force-replace the getter with a value property
      Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.params);
      Object.defineProperty(req, 'params', { value: parsed, writable: true, configurable: true });
      next();
    } catch (error) {
      next(error);
    }
  };
}
