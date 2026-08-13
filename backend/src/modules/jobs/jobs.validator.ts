import { z } from 'zod';

const emptyToUndefined = (v: unknown) => {
  if (v === undefined || v === null || v === '') return undefined;
  if (Array.isArray(v)) return emptyToUndefined(v[0]);
  return v;
};

const optionalUuid = z.preprocess(emptyToUndefined, z.string().uuid().optional());
const optionalText = z.preprocess(emptyToUndefined, z.string().optional());
const optionalIsoDate = z.preprocess((v) => {
  const value = emptyToUndefined(v);
  if (value === undefined) return undefined;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00.000Z`).toISOString();
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return s;
  return parsed.toISOString();
}, z.string().datetime().optional());

const optionalPositiveNumber = z.preprocess((v) => {
  const value = emptyToUndefined(v);
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}, z.number().positive().optional());

const pageParam = z.preprocess(
  emptyToUndefined,
  z.union([z.string(), z.number()]).optional().default('1'),
).transform((v) => Math.max(1, Number(v) || 1));

const limitParam = z.preprocess(
  emptyToUndefined,
  z.union([z.string(), z.number()]).optional().default('10'),
).transform((v) => Math.min(100, Math.max(1, Number(v) || 10)));

const optionalBoolQuery = z.preprocess((v) => {
  const value = emptyToUndefined(v);
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  return String(value) === 'true';
}, z.boolean().optional());

export const CreateJobSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  departmentId: z.string().uuid('Select a department'),
  designationId: z.string().uuid('Select a designation'),
  locationId: z.string().uuid('Select a location'),
  employmentTypeId: optionalUuid,
  experienceLevelId: optionalUuid,
  requisitionId: optionalUuid,
  description: z.string().min(10, 'Job overview must be at least 10 characters'),
  responsibilities: optionalText,
  requirements: optionalText,
  benefits: optionalText,
  salaryMin: optionalPositiveNumber,
  salaryMax: optionalPositiveNumber,
  showSalary: z.boolean().default(false),
  numberOfPositions: z.coerce.number().int().min(1).default(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  positionStatus: z.enum(['OPEN', 'ON_HOLD', 'CLOSED']).default('OPEN'),
  hiringManagerId: optionalUuid,
  ownedById: optionalUuid,
  closingDate: optionalIsoDate,
  isPublished: z.boolean().optional().default(false),
  skillIds: z.array(z.object({
    skillId: z.string().uuid(),
    isRequired: z.boolean().default(true),
  })).optional(),
});

export const UpdateJobSchema = CreateJobSchema.partial();

export const JobQuerySchema = z.object({
  page: pageParam,
  limit: limitParam,
  search: z.preprocess(emptyToUndefined, z.string().optional()),
  departmentId: optionalUuid,
  designationId: optionalUuid,
  locationId: optionalUuid,
  employmentTypeId: optionalUuid,
  experienceLevelId: optionalUuid,
  positionStatus: z.preprocess(emptyToUndefined, z.enum(['OPEN', 'ON_HOLD', 'CLOSED']).optional()),
  hiringManagerId: optionalUuid,
  ownedById: optionalUuid,
  isPublished: optionalBoolQuery,
  isActive: optionalBoolQuery,
});

export type CreateJobDto = z.infer<typeof CreateJobSchema>;
export type UpdateJobDto = z.infer<typeof UpdateJobSchema>;
export type JobQueryDto = z.infer<typeof JobQuerySchema>;
