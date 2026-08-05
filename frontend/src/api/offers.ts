import { api } from './axios';

export interface Offer {
  id: string;
  offerNumber: string;
  status: string;
  ctc: number;
  joiningBonus?: number;
  joiningDate?: string;
  designation: string;
  department: string;
  location: string;
  salaryBreakdown?: any;
  terms?: string;
  expiresAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  approvalStatus: string;
  createdAt: string;
  application: {
    id: string;
    candidate: { id: string; firstName: string; lastName: string; email: string; phone?: string };
    job: { id: string; title: string; department: { name: string } };
  };
  createdBy: { id: string; firstName: string; lastName: string };
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
}

export const offersApi = {
  getAll: (params?: any) =>
    api.get<{ success: boolean; data: Offer[]; total: number }>('/offers', { params }),
  getById: (id: string) => api.get<{ success: boolean; data: Offer }>(`/offers/${id}`),
  create: (data: any) => api.post<{ success: boolean; data: Offer }>('/offers', data),
  update: (id: string, data: any) => api.put<{ success: boolean; data: Offer }>(`/offers/${id}`, data),
  send: (id: string) => api.post<{ success: boolean; data: Offer }>(`/offers/${id}/send`),
  accept: (id: string) => api.post<{ success: boolean; data: Offer }>(`/offers/${id}/accept`),
  reject: (id: string, reason?: string) => api.post<{ success: boolean; data: Offer }>(`/offers/${id}/reject`, { reason }),
  getSummary: (params?: Record<string, unknown>) =>
    api.get('/offers/summary', { params }).then((r) => r.data),
};
