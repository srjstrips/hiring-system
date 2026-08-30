import type { Response } from 'express';
import type { AuthRequest } from '@/types';
import assessmentsService from './assessments.service';
import { seedTalentSignalAssessment } from './talent-signal-seeder';
import type {
  AssignCandidatesSchema,
  CreateAssessmentDto,
  CreateQuestionDto,
  CreateTemplateDto,
  QuestionDto,
  UpdateAssessmentDto,
  UpdateQuestionDto,
  UpdateTemplateDto,
} from './assessments.validator';
import { z } from 'zod';

type AssignDto = z.infer<typeof AssignCandidatesSchema>;

class AssessmentsController {
  async list(req: AuthRequest, res: Response) {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    const result = await assessmentsService.list({ page, limit, search, status, jobId });
    res.json({ success: true, ...result });
  }

  async getById(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const data = await assessmentsService.getById(id);
    res.json({ success: true, data });
  }

  async create(req: AuthRequest, res: Response) {
    const data = await assessmentsService.create(req.body as CreateAssessmentDto, req.user!.id);
    res.status(201).json({ success: true, data });
  }

  async update(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const data = await assessmentsService.update(id, req.body as UpdateAssessmentDto);
    res.json({ success: true, data });
  }

  async archive(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const data = await assessmentsService.archive(id);
    res.json({ success: true, data, message: 'Assessment archived/closed' });
  }

  async listQuestions(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const data = await assessmentsService.listQuestions(id);
    res.json({ success: true, data });
  }

  async createQuestion(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const data = await assessmentsService.createQuestion(id, req.body as CreateQuestionDto);
    res.status(201).json({ success: true, data });
  }

  async updateQuestion(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const questionId = req.params['questionId'] as string;
    const data = await assessmentsService.updateQuestion(id, questionId, req.body as UpdateQuestionDto);
    res.json({ success: true, data });
  }

  async deleteQuestion(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const questionId = req.params['questionId'] as string;
    const data = await assessmentsService.deleteQuestion(id, questionId);
    res.json({ success: true, data });
  }

  async reorderQuestions(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const orderedIds = (req.body as { orderedIds: string[] }).orderedIds;
    const data = await assessmentsService.reorderQuestions(id, orderedIds);
    res.json({ success: true, data });
  }

  async eligibleCandidates(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const data = await assessmentsService.getEligibleCandidates(id, search);
    res.json({ success: true, data });
  }

  async assignCandidates(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const data = await assessmentsService.assignCandidates(id, req.body as AssignDto, req.user!.id);
    res.status(201).json({ success: true, data });
  }

  async listAssignments(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const data = await assessmentsService.listAssignments(id);
    res.json({ success: true, data });
  }

  async getResultsDashboard(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const scoreMinRaw = req.query.scoreMin;
    const scoreMaxRaw = req.query.scoreMax;
    const filters = {
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      result: typeof req.query.result === 'string' ? req.query.result : undefined,
      dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
      scoreMin: scoreMinRaw != null && scoreMinRaw !== '' ? Number(scoreMinRaw) : undefined,
      scoreMax: scoreMaxRaw != null && scoreMaxRaw !== '' ? Number(scoreMaxRaw) : undefined,
    };
    const data = await assessmentsService.getResultsDashboard(id, filters);
    res.json({ success: true, data });
  }

  async getAssignmentResultDetail(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const assignmentId = req.params['assignmentId'] as string;
    const data = await assessmentsService.getAssignmentResultDetail(id, assignmentId);
    res.json({ success: true, data });
  }

  async resendAssignmentInvite(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const assignmentId = req.params['assignmentId'] as string;
    const data = await assessmentsService.resendAssignmentInvite(id, assignmentId);
    res.json({ success: true, data, message: 'Assessment invite resent' });
  }

  async allowRetake(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const assignmentId = req.params['assignmentId'] as string;
    const increaseMaxAttempts = Boolean((req.body as { increaseMaxAttempts?: boolean })?.increaseMaxAttempts);
    const data = await assessmentsService.allowRetake(id, assignmentId, increaseMaxAttempts);
    res.json({ success: true, data, message: 'Retake enabled for candidate' });
  }

  async createTemplate(req: AuthRequest, res: Response) {
    const template = await assessmentsService.createTemplate(req.body as CreateTemplateDto, req.user!.id);
    res.status(201).json({ success: true, data: template });
  }

  async getTemplate(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    const template = await assessmentsService.getTemplateByJobId(jobId);
    res.json({ success: true, data: template });
  }

  async updateTemplate(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    const template = await assessmentsService.updateTemplate(jobId, req.body as UpdateTemplateDto);
    res.json({ success: true, data: template });
  }

  async deleteTemplate(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    await assessmentsService.deleteTemplate(jobId);
    res.json({ success: true, message: 'Assessment template deleted' });
  }

  async saveQuestions(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    const { questions } = req.body as { questions: QuestionDto[] };
    const template = await assessmentsService.saveQuestions(jobId, questions);
    res.json({ success: true, data: template });
  }

  async getResults(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    const results = await assessmentsService.getResultsByJob(jobId);
    res.json({ success: true, data: results });
  }

  async getAttemptResult(req: AuthRequest, res: Response) {
    const applicationId = req.params['applicationId'] as string;
    const attempt = await assessmentsService.getAttemptResult(applicationId);
    res.json({ success: true, data: attempt });
  }

  async seedTalentSignal(req: AuthRequest, res: Response) {
    const id = await seedTalentSignalAssessment(req.user!.id);
    return res.status(201).json({ success: true, data: { assessmentId: id } });
  }
}

export default new AssessmentsController();
