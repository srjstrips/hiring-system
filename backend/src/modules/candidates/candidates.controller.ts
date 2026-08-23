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

  async delete(req: AuthRequest, res: Response) {
    await candidatesService.delete(req.params['id'] as string);
    res.json({ success: true, message: 'Candidate deleted' });
  }

  async exportExcel(req: AuthRequest, res: Response) {
    const buffer = await candidatesService.exportExcel(req.query as unknown as any);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="candidates.xlsx"');
    res.send(buffer);
  }
}

export default new CandidatesController();
