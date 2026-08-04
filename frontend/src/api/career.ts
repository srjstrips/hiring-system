import axios from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api/v1') + '/career';
const careerAxios = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } });

export const careerApi = {
  getJobs: (params?: any) => careerAxios.get('/jobs', { params }),
  getJob: (slug: string) => careerAxios.get(`/jobs/${slug}`),
  getFilters: () => careerAxios.get('/jobs/filters'),
  apply: (jobId: string, formData: FormData) =>
    careerAxios.post(`/jobs/${jobId}/apply`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  startAssessment: (applicationId: string, candidateId: string) =>
    careerAxios.post(`/applications/${applicationId}/assessment/start`, { candidateId }),
  submitAssessment: (applicationId: string, candidateId: string, answers: any[]) =>
    careerAxios.post(`/applications/${applicationId}/assessment/submit`, { candidateId, answers }),
};
