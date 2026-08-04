import { AppError } from '@/utils/errors';
import assessmentsRepository from './assessments.repository';
import type { CreateTemplateDto, QuestionDto, SubmitAnswersDto, UpdateTemplateDto } from './assessments.validator';

class AssessmentsService {
  async getTemplateByJobId(jobId: string) {
    const template = await assessmentsRepository.findTemplateByJobId(jobId);
    if (!template) throw new AppError('Assessment template not found for this job', 404);
    return template;
  }

  async createTemplate(data: CreateTemplateDto) {
    const existing = await assessmentsRepository.findTemplateByJobId(data.jobId);
    if (existing) throw new AppError('Assessment template already exists for this job. Update the existing one.', 409);
    return assessmentsRepository.createTemplate(data);
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

    return assessmentsRepository.submitAttempt(attempt.id, data.answers, attempt.template);
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
