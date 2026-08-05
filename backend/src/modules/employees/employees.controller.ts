import type { Response } from 'express';
import type { AuthRequest } from '@/types';
import employeesService from './employees.service';

class EmployeesController {
  async getAll(req: AuthRequest, res: Response) {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 20);
    const status = req.query['status'] as string | undefined;
    const noticeStatus = req.query['noticeStatus'] as string | undefined;
    const departmentId = req.query['departmentId'] as string | undefined;
    const search = req.query['search'] as string | undefined;
    const result = await employeesService.getAll(
      { page, limit, status, noticeStatus, departmentId, search },
      req.user!.id,
      req.user!.roleName
    );
    res.json({ success: true, ...result });
  }

  async getById(req: AuthRequest, res: Response) {
    const data = await employeesService.getById(req.params['id'] as string);
    res.json({ success: true, data });
  }

  async createFromOffer(req: AuthRequest, res: Response) {
    const data = await employeesService.createFromOffer(req.params['offerId'] as string);
    res.status(201).json({ success: true, data, message: 'Employee record created' });
  }

  async updateStatus(req: AuthRequest, res: Response) {
    const data = await employeesService.updateStatus(req.params['id'] as string, req.body as any);
    res.json({ success: true, data, message: 'Employee updated' });
  }
}

export default new EmployeesController();
