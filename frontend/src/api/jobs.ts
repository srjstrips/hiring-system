import { api } from './axios';

export interface Job {
  id: string;
  title: string;
  slug: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  benefits?: string;
  salaryMin?: number;
  salaryMax?: number;
  showSalary: boolean;
  numberOfPositions: number;
  priority: string;
  isActive: boolean;
  isPublished: boolean;
  publishedAt?: string;
  closingDate?: string;
  createdAt: string;
  department: { id: string; name: string };
  designation: { id: string; name: string };
  location: { id: string; name: string; city: string; state: string };
  employmentType?: { id: string; name: string };
  experienceLevel?: { id: string; name: string };
  createdBy: { id: string; firstName: string; lastName: string };
  skills: Array<{ skillId: string; isRequired: boolean; skill: { id: string; name: string; category?: string } }>;
  assessmentTemplate?: { id: string; title: string; durationMins: number } | null;
  _count: { applications: number };
}

export interface JobsResponse {
  success: boolean;
  data: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JobQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  locationId?: string;
  isPublished?: boolean;
}

export const jobsApi = {
  getAll: (params?: JobQueryParams) => api.get<JobsResponse>('/jobs', { params }),
  getById: (id: string) => api.get<{ success: boolean; data: Job }>(`/jobs/${id}`),
  create: (data: any) => api.post<{ success: boolean; data: Job }>('/jobs', data),
  update: (id: string, data: any) => api.put<{ success: boolean; data: Job }>(`/jobs/${id}`, data),
  publish: (id: string) => api.patch(`/jobs/${id}/publish`),
  unpublish: (id: string) => api.patch(`/jobs/${id}/unpublish`),
  delete: (id: string) => api.delete(`/jobs/${id}`),
};
