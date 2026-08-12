import { api } from '@/api/axios';
import type { PaginatedResponse, ApiResponse } from '@/types';

export interface MasterRecord {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface MasterQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  departmentId?: string;
}

export function createMasterService(endpoint: string) {
  const base = `/masters/${endpoint}`;

  return {
    async getAll(params: MasterQueryParams = {}): Promise<PaginatedResponse<MasterRecord>> {
      const { data } = await api.get<PaginatedResponse<MasterRecord>>(base, { params });
      return data;
    },

    async getAllActive(): Promise<MasterRecord[]> {
      const { data } = await api.get<ApiResponse<MasterRecord[]>>(`${base}/active`);
      return data.data ?? [];
    },

    async getById(id: string): Promise<MasterRecord> {
      const { data } = await api.get<ApiResponse<MasterRecord>>(`${base}/${id}`);
      return data.data!;
    },

    async create(payload: Record<string, unknown>): Promise<MasterRecord> {
      const { data } = await api.post<ApiResponse<MasterRecord>>(base, payload);
      return data.data!;
    },

    async update(id: string, payload: Record<string, unknown>): Promise<MasterRecord> {
      const { data } = await api.put<ApiResponse<MasterRecord>>(`${base}/${id}`, payload);
      return data.data!;
    },

    async toggleActive(id: string, isActive: boolean): Promise<MasterRecord> {
      const { data } = await api.patch<ApiResponse<MasterRecord>>(
        `${base}/${id}/toggle-active`,
        { isActive }
      );
      return data.data!;
    },

    async delete(id: string): Promise<void> {
      await api.delete(`${base}/${id}`);
    },
  };
}

// Pre-built service instances for each master
export const departmentService       = createMasterService('departments');
export const subDepartmentService    = createMasterService('sub-departments');
export const designationService      = createMasterService('designations');
export const locationService         = createMasterService('locations');
export const employmentTypeService   = createMasterService('employment-types');
export const experienceLevelService  = createMasterService('experience-levels');
export const skillService            = createMasterService('skills');
export const interviewTypeService    = createMasterService('interview-types');
export const educationService        = createMasterService('education');
export const recruitmentSourceService = createMasterService('recruitment-sources');
export const reasonService           = createMasterService('reasons');
