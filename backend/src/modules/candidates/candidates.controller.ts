import type { Response } from 'express';
import type { AuthRequest } from '@/types';
import candidatesService from './candidates.service';
import type { CandidateQueryDto } from './candidates.validator';

class CandidatesController {
  async getAll(req: AuthRequest, res: Response) {
    const result = await candidatesService.getAll(req.query as unknown as CandidateQueryDto);
    res.json({ success: true, ...result });
  }

  async getById(req: AuthRequest, res: Response) {
    const data = await candidatesService.getById(req.params['id'] as string);
    res.json({ success: true, data });
  }
}

export default new CandidatesController();
