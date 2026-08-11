import { api } from './axios';

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary').then((r) => r.data),
  getPipeline: () => api.get('/dashboard/pipeline').then((r) => r.data),
  getUpcomingInterviews: () => api.get('/dashboard/upcoming-interviews').then((r) => r.data),
};

export const interviewsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/interviews', { params }).then((r) => r.data),
  getSummary: (params?: Record<string, unknown>) => api.get('/interviews/summary', { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/interviews/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/interviews', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/interviews/${id}`, data).then((r) => r.data),
  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    api.patch(`/interviews/${id}/status`, data).then((r) => r.data),
  addFeedback: (id: string, data: Record<string, unknown>) =>
    api.post(`/interviews/${id}/feedback`, data).then((r) => r.data),
};

export const insightsApi = {
  hiringOverview: (params?: Record<string, unknown>) => api.get('/insights/hiring-overview', { params }).then((r) => r.data),
  byDepartment: (params?: Record<string, unknown>) => api.get('/insights/by-department', { params }).then((r) => r.data),
  byPosition: (params?: Record<string, unknown>) => api.get('/insights/by-position', { params }).then((r) => r.data),
  byRecruiter: (params?: Record<string, unknown>) => api.get('/insights/by-recruiter', { params }).then((r) => r.data),
  onboarding: (params?: Record<string, unknown>) => api.get('/insights/onboarding', { params }).then((r) => r.data),
  retention: (params?: Record<string, unknown>) => api.get('/insights/retention', { params }).then((r) => r.data),
  noticePeriod: (params?: Record<string, unknown>) => api.get('/insights/notice-period', { params }).then((r) => r.data),
  timeToHire: (params?: Record<string, unknown>) => api.get('/insights/time-to-hire', { params }).then((r) => r.data),
  inProgress: (params?: Record<string, unknown>) => api.get('/insights/in-progress', { params }).then((r) => r.data),
  backedOut: (params?: Record<string, unknown>) => api.get('/insights/backed-out', { params }).then((r) => r.data),
  rejected: (params?: Record<string, unknown>) => api.get('/insights/rejected', { params }).then((r) => r.data),
  onHold: (params?: Record<string, unknown>) => api.get('/insights/on-hold', { params }).then((r) => r.data),
  companyLeft: (params?: Record<string, unknown>) => api.get('/insights/company-left', { params }).then((r) => r.data),
};

export const usersApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/users', { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/users/${id}`).then((r) => r.data),
  getRoles: () => api.get('/users/roles').then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/users', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
};
