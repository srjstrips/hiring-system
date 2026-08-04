import { Response } from 'express';
import { PaginationMeta } from '../types';

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message = 'Success'
  ): Response {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
    });
  }

  static created<T>(res: Response, data: T, message = 'Created successfully'): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    code?: string
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(code && { code }),
    });
  }

  static validationError(
    res: Response,
    errors: { field: string; message: string }[],
    message = 'Validation failed'
  ): Response {
    return res.status(422).json({
      success: false,
      message,
      errors,
    });
  }
}

export function buildPagination(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function getPaginationParams(
  query: Record<string, unknown>
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 10), 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
