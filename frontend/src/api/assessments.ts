import { api } from './axios';

export interface AssessmentQuestion {
  id: string;
  questionText: string;
  questionType: 'MCQ' | 'TEXT' | 'TRUE_FALSE';
  options?: string[];
  correctAnswer?: string;
  marks: number;
  orderIndex: number;
  explanation?: string;
}

export interface AssessmentTemplate {
  id: string;
  jobId: string;
  title: string;
  description?: string;
  durationMins: number;
  passingScore: number;
  isActive: boolean;
  questions: AssessmentQuestion[];
}

export const assessmentsApi = {
  createTemplate: (data: any) => api.post<{ success: boolean; data: AssessmentTemplate }>('/assessments/templates', data),
  getTemplate: (jobId: string) => api.get<{ success: boolean; data: AssessmentTemplate }>(`/assessments/jobs/${jobId}/template`),
  updateTemplate: (jobId: string, data: any) => api.put(`/assessments/jobs/${jobId}/template`, data),
  deleteTemplate: (jobId: string) => api.delete(`/assessments/jobs/${jobId}/template`),
  saveQuestions: (jobId: string, questions: any[]) => api.put(`/assessments/jobs/${jobId}/questions`, { questions }),
  getResults: (jobId: string) => api.get<{ success: boolean; data: any[] }>(`/assessments/jobs/${jobId}/results`),
  getAttemptResult: (applicationId: string) => api.get(`/assessments/applications/${applicationId}/result`),
};
