import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api/v1') + '/career';
export const careerAxios = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } });

// Attach candidate access token to every request. Kept under distinct
// localStorage keys so it never collides with the staff session in the
// same browser.
careerAxios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('candidateAccessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — try to refresh, retry once, then bounce to login
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

careerAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(careerAxios(original));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('candidateRefreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;

        localStorage.setItem('candidateAccessToken', accessToken);
        localStorage.setItem('candidateRefreshToken', newRefresh);

        refreshQueue.forEach((cb) => cb(accessToken));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${accessToken}`;
        return careerAxios(original);
      } catch {
        localStorage.removeItem('candidateAccessToken');
        localStorage.removeItem('candidateRefreshToken');
        refreshQueue = [];
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface CandidateProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  resumeUrl?: string;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface CandidateAuthResult {
  accessToken: string;
  refreshToken: string;
  candidate: CandidateProfile;
}

export const careerApi = {
  getJobs: (params?: any) => careerAxios.get('/jobs', { params }),
  getJob: (slug: string) => careerAxios.get(`/jobs/${slug}`),
  getFilters: () => careerAxios.get('/jobs/filters'),
  getRecommended: () => careerAxios.get('/jobs/recommended'),
  getAlertSubscription: () => careerAxios.get('/alert-subscription'),
  updateAlertSubscription: (body: { subscribed: boolean }) =>
    careerAxios.put('/alert-subscription', body),
  apply: (jobId: string, formData: FormData) =>
    careerAxios.post(`/jobs/${jobId}/apply`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const candidateAuthApi = {
  async signup(dto: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    confirmPassword: string;
  }): Promise<CandidateAuthResult> {
    const { data } = await careerAxios.post<{ data: CandidateAuthResult }>('/auth/signup', dto);
    return data.data;
  },

  async login(email: string, password: string): Promise<CandidateAuthResult> {
    const { data } = await careerAxios.post<{ data: CandidateAuthResult }>('/auth/login', { email, password });
    return data.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await careerAxios.post('/auth/logout', { refreshToken });
  },

  async getMe(): Promise<CandidateProfile> {
    const { data } = await careerAxios.get<{ data: CandidateProfile }>('/auth/me');
    return data.data;
  },

  async getProfile(): Promise<CandidateFullProfile> {
    const { data } = await careerAxios.get<{ data: CandidateFullProfile }>('/auth/profile');
    return data.data;
  },

  async updateProfile(dto: Partial<CandidateFullProfile>): Promise<CandidateFullProfile> {
    const { data } = await careerAxios.put<{ data: CandidateFullProfile }>('/auth/profile', dto);
    return data.data;
  },

  async uploadResume(file: File): Promise<CandidateFullProfile> {
    const fd = new FormData();
    fd.append('resume', file);
    const { data } = await careerAxios.post<{ data: CandidateFullProfile }>('/auth/profile/resume', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async uploadPhoto(file: File): Promise<CandidateFullProfile> {
    const fd = new FormData();
    fd.append('photo', file);
    const { data } = await careerAxios.post<{ data: CandidateFullProfile }>('/auth/profile/photo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async listCertifications(): Promise<CandidateCertification[]> {
    const { data } = await careerAxios.get<{ data: CandidateCertification[] }>(
      '/auth/profile/certifications'
    );
    return data.data;
  },

  async uploadCertification(file: File, name?: string): Promise<CandidateCertification> {
    const fd = new FormData();
    fd.append('file', file);
    if (name) fd.append('name', name);
    const { data } = await careerAxios.post<{ data: CandidateCertification }>(
      '/auth/profile/certifications',
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data;
  },

  async deleteCertification(id: string): Promise<void> {
    await careerAxios.delete(`/auth/profile/certifications/${id}`);
  },

  async saveFcmToken(token: string): Promise<void> {
    await careerAxios.post('/auth/fcm-token', { token });
  },
};

export interface CandidateCertification {
  id: string;
  candidateId: string;
  name: string;
  fileUrl?: string | null;
  fileOriginalName?: string | null;
  createdAt: string;
}

export type CandidateType = 'FRESHER' | 'EXPERIENCED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface CandidateFullProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  alternatePhone?: string | null;
  whatsappNumber?: string | null;
  candidateType?: CandidateType | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  currentLocation?: string | null;
  state?: string | null;
  pincode?: string | null;
  currentAddress?: string | null;
  permanentAddress?: string | null;
  preferredLocation?: string | null;
  languagesKnown?: string | null;
  willingToRelocate?: boolean | null;
  highestQualification?: string | null;
  instituteName?: string | null;
  yearOfPassing?: number | null;
  percentageCgpa?: string | null;
  certifications?: string | null;
  currentCompany?: string | null;
  currentDesignation?: string | null;
  totalExperience?: number | null;
  currentSalary?: number | null;
  expectedSalary?: number | null;
  noticePeriodDays?: number | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  profileSummary?: string | null;
  aadharNumber?: string | null;
  panNumber?: string | null;
  resumeUrl?: string | null;
  resumeOriginalName?: string | null;
  photoUrl?: string | null;
}
