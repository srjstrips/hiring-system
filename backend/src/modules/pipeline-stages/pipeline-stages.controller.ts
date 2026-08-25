import { Response } from 'express';
import { prisma } from '@/config/database';
import { ApiResponse } from '@/utils/response';
import { asyncHandler } from '@/utils/asyncHandler';
import { AppError } from '@/utils/errors';
import { clearPipelineCache } from '@/modules/applications/stage-order';
import type { AuthRequest } from '@/types';

export const getAll = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const stages = await prisma.pipelineStage.findMany({ orderBy: { stageOrder: 'asc' } });
  return ApiResponse.success(res, stages);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { key, label, color, type, stageOrder } = req.body as {
    key: string; label: string; color?: string; type?: string; stageOrder: number;
  };
  if (!key || !label || stageOrder == null) throw new AppError('key, label and stageOrder are required', 400);

  const keyFormatted = key.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
  const existing = await prisma.pipelineStage.findUnique({ where: { key: keyFormatted } });
  if (existing) throw new AppError('A stage with this key already exists', 409);

  const stage = await prisma.pipelineStage.create({
    data: { key: keyFormatted, label, color: color || '#6b7280', type: type || 'CUSTOM', stageOrder, isFixed: false },
  });
  clearPipelineCache();
  return ApiResponse.success(res, stage, 'Stage created', 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { key } = req.params as { key: string };
  const stage = await prisma.pipelineStage.findUnique({ where: { key } });
  if (!stage) throw new AppError('Stage not found', 404);

  const { label, color, type, stageOrder, isActive } = req.body as {
    label?: string; color?: string; type?: string; stageOrder?: number; isActive?: boolean;
  };

  const updated = await prisma.pipelineStage.update({
    where: { key },
    data: {
      ...(label !== undefined && { label }),
      ...(color !== undefined && { color }),
      // Fixed stages: allow label/color but not type/order changes
      ...(!stage.isFixed && type !== undefined && { type }),
      ...(!stage.isFixed && stageOrder !== undefined && { stageOrder }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  clearPipelineCache();
  return ApiResponse.success(res, updated, 'Stage updated');
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { key } = req.params as { key: string };
  const stage = await prisma.pipelineStage.findUnique({ where: { key } });
  if (!stage) throw new AppError('Stage not found', 404);
  if (stage.isFixed) throw new AppError('Fixed stages cannot be deleted', 400);

  const inUse = await prisma.application.count({ where: { status: key } });
  if (inUse > 0) throw new AppError(`Cannot delete — ${inUse} application(s) are in this stage`, 400);

  await prisma.pipelineStage.delete({ where: { key } });
  clearPipelineCache();
  return ApiResponse.success(res, null, 'Stage deleted');
});

export const reorder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { order } = req.body as { order: { key: string; stageOrder: number }[] };
  if (!Array.isArray(order)) throw new AppError('order must be an array', 400);

  await prisma.$transaction(
    order.map(({ key, stageOrder }) =>
      prisma.pipelineStage.update({ where: { key }, data: { stageOrder } })
    )
  );
  clearPipelineCache();
  return ApiResponse.success(res, null, 'Order saved');
});
