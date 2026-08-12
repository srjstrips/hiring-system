import { Request, ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export interface AuthUser {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  departmentIds: string[];
  locationIds: string[];
}

export interface AuthRequest<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: AuthUser;
}

export interface CandidateAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface CandidateAuthRequest<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  candidate?: CandidateAuthUser;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
}

export interface ValidationError {
  field: string;
  message: string;
}

export type SortOrder = 'asc' | 'desc';
