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

export const applicationsApi = {
  getAll: (params?: any) => api.get<{ success: boolean; data: Application[]; total: number; totalPages: number }>('/applications', { params }),
  getById: (id: string) => api.get<{ success: boolean; data: Application }>(`/applications/${id}`),
  updateStatus: (id: string, data: { status: string; notes?: string; rejectionReason?: string }) =>
    api.patch<{ success: boolean; data: Application }>(`/applications/${id}/status`, data),
  getPipelineStats: (jobId?: string) =>
    api.get<{ success: boolean; data: Array<{ status: string; count: number }> }>('/applications/pipeline-stats', { params: { jobId } }),
};
