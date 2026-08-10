import { api } from './axios';

export type JobSharePlatformCode = 'LINKEDIN' | 'NAUKRI';

export interface JobSharePlatformInfo {
  platform: JobSharePlatformCode;
  displayName: string;
  integrationConfigured: boolean;
  integrationStatus: string;
  sharingStatus: 'NOT_SHARED' | 'PENDING' | 'POSTED' | 'FAILED' | 'REMOVED';
  externalJobId: string | null;
  externalJobUrl: string | null;
  errorMessage: string | null;
  sharedAt: string | null;
  updatedAt: string | null;
  sharedBy: { id: string; firstName: string; lastName: string } | null;
}

export interface JobShareContext {
  job: {
    id: string;
    title: string;
    description: string;
    descriptionSummary: string;
    department: { id: string; name: string };
    designation: { id: string; name: string };
    location: { id: string; name: string; city: string; state: string; country: string };
    employmentType: { id: string; name: string } | null;
    experienceLevel: { id: string; name: string } | null;
    closingDate: string | null;
    isPublished: boolean;
    positionStatus: string;
    isActive: boolean;
    skills: string[];
  };
  platforms: JobSharePlatformInfo[];
}

export const jobSharesApi = {
  getContext: (jobId: string) =>
    api.get<{ success: boolean; data: JobShareContext }>(`/job-shares/${jobId}`),

  getHistory: (jobId: string) =>
    api.get<{ success: boolean; data: unknown[] }>(`/job-shares/${jobId}/history`),

  share: (jobId: string, platform: JobSharePlatformCode) =>
    api.post<{
      success: boolean;
      message: string;
      data: {
        posted: boolean;
        configured: boolean;
        message: string;
        share: unknown;
      };
    }>(`/job-shares/${jobId}`, { platform }),
};
