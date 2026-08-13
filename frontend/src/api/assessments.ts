import { api } from './axios';

export type AssessmentStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export interface AssessmentOption {
  id?: string;
  optionText: string;
  isCorrect?: boolean;
  displayOrder?: number;
}

export interface AssessmentQuestion {
  id: string;
  assessmentId?: string;
  questionText: string;
  questionType: string;
  marks: number;
  displayOrder: number;
  orderIndex?: number;
  isActive: boolean;
  explanation?: string | null;
  options?: string[];
  optionItems?: AssessmentOption[];
  correctAnswer?: string | null;
}

export interface Assessment {
  id: string;
  name: string;
  description?: string | null;
  jobId: string;
  designationId?: string | null;
  durationMins: number;
  passingScore: number;
  maxAttempts: number;
  startAt?: string | null;
  endAt?: string | null;
  status: AssessmentStatus;
  createdAt: string;
  updatedAt?: string;
  job?: { id: string; title: string };
  designation?: { id: string; name: string } | null;
  createdBy?: { id: string; firstName: string; lastName: string };
  questionCount?: number;
  candidatesAssigned?: number;
  candidatesCompleted?: number;
  candidatesPending?: number;
  averageScore?: number | null;
  questions?: AssessmentQuestion[];
  _count?: { questions: number; assignments: number };
}

export interface EligibleApplication {
  id: string;
  appliedAt: string;
  status: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    totalExperience?: number | null;
  };
}

export interface AssessmentAssignment {
  id: string;
  status: string;
  assignedAt: string;
  secureToken: string;
  maxAttempts: number;
  assessmentUrl?: string;
  candidate: EligibleApplication['candidate'];
  application: { id: string; appliedAt: string; status: string };
  assignedBy?: { id: string; firstName: string; lastName: string };
}

