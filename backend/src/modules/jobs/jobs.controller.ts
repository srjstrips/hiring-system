import type { Response } from 'express';
import type { AuthRequest } from '@/types';
import jobsService from './jobs.service';
import type { CreateJobDto, JobQueryDto } from './jobs.validator';

class JobsController {
  async getAll(req: AuthRequest, res: Response) {
    const result = await jobsService.getAll(req.query as any as JobQueryDto, req.user!.id, req.user!.roleName);
    res.json({ success: true, ...result });
  }

  async getById(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const job = await jobsService.getById(id);
    res.json({ success: true, data: job });
  }

  async create(req: AuthRequest, res: Response) {
    const job = await jobsService.create(req.body as any as CreateJobDto, req.user!.id);
    res.status(201).json({ success: true, data: job, message: 'Job created successfully' });
  }

  async update(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    const job = await jobsService.update(id, req.body as any, req.user!.id);
    res.json({ success: true, data: job, message: 'Job updated successfully' });
  }

  async publish(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    await jobsService.publish(id, req.user!.id);
    res.json({ success: true, message: 'Job published successfully' });
  }

  async unpublish(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    await jobsService.unpublish(id, req.user!.id);
    res.json({ success: true, message: 'Job unpublished successfully' });
  }

  async delete(req: AuthRequest, res: Response) {
    const id = req.params['id'] as string;
    await jobsService.delete(id);
    res.json({ success: true, message: 'Job deleted successfully' });
  }

  async getOpenPositions(req: AuthRequest, res: Response) {
    const result = await jobsService.getOpenPositions(req.query, req.user!.id, req.user!.roleName);
    res.json({ success: true, ...result });
  }
}

export default new JobsController();
