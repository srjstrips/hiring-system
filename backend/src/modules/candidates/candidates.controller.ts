import type { Response } from 'express';
import type { AuthRequest } from '@/types';
import candidatesService from './candidates.service';

class CandidatesController {
  async getAll(req: AuthRequest, res: Response) {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 20);
    const search = req.query['search'] as string | undefined;
    const result = await candidatesService.getAll({ page, limit, search });
    res.json({ success: true, ...result });
  }

  async getById(req: AuthRequest, res: Response) {
    const data = await candidatesService.getById(req.params['id'] as string);
    res.json({ success: true, data });
  }
}

export default new CandidatesController();