// Legacy template shape for AssessmentBuilderPage
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
  getAll: (params?: Record<string, unknown>) =>
    api.get<{ success: boolean; data: Assessment[]; total: number }>('/assessments', { params }),
  getById: (id: string) =>
    api.get<{ success: boolean; data: Assessment }>(`/assessments/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: Assessment }>('/assessments', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<{ success: boolean; data: Assessment }>(`/assessments/${id}`, data),
  archive: (id: string) =>
    api.delete<{ success: boolean; data: Assessment }>(`/assessments/${id}`),

  getQuestions: (id: string) =>
    api.get<{ success: boolean; data: AssessmentQuestion[] }>(`/assessments/${id}/questions`),
  createQuestion: (id: string, data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: AssessmentQuestion }>(`/assessments/${id}/questions`, data),
  updateQuestion: (id: string, questionId: string, data: Record<string, unknown>) =>
    api.put<{ success: boolean; data: AssessmentQuestion }>(`/assessments/${id}/questions/${questionId}`, data),
  deleteQuestion: (id: string, questionId: string) =>
    api.delete(`/assessments/${id}/questions/${questionId}`),
  reorderQuestions: (id: string, orderedIds: string[]) =>
    api.put(`/assessments/${id}/questions/reorder`, { orderedIds }),

  getEligibleCandidates: (id: string, params?: { search?: string }) =>
    api.get<{ success: boolean; data: EligibleApplication[] }>(`/assessments/${id}/eligible-candidates`, { params }),
  assignCandidates: (id: string, applicationIds: string[]) =>
    api.post<{ success: boolean; data: AssessmentAssignment[] }>(`/assessments/${id}/assign`, { applicationIds }),
  getAssignments: (id: string) =>
    api.get<{ success: boolean; data: AssessmentAssignment[] }>(`/assessments/${id}/assignments`),

  getResultsDashboard: (id: string, params?: Record<string, unknown>) =>
    api.get<{ success: boolean; data: AssessmentResultsDashboard }>(`/assessments/${id}/results`, { params }),
  getAssignmentResult: (id: string, assignmentId: string) =>
    api.get<{ success: boolean; data: AssignmentResultDetail }>(
      `/assessments/${id}/assignments/${assignmentId}/result`
    ),
  getRecordingViewUrl: (assessmentId: string, recordingId: string) =>
    api.get<{
      success: boolean;
      data: {
        url: string;
        expiresInSeconds: number;
        mimeType?: string | null;
        recordingType: string;
        provider: string;
      };
    }>(`/assessments/${assessmentId}/recordings/${recordingId}/view-url`),
  resendInvite: (id: string, assignmentId: string) =>
    api.post<{ success: boolean; data: { assessmentUrl: string; email: string }; message?: string }>(
      `/assessments/${id}/assignments/${assignmentId}/resend`
    ),
  allowRetake: (id: string, assignmentId: string, increaseMaxAttempts = false) =>
    api.post<{ success: boolean; data: AssessmentAssignment; message?: string }>(
      `/assessments/${id}/assignments/${assignmentId}/retake`,
      { increaseMaxAttempts }
    ),

  // Legacy
  createTemplate: (data: any) => api.post<{ success: boolean; data: AssessmentTemplate }>('/assessments/templates', data),
  getTemplate: (jobId: string) => api.get<{ success: boolean; data: AssessmentTemplate }>(`/assessments/jobs/${jobId}/template`),
  updateTemplate: (jobId: string, data: any) => api.put(`/assessments/jobs/${jobId}/template`, data),
  deleteTemplate: (jobId: string) => api.delete(`/assessments/jobs/${jobId}/template`),
  saveQuestions: (jobId: string, questions: any[]) => api.put(`/assessments/jobs/${jobId}/questions`, { questions }),
  getResults: (jobId: string) => api.get<{ success: boolean; data: any[] }>(`/assessments/jobs/${jobId}/results`),
  getAttemptResult: (applicationId: string) => api.get(`/assessments/applications/${applicationId}/result`),
};

export interface AssessmentResultsSummary {
  totalAssigned: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  passed: number;
  failed: number;
  expired: number;
}

export interface AssessmentResultRow {
  assignmentId: string;
  status: string;
  assignedAt: string;
  maxAttempts: number;
  assessmentUrl?: string;
  candidate: { id: string; firstName: string; lastName: string; email: string };
  application: { id: string; appliedAt: string; status: string };
  job?: { id: string; title: string };
  attemptCount: number;
  latestAttemptNumber: number | null;
  score: number | null;
  totalMarks: number | null;
  percentage: number | null;
  result: 'PASSED' | 'FAILED' | null;
  isPassed: boolean | null;
  startedAt: string | null;
  completedAt: string | null;
  timeTakenSeconds: number | null;
  canRetake: boolean;
  canIncreaseAttempts?: boolean;
  attemptsRemaining: number;
}

export interface AssessmentResultsDashboard {
  assessment: {
    id: string;
    name: string;
    status: AssessmentStatus;
    durationMins: number;
    passingScore: number;
    maxAttempts: number;
    job?: { id: string; title: string };
  };
  summary: AssessmentResultsSummary;
  rows: AssessmentResultRow[];
}

export interface AssignmentResultQuestion {
  number: number;
  attemptQuestionId: string;
  questionText: string;
  questionType: string;
  marks: number;
  marksGiven: number;
  outcome: 'CORRECT' | 'INCORRECT' | 'UNANSWERED';
  candidateAnswer: string | null;
  correctAnswer: string | null;
  options: Array<{
    id: string;
    optionText: string;
    isCorrect: boolean;
    isSelected: boolean;
    displayOrder: number;
  }>;
}

export interface AssignmentResultAttempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  completedAt: string | null;
  isTimedOut: boolean;
  timeTakenSeconds: number | null;
  totalMarks: number | null;
  obtainedMarks: number | null;
  percentage: number | null;
  isPassed: boolean | null;
  result: 'PASSED' | 'FAILED' | null;
  isLatest: boolean;
  questions: AssignmentResultQuestion[];
  recordings?: Array<{
    id: string;
    recordingType: 'CAMERA' | 'SCREEN' | string;
    mimeType?: string | null;
    fileSize?: number | null;
    durationSeconds?: number | null;
    status: string;
    startedAt?: string | null;
    endedAt?: string | null;
    failureReason?: string | null;
  }>;
}

export interface AssignmentResultDetail {
  assignment: {
    id: string;
    status: string;
    maxAttempts: number;
    assignedAt: string;
    assessmentUrl?: string;
    canRetake: boolean;
    canIncreaseAttempts?: boolean;
    attemptsRemaining: number;
  };
  assessment: {
    id: string;
    name: string;
    passingScore: number;
    durationMins: number;
    maxAttempts: number;
    status: AssessmentStatus;
  };
  candidate: { id: string; firstName: string; lastName: string; email: string; phone?: string | null };
  application: { id: string; appliedAt: string; status: string };
  job?: { id: string; title: string };
  passingPercentage: number;
  attempts: AssignmentResultAttempt[];
  latestAttempt: AssignmentResultAttempt | null;
}
