import { z } from 'zod';

export const CreateJobSchema = z.object({
  title: z.string().min(2).max(200),
  departmentId: z.string().uuid(),
  designationId: z.string().uuid(),
  locationId: z.string().uuid(),
  employmentTypeId: z.string().uuid().optional(),
  experienceLevelId: z.string().uuid().optional(),
  requisitionId: z.string().uuid().optional(),
  description: z.string().min(10),
  responsibilities: z.string().optional(),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
  salaryMin: z.coerce.number().positive().optional(),
  salaryMax: z.coerce.number().positive().optional(),
  showSalary: z.boolean().default(false),
  numberOfPositions: z.coerce.number().int().min(1).default(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  closingDate: z.string().datetime().optional(),
  skillIds: z.array(z.object({ skillId: z.string().uuid(), isRequired: z.boolean().default(true) })).optional(),
});

export const UpdateJobSchema = CreateJobSchema.partial();

export const JobQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  employmentTypeId: z.string().uuid().optional(),
  experienceLevelId: z.string().uuid().optional(),
  isPublished: z.string().optional().transform((v) => v === undefined ? undefined : v === 'true'),
  isActive: z.string().optional().transform((v) => v === undefined ? undefined : v === 'true'),
});

export type CreateJobDto = z.infer<typeof CreateJobSchema>;
export type UpdateJobDto = z.infer<typeof UpdateJobSchema>;
export type JobQueryDto = z.infer<typeof JobQuerySchema>;
