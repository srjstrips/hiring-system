import type { Response } from 'express';
import type { AuthRequest } from '@/types';
import requisitionsService from './requisitions.service';

class RequisitionsController {
  async getAll(req: AuthRequest, res: Response) {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 20);
    const status = req.query['status'] as string | undefined;
    const departmentId = req.query['departmentId'] as string | undefined;
    const search = req.query['search'] as string | undefined;
    const result = await requisitionsService.getAll({ page, limit, status, departmentId, search });
    res.json({ success: true, ...result });
  }

  async getById(req: AuthRequest, res: Response) {
    const data = await requisitionsService.getById(req.params['id'] as string);
    res.json({ success: true, data });
  }

  async create(req: AuthRequest, res: Response) {
    const data = await requisitionsService.create(req.body, req.user!.id);
    res.status(201).json({ success: true, data });
  }

  async approve(req: AuthRequest, res: Response) {
    const data = await requisitionsService.approve(req.params['id'] as string, req.user!.id, 'approve');
    res.json({ success: true, data });
  }

  async reject(req: AuthRequest, res: Response) {
    const data = await requisitionsService.approve(req.params['id'] as string, req.user!.id, 'reject', req.body?.reason);
    res.json({ success: true, data });
  }
}

export default new RequisitionsController();
