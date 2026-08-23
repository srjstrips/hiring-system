import { api } from './axios';

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentCompany?: string;
  currentDesignation?: string;
  totalExperience?: number;
  expectedSalary?: number;
  noticePeriodDays?: number;
  linkedinUrl?: string;
  resumeUrl?: string;
  profileSummary?: string;
  source?: { id: string; name: string };
  _count: { applications: number };
  applications?: Array<{
    id: string;
    status: string;
    appliedAt: string;
    job: { id: string; title: string };
    assessmentAttempt?: { score?: number; isPassed?: boolean } | null;
  }>;
  certificates?: Array<{ id: string; name?: string; fileUrl?: string; fileOriginalName?: string }>;
  createdAt: string;
}

export interface CandidateQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  experienceMin?: number;
  experienceMax?: number;
  noticeMin?: number;
  noticeMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  designation?: string;
  applicationFrom?: string;
  applicationTo?: string;
  pastCompany?: string;
  skills?: string;
  skillMatchMode?: 'ALL' | 'ANY';
}

export const candidatesApi = {
  getAll: (params?: CandidateQueryParams) =>
    api.get<{ success: boolean; data: Candidate[]; total: number; totalPages: number; page: number; limit: number }>(
      '/candidates',
      { params },
    ),
  getById: (id: string) => api.get<{ success: boolean; data: Candidate }>(`/candidates/${id}`),
  exportExcel: (params?: Omit<CandidateQueryParams, 'page' | 'limit'>) =>
    api.get('/candidates/export/excel', { params, responseType: 'blob' }),
  delete: (id: string) => api.delete(`/candidates/${id}`),
};
