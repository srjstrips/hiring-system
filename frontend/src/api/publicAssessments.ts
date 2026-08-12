import axios from 'axios';

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

export type GateCode = 'INVALID_TOKEN' | 'UNAVAILABLE' | 'COMPLETED' | 'MAX_ATTEMPTS' | 'EXPIRED';

export interface AssessmentIntro {
  assessmentName: string;
  description?: string | null;
  durationMins: number;
  questionCount: number;
  passingScore: number;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  status: string;
  hasOpenAttempt: boolean;
  expiresAt?: string | null;
}

export interface AttemptQuestion {
  id: string;
  questionText: string;
  questionType: string;
  marks: number;
  displayOrder: number;
  options: Array<{ id: string; optionText: string; displayOrder: number }>;
}

export interface AttemptPayload {
  attemptId: string;
  attemptNumber: number;
  assessmentName: string;
  durationMins: number;
  startedAt: string;
  endsAt: string;
  serverNow: string;
  remainingSeconds: number;
  questions: AttemptQuestion[];
  answers: Record<string, string>;
}

export interface AttemptStatus {
  assessmentName: string;
  assignmentStatus: string;
  attemptsUsed: number;
  maxAttempts: number;
  hasOpenAttempt: boolean;
  latestSubmission: { submittedAt: string | null; status: string } | null;
  message: string | null;
}

function gateMessage(err: any, fallback: string) {
  return err?.response?.data?.message || fallback;
}

function gateCode(err: any): GateCode | undefined {
  return err?.response?.data?.code;
}

export const publicAssessmentsApi = {
  getIntro: (token: string) =>
    publicApi.get<{ success: boolean; data: AssessmentIntro }>(`/public/assessments/t/${token}`),
  start: (token: string) =>
    publicApi.post<{ success: boolean; data: AttemptPayload }>(`/public/assessments/t/${token}/start`),
  getAttempt: (token: string) =>
    publicApi.get<{ success: boolean; data: AttemptPayload }>(`/public/assessments/t/${token}/attempt`),
  saveAnswer: (token: string, attemptQuestionId: string, selectedOptionId: string) =>
    publicApi.post(`/public/assessments/t/${token}/answers`, { attemptQuestionId, selectedOptionId }),
  saveAnswersBatch: (token: string, answers: Array<{ attemptQuestionId: string; selectedOptionId: string }>) =>
    publicApi.post(`/public/assessments/t/${token}/answers/batch`, { answers }),
  submit: (token: string) =>
    publicApi.post<{ success: boolean; data: AttemptStatus }>(`/public/assessments/t/${token}/submit`),
  getStatus: (token: string) =>
    publicApi.get<{ success: boolean; data: AttemptStatus }>(`/public/assessments/t/${token}/status`),
  gateMessage,
  gateCode,
};
