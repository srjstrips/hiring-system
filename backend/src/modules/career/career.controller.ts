import type { Request, Response } from 'express';
import careerService from './career.service';
import type { ApplyJobDto, PublicJobQueryDto } from './career.validator';
import type { CandidateAuthRequest } from '@/types';

class CareerController {
  async getJobs(req: Request, res: Response) {
    const result = await careerService.getPublicJobs(req.query as any as PublicJobQueryDto);
    res.json({ success: true, ...result });
  }

  async getJob(req: Request, res: Response) {
    const slug = req.params['slug'] as string;
    const job = await careerService.getPublicJobBySlug(slug);
    res.json({ success: true, data: job });
  }

  async getFilters(req: Request, res: Response) {
    const filters = await careerService.getFilters();
    res.json({ success: true, data: filters });
  }

  async apply(req: CandidateAuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    const resumeUrl = (req as any).file ? `/uploads/${(req as any).file.filename}` : undefined;
    const result = await careerService.applyToJob(
      req.candidate!.id,
      jobId,
      req.body as any as ApplyJobDto,
      resumeUrl
    );
    res.status(201).json({ success: true, data: result, message: 'Application submitted successfully' });
  }

  async startAssessment(req: Request, res: Response) {
    const applicationId = req.params['applicationId'] as string;
    const { candidateId } = req.body as any;
    const attempt = await careerService.startAssessment(applicationId, candidateId);
    res.json({ success: true, data: attempt });
  }

  async submitAssessment(req: Request, res: Response) {
    const applicationId = req.params['applicationId'] as string;
    const { candidateId, answers } = req.body as any;
    const result = await careerService.submitAssessment(applicationId, candidateId, answers);
    res.json({ success: true, data: result, message: 'Assessment submitted successfully' });
  }
}

export default new CareerController();
