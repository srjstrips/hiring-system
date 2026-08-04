import { api } from './axios';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const emailTemplatesApi = {
  getAll: () => api.get<{ success: boolean; data: EmailTemplate[] }>('/email-templates'),
  getById: (id: string) => api.get<{ success: boolean; data: EmailTemplate }>(`/email-templates/${id}`),
  create: (data: Omit<EmailTemplate, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>) =>
    api.post<{ success: boolean; data: EmailTemplate }>('/email-templates', data),
  update: (id: string, data: Partial<EmailTemplate>) =>
    api.put<{ success: boolean; data: EmailTemplate }>(`/email-templates/${id}`, data),
  delete: (id: string) => api.delete(`/email-templates/${id}`),
  sendForApplication: (applicationId: string, payload: {
    templateId: string;
    toEmail?: string;
    extraVariables?: Record<string, string>;
    previewOnly?: boolean;
  }) => api.post<{ success: boolean; data: any }>(`/applications/${applicationId}/send-email`, payload),
};
