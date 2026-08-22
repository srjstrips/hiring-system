import { z } from 'zod';

export const PublicJobQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('12').transform(Number),
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  employmentTypeId: z.string().uuid().optional(),
  experienceLevelId: z.string().uuid().optional(),
});

export const ApplyJobSchema = z.object({
  phone: z.string().optional(),
  currentCompany: z.string().optional(),
  currentDesignation: z.string().optional(),
  totalExperience: z.coerce.number().min(0).optional(),
  currentSalary: z.coerce.number().positive().optional(),
  expectedSalary: z.coerce.number().positive().optional(),
  noticePeriodDays: z.coerce.number().int().min(0).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  coverLetter: z.string().optional(),
  skills: z.array(z.string().uuid()).optional(),
  sourceId: z.string().uuid().optional(),
});

export const AlertSubscriptionSchema = z.object({
  subscribed: z.boolean(),
});

export type PublicJobQueryDto = z.infer<typeof PublicJobQuerySchema>;
export type ApplyJobDto = z.infer<typeof ApplyJobSchema>;
export type AlertSubscriptionDto = z.infer<typeof AlertSubscriptionSchema>;
