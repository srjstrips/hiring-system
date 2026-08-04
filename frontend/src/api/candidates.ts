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
  createdAt: string;
}

export const candidatesApi = {
  getAll: (params?: any) =>
    api.get<{ success: boolean; data: Candidate[]; total: number; totalPages: number }>('/candidates', { params }),
  getById: (id: string) => api.get<{ success: boolean; data: Candidate }>(`/candidates/${id}`),
};
