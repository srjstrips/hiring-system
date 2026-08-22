import type { Request, Response } from 'express';
import careerService from './career.service';
import type { AlertSubscriptionDto, ApplyJobDto, PublicJobQueryDto } from './career.validator';
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

  async getRecommended(req: CandidateAuthRequest, res: Response) {
    const jobs = await careerService.getRecommendedJobs(req.candidate!.id);
    res.json({ success: true, data: jobs });
  }

  async getAlertSubscription(req: CandidateAuthRequest, res: Response) {
    const data = await careerService.getAlertSubscription(req.candidate!.id);
    res.json({ success: true, data });
  }

  async updateAlertSubscription(req: CandidateAuthRequest, res: Response) {
    const data = await careerService.updateAlertSubscription(
      req.candidate!.id,
      req.body as any as AlertSubscriptionDto
    );
    res.json({ success: true, data, message: 'Subscription updated' });
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
}

export default new CareerController();
