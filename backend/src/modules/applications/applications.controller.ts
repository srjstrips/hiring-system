import type { Response } from 'express';
import type { AuthRequest } from '@/types';
import applicationsService from './applications.service';
import type { ApplicationQueryDto, UpdateStatusDto } from './applications.validator';

class ApplicationsController {
  async getAll(req: AuthRequest, res: Response) {
    const result = await applicationsService.getAll(req.query as any as ApplicationQueryDto);
    res.json({ success: true, ...result });
  }

  async getById(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const app = await applicationsService.getById(id);
    res.json({ success: true, data: app });
  }

  async updateStatus(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const app = await applicationsService.updateStatus(id, req.body as any as UpdateStatusDto, req.user!.id);
    res.json({ success: true, data: app, message: 'Status updated' });
  }

  async getPipelineStats(req: AuthRequest, res: Response) {
    const jobId = req.query['jobId'] as string | undefined;
    const stats = await applicationsService.getPipelineStats(jobId);
    res.json({ success: true, data: stats });
  }
}

export default new ApplicationsController();
