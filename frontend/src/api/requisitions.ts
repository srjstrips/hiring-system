import { api } from './axios';

export interface Requisition {
  id: string;
  requisitionNumber: string;
  numberOfPositions: number;
  filledPositions: number;
  salaryMin?: number;
  salaryMax?: number;
  jobDescription?: string | null;
  remark?: string | null;
  priority: string;
  approvalStatus: string;
  targetDate?: string | null;
  createdAt: string;
  rejectionReason?: string | null;
  replacementAvailable?: boolean;
  replacementEmployeeName?: string | null;
  hodName?: string | null;
  raisedFrom?: string | null;
  department: { id: string; name: string };
  subDepartment?: { id: string; name: string } | null;
  designation: { id: string; name: string };
  location: { id: string; name: string };
  experienceLevel?: { id: string; name: string } | null;
  createdBy: { id: string; firstName: string; lastName: string };
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
  skills: Array<{ skill: { id: string; name: string }; isRequired: boolean }>;
  _count: { jobs: number };
}

export const requisitionsApi = {
  getAll: (params?: any) =>
    api.get<{ success: boolean; data: Requisition[]; total: number }>('/requisitions', { params }),
  getById: (id: string) => api.get<{ success: boolean; data: Requisition }>(`/requisitions/${id}`),
  create: (data: any) => api.post<{ success: boolean; data: Requisition }>('/requisitions', data),
  update: (id: string, data: any) =>
    api.put<{ success: boolean; data: Requisition }>(`/requisitions/${id}`, data),
  approve: (id: string) => api.post<{ success: boolean; data: Requisition }>(`/requisitions/${id}/approve`),
  reject: (id: string, reason: string) =>
    api.post<{ success: boolean; data: Requisition }>(`/requisitions/${id}/reject`, { reason }),
  getSummary: (params?: Record<string, unknown>) =>
    api.get('/requisitions/summary', { params }).then((r) => r.data),
  delete: (id: string) => api.delete(`/requisitions/${id}`),
};
