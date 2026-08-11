import { api } from './axios';

export interface Application {
  id: string;
  status: string;
  appliedAt: string;
  coverLetter?: string;
  rejectionReason?: string;
  candidate: {
    id: string; firstName: string; lastName: string; email: string; phone?: string;
    currentCompany?: string; currentDesignation?: string; totalExperience?: number;
    expectedSalary?: number; noticePeriodDays?: number; resumeUrl?: string; linkedinUrl?: string;
  };
  job: { id: string; title: string; slug: string; department: { name: string } };
  source?: { id: string; name: string };
  timeline: Array<{ id: string; fromStatus?: string; toStatus: string; notes?: string; createdAt: string }>;
  assessmentAttempt?: { score?: number; isPassed?: boolean; submittedAt?: string } | null;
  _count: { interviews: number };
}

export interface ApplicationQueryParams {
  page?: number;
  limit?: number;
  jobId?: string;
  status?: string;
  search?: string;
}

function cleanParams(params?: ApplicationQueryParams): Record<string, string | number> | undefined {
  if (!params) return undefined;
  const cleaned: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    cleaned[key] = value as string | number;
  }
  return Object.keys(cleaned).length ? cleaned : undefined;
}

export const applicationsApi = {
  getAll: (params?: ApplicationQueryParams) =>
    api.get<{ success: boolean; data: Application[]; total: number; totalPages: number }>(
      '/applications',
      { params: cleanParams(params) },
    ),
  getById: (id: string) => api.get<{ success: boolean; data: Application }>(`/applications/${id}`),
  updateStatus: (id: string, data: { status: string; notes?: string; rejectionReason?: string }) =>
    api.patch<{ success: boolean; data: Application }>(`/applications/${id}/status`, data),
  getPipelineStats: (jobId?: string) =>
    api.get<{ success: boolean; data: Array<{ status: string; count: number }> }>(
      '/applications/pipeline-stats',
      { params: cleanParams({ jobId }) },
    ),
  getAnalytics: (params?: Record<string, unknown>) =>
    api.get('/applications/analytics', { params }).then((r) => r.data),
};
