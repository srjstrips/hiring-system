import { api } from './axios';

export interface EmailBranding {
  id: string;
  companyName: string;
  logoUrl?: string | null;
  primaryColor: string;
  footerText?: string | null;
  websiteUrl?: string | null;
  updatedAt: string;
}

export const emailBrandingApi = {
  get: () => api.get<{ success: boolean; data: EmailBranding }>('/email-branding'),
  update: (data: Partial<Omit<EmailBranding, 'id' | 'updatedAt'>>) =>
    api.put<{ success: boolean; data: EmailBranding }>('/email-branding', data),
};
