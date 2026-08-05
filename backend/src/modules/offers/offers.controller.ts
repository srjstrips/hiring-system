import type { Response } from 'express';
import type { AuthRequest } from '@/types';
import offersService from './offers.service';

class OffersController {
  async getAll(req: AuthRequest, res: Response) {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 20);
    const status = req.query['status'] as string | undefined;
    const departmentId = req.query['departmentId'] as string | undefined;
    const search = req.query['search'] as string | undefined;
    const result = await offersService.getAll(
      { page, limit, status, departmentId, search },
      req.user!.id,
      req.user!.roleName
    );
    res.json({ success: true, ...result });
  }

  async getById(req: AuthRequest, res: Response) {
    const data = await offersService.getById(req.params['id'] as string);
    res.json({ success: true, data });
  }

  async create(req: AuthRequest, res: Response) {
    const data = await offersService.create(req.body, req.user!.id);
    res.status(201).json({ success: true, data });
  }

  async update(req: AuthRequest, res: Response) {
    const data = await offersService.update(req.params['id'] as string, req.body);
    res.json({ success: true, data });
  }

  async send(req: AuthRequest, res: Response) {
    const data = await offersService.send(req.params['id'] as string);
    res.json({ success: true, data });
  }

  async accept(req: AuthRequest, res: Response) {
    const data = await offersService.updateResponse(req.params['id'] as string, 'accept');
    res.json({ success: true, data });
  }

  async reject(req: AuthRequest, res: Response) {
    const reason = (req.body as { reason?: string })?.reason;
    const data = await offersService.updateResponse(req.params['id'] as string, 'reject', reason);
    res.json({ success: true, data });
  }

  async getSummary(req: AuthRequest, res: Response) {
    const data = await offersService.getSummary(req.query, req.user!.id, req.user!.roleName);
    res.json({ success: true, data });
  }
}

export default new OffersController();
