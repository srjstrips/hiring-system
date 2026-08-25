import { z } from 'zod';

/** Accept any non-empty string as a stage key — validated against DB at service layer */
const stageKey = z.string().min(1).max(100);

const emptyToUndefined = (v: unknown) => {
  if (v === undefined || v === null || v === '') return undefined;
  if (Array.isArray(v)) return emptyToUndefined(v[0]);
  return v;
};

const optionalUuid = z.preprocess(emptyToUndefined, z.string().uuid().optional());
const optionalStatus = z.preprocess(emptyToUndefined, stageKey.optional());
const optionalSearch = z.preprocess(emptyToUndefined, z.string().optional());

const pageParam = z.preprocess(
  emptyToUndefined,
  z.union([z.string(), z.number()]).optional().default('1'),
).transform((v) => Math.max(1, Number(v) || 1));

const limitParam = z.preprocess(
  emptyToUndefined,
  z.union([z.string(), z.number()]).optional().default('10'),
).transform((v) => Math.min(100, Math.max(1, Number(v) || 10)));

export const ApplicationQuerySchema = z.object({
  page: pageParam,
  limit: limitParam,
  jobId: optionalUuid,
  status: optionalStatus,
  search: optionalSearch,
});

export const ApplicationPipelineStatsQuerySchema = z.object({
  jobId: optionalUuid,
});

export const UpdateStatusSchema = z.object({
  status: stageKey,
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export type ApplicationQueryDto = z.infer<typeof ApplicationQuerySchema>;
export type ApplicationPipelineStatsQueryDto = z.infer<typeof ApplicationPipelineStatsQuerySchema>;
export type UpdateStatusDto = z.infer<typeof UpdateStatusSchema>;
