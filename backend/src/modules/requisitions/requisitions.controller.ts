import type { Response } from 'express';
import type { AuthRequest } from '@/types';
import requisitionsService from './requisitions.service';

class RequisitionsController {
  async getAll(req: AuthRequest, res: Response) {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 20);
    const status = req.query['status'] as string | undefined;
    const approvalStatus = req.query['approvalStatus'] as string | undefined;
    const departmentId = req.query['departmentId'] as string | undefined;
    const locationId = req.query['locationId'] as string | undefined;
    const priority = req.query['priority'] as string | undefined;
    const search = req.query['search'] as string | undefined;
    const result = await requisitionsService.getAll(
      { page, limit, status, approvalStatus, departmentId, locationId, priority, search },
      req.user!.id,
      req.user!.roleName
    );
    res.json({ success: true, ...result });
  }

  async getSummary(_req: AuthRequest, res: Response) {
    const data = await requisitionsService.getSummary();
    res.json({ success: true, data });
  }

  async getById(req: AuthRequest, res: Response) {
    const data = await requisitionsService.getById(req.params['id'] as string);
    res.json({ success: true, data });
  }

  async create(req: AuthRequest, res: Response) {
    const data = await requisitionsService.create(req.body, req.user!.id);
    res.status(201).json({ success: true, data });
  }

  async update(req: AuthRequest, res: Response) {
    const data = await requisitionsService.update(req.params['id'] as string, req.body);
    res.json({ success: true, data, message: 'Requisition updated successfully' });
  }

  async submit(req: AuthRequest, res: Response) {
    const data = await requisitionsService.submitForApproval(req.params['id'] as string);
    res.json({ success: true, data, message: 'Requisition submitted for approval' });
  }

  async close(req: AuthRequest, res: Response) {
    const reason = (req.body as { reason?: string })?.reason;
    const data = await requisitionsService.close(req.params['id'] as string, reason);
    res.json({ success: true, data, message: 'Requisition closed' });
  }

  async approve(req: AuthRequest, res: Response) {
    const data = await requisitionsService.approve(req.params['id'] as string, req.user!.id, 'approve');
    res.json({ success: true, data });
  }

  async reject(req: AuthRequest, res: Response) {
    const reason = (req.body as { reason?: string })?.reason;
    const data = await requisitionsService.approve(req.params['id'] as string, req.user!.id, 'reject', reason);
    res.json({ success: true, data });
  }
}

export default new RequisitionsController();
