import { Request, Response } from 'express';
import { MasterService } from './master.service';
import { ApiResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

/**
 * Generic controller factory for master data modules.
 * Eliminates repeating the same CRUD controller code for each entity.
 */
export class MasterController<T extends { id: string }> {
  constructor(private readonly service: MasterService<T>) {}

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.findAll(req.query as any);
    return ApiResponse.paginated(res, result.data, result.pagination);
  });

  getAllActive = asyncHandler(async (_req: Request, res: Response) => {
    const data = await this.service.findAllActive();
    return ApiResponse.success(res, data);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const record = await this.service.findById(req.params['id'] as string);
    return ApiResponse.success(res, record);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const record = await this.service.create(req.body as any);
    return ApiResponse.created(res, record);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const record = await this.service.update(req.params['id'] as string, req.body as any);
    return ApiResponse.success(res, record, 'Updated successfully');
  });

  toggleActive = asyncHandler(async (req: Request, res: Response) => {
    const record = await this.service.toggleActive(req.params['id'] as string, req.body as any);
    return ApiResponse.success(res, record, 'Status updated');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.service.delete(req.params['id'] as string);
    return ApiResponse.success(res, null, 'Deleted successfully');
  });
}
