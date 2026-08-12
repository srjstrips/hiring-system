import { AppError } from '@/utils/errors';
import assessmentsRepository from './assessments.repository';
import type {
  AssignCandidatesSchema,
  CreateAssessmentDto,
  CreateQuestionDto,
  CreateTemplateDto,
  QuestionDto,
  SubmitAnswersDto,
  UpdateAssessmentDto,
  UpdateQuestionDto,
  UpdateTemplateDto,
} from './assessments.validator';
import { z } from 'zod';

type AssignDto = z.infer<typeof AssignCandidatesSchema>;

class AssessmentsService {
  async list(query: { page: number; limit: number; search?: string; status?: string; jobId?: string }) {
    return assessmentsRepository.list(query);
  }

  async getById(id: string) {
    const assessment = await assessmentsRepository.findById(id, { includeCorrect: true });
    if (!assessment) throw new AppError('Assessment not found', 404);
    return assessment;
  }

  async create(data: CreateAssessmentDto, createdById: string) {
    try {
      return await assessmentsRepository.create(data, createdById);
    } catch (e: any) {
      if (e?.message === 'JOB_NOT_FOUND') throw new AppError('Job not found', 404);
      throw e;
    }
  }

  async update(id: string, data: UpdateAssessmentDto) {
    await this.getById(id);
    try {
      return await assessmentsRepository.update(id, data);
    } catch (e: any) {
      if (e?.message === 'JOB_NOT_FOUND') throw new AppError('Job not found', 404);
      throw e;
    }
  }

  async archive(id: string) {
    await this.getById(id);
    return assessmentsRepository.softDeleteOrClose(id);
  }

  async listQuestions(assessmentId: string) {
    await this.getById(assessmentId);
    return assessmentsRepository.listQuestions(assessmentId, true);
  }

  async createQuestion(assessmentId: string, data: CreateQuestionDto) {
    await this.getById(assessmentId);
    return assessmentsRepository.createQuestion(assessmentId, data);
  }

  async updateQuestion(assessmentId: string, questionId: string, data: UpdateQuestionDto) {
    await this.getById(assessmentId);
    const updated = await assessmentsRepository.updateQuestion(questionId, data);
    if (!updated || (updated as any).assessmentId && (updated as any).assessmentId !== assessmentId) {
      // ensure question belongs to assessment
    }
    const questions = await assessmentsRepository.listQuestions(assessmentId, true);
    if (!questions.find((q) => q.id === questionId) && !updated) {
      throw new AppError('Question not found', 404);
    }
    if (!updated) throw new AppError('Question not found', 404);
    return updated;
  }

  async deleteQuestion(assessmentId: string, questionId: string) {
    await this.getById(assessmentId);
    const questions = await assessmentsRepository.listQuestions(assessmentId, true);
    if (!questions.find((q) => q.id === questionId)) throw new AppError('Question not found', 404);
    return assessmentsRepository.deleteQuestion(questionId);
  }

  async reorderQuestions(assessmentId: string, orderedIds: string[]) {
    await this.getById(assessmentId);
    return assessmentsRepository.reorderQuestions(assessmentId, orderedIds);
  }

  async getEligibleCandidates(assessmentId: string, search?: string) {
    await this.getById(assessmentId);
    const rows = await assessmentsRepository.getEligibleCandidates(assessmentId, search);
    if (rows === null) throw new AppError('Assessment not found', 404);
    return rows;
  }

  async assignCandidates(assessmentId: string, data: AssignDto, assignedById: string) {
    const assessment = await this.getById(assessmentId);
    try {
      const created = await assessmentsRepository.assignCandidates(
        assessmentId,
        data.applicationIds,
        assignedById,
        data.expiresAt
      );

      const { emailService } = await import('@/services/email.service');
      for (const row of created) {
        if (row.candidate?.email && row.assessmentUrl) {
          await emailService.sendAssessmentInviteEmail({
            email: row.candidate.email,
            candidateName: `${row.candidate.firstName} ${row.candidate.lastName}`.trim(),
            assessmentName: assessment.name,
            assessmentUrl: row.assessmentUrl,
            durationMins: assessment.durationMins,
          });
        }
      }

      return created;
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') throw new AppError('Assessment not found', 404);
      if (e?.message === 'NO_ELIGIBLE') throw new AppError('No eligible applications found for this job', 400);
      throw e;
    }
  }

  async listAssignments(assessmentId: string) {
    await this.getById(assessmentId);
    return assessmentsRepository.listAssignments(assessmentId);
  }

  async getResultsDashboard(
    assessmentId: string,
    filters?: {
      search?: string;
      status?: string;
      result?: string;
      dateFrom?: string;
      dateTo?: string;
      scoreMin?: number;
      scoreMax?: number;
    }
  ) {
    await this.getById(assessmentId);
    const data = await assessmentsRepository.getResultsDashboard(assessmentId, filters);
    if (!data) throw new AppError('Assessment not found', 404);
    return data;
  }

