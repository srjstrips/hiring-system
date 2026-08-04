import type { Response } from 'express';
import type { AuthRequest } from '@/types';
import assessmentsService from './assessments.service';
import type { CreateTemplateDto, QuestionDto, UpdateTemplateDto } from './assessments.validator';

class AssessmentsController {
  async createTemplate(req: AuthRequest, res: Response) {
    const template = await assessmentsService.createTemplate(req.body as any as CreateTemplateDto);
    res.status(201).json({ success: true, data: template });
  }

  async getTemplate(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    const template = await assessmentsService.getTemplateByJobId(jobId);
    res.json({ success: true, data: template });
  }

  async updateTemplate(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    const template = await assessmentsService.updateTemplate(jobId, req.body as any as UpdateTemplateDto);
    res.json({ success: true, data: template });
  }

  async deleteTemplate(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    await assessmentsService.deleteTemplate(jobId);
    res.json({ success: true, message: 'Assessment template deleted' });
  }

  async saveQuestions(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    const { questions } = req.body as any as { questions: QuestionDto[] };
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
}

export default new AssessmentsController();