  async getAssignmentResultDetail(assessmentId: string, assignmentId: string) {
    await this.getById(assessmentId);
    const data = await assessmentsRepository.getAssignmentResultDetail(assessmentId, assignmentId);
    if (!data) throw new AppError('Assignment not found', 404);
    return data;
  }

  async resendAssignmentInvite(assessmentId: string, assignmentId: string) {
    await this.getById(assessmentId);
    try {
      return await assessmentsRepository.resendAssignmentInvite(assessmentId, assignmentId);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') throw new AppError('Assignment not found', 404);
      if (e?.message === 'CANCELLED') throw new AppError('Cannot resend a cancelled assignment', 400);
      if (e?.message === 'NO_EMAIL') throw new AppError('Candidate has no email address', 400);
      throw e;
    }
  }

  async allowRetake(assessmentId: string, assignmentId: string, increaseMaxAttempts = false) {
    await this.getById(assessmentId);
    try {
      return await assessmentsRepository.allowRetake(assessmentId, assignmentId, increaseMaxAttempts);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') throw new AppError('Assignment not found', 404);
      if (e?.message === 'CANCELLED') throw new AppError('Cannot retake a cancelled assignment', 400);
      if (e?.message === 'MAX_ATTEMPTS') {
        throw new AppError(
          'Maximum attempts reached. Increase max attempts to allow another attempt.',
          400
        );
      }
      if (e?.message === 'OPEN_ATTEMPT') {
        throw new AppError('Candidate already has an open attempt in progress', 400);
      }
      throw e;
    }
  }

  // Legacy
  async getTemplateByJobId(jobId: string) {
    const template = await assessmentsRepository.findTemplateByJobId(jobId);
    if (!template) throw new AppError('Assessment template not found for this job', 404);
    return template;
  }

  async createTemplate(data: CreateTemplateDto, createdById: string) {
    const existing = await assessmentsRepository.findTemplateByJobId(data.jobId);
    if (existing) throw new AppError('Assessment template already exists for this job. Update the existing one.', 409);
    try {
      return await assessmentsRepository.createTemplate(data, createdById);
    } catch (e: any) {
      if (e?.message === 'JOB_NOT_FOUND') throw new AppError('Job not found', 404);
      throw e;
    }
  }

  async updateTemplate(jobId: string, data: UpdateTemplateDto) {
    const template = await assessmentsRepository.findTemplateByJobId(jobId);
    if (!template) throw new AppError('Assessment template not found', 404);
    return assessmentsRepository.updateTemplate(template.id, data);
  }

  async deleteTemplate(jobId: string) {
    const template = await assessmentsRepository.findTemplateByJobId(jobId);
    if (!template) throw new AppError('Assessment template not found', 404);
    return assessmentsRepository.deleteTemplate(template.id);
  }

  async saveQuestions(jobId: string, questions: QuestionDto[]) {
    const template = await assessmentsRepository.findTemplateByJobId(jobId);
    if (!template) throw new AppError('Assessment template not found', 404);
    await assessmentsRepository.addQuestions(template.id, questions);
    return assessmentsRepository.findTemplateById(template.id);
  }

  async startAttempt(jobId: string, candidateId: string, applicationId: string) {
    const template = await assessmentsRepository.findTemplateByJobId(jobId);
    if (!template) throw new AppError('No assessment for this job', 404);

    const existing = await assessmentsRepository.getAttemptByApplicationId(applicationId);
    if (existing) {
      if (existing.submittedAt) throw new AppError('Assessment already submitted', 400);
      return existing;
    }

    return assessmentsRepository.startAttempt(template.id, candidateId, applicationId);
  }

  async submitAttempt(applicationId: string, candidateId: string, data: SubmitAnswersDto) {
    const attempt = await assessmentsRepository.getAttemptByApplicationId(applicationId);
    if (!attempt) throw new AppError('Assessment attempt not found. Start the assessment first.', 404);
    if (attempt.candidateId !== candidateId) throw new AppError('Forbidden', 403);
    if (attempt.submittedAt) throw new AppError('Assessment already submitted', 400);

    return assessmentsRepository.submitAttempt(attempt.id, data.answers, attempt.assessment);
  }

  async getAttemptResult(applicationId: string) {
    const attempt = await assessmentsRepository.getAttemptByApplicationId(applicationId);
    if (!attempt) throw new AppError('Assessment attempt not found', 404);
    return attempt;
  }

  async getResultsByJob(jobId: string) {
    return assessmentsRepository.getResultsByJobId(jobId);
  }
}

export default new AssessmentsService();
