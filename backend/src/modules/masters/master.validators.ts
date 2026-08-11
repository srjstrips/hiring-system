import { z } from 'zod';

// Shared query schema for all masters
export const masterQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(10),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Department
export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10).toUpperCase(),
  description: z.string().max(500).optional(),
  headId: z.string().uuid().optional(),
});
export const updateDepartmentSchema = createDepartmentSchema.partial();

// Designation
const designationSkillSchema = z.object({
  skillId: z.string().uuid(),
  isRequired: z.boolean().default(true),
});

export const createDesignationSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10).toUpperCase(),
  description: z.string().max(500).optional(),
  level: z.coerce.number().int().min(1).max(20).optional(),
  defaultDescription: z.string().min(1, 'Overview is required'),
  defaultResponsibilities: z.string().optional(),
  defaultRequirements: z.string().optional(),
  defaultBenefits: z.string().optional(),
  skillIds: z.array(designationSkillSchema).optional(),
});
export const updateDesignationSchema = createDesignationSchema.partial();

// Location
export const createLocationSchema = z.object({
  name: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  country: z.string().default('India'),
  pincode: z.string().max(10).optional(),
  address: z.string().max(500).optional(),
});
export const updateLocationSchema = createLocationSchema.partial();

// Employment Type
export const createEmploymentTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});
export const updateEmploymentTypeSchema = createEmploymentTypeSchema.partial();

// Experience Level
export const createExperienceLevelSchema = z.object({
  name: z.string().min(1).max(100),
  minYears: z.coerce.number().min(0),
  maxYears: z.coerce.number().min(0).optional().nullable(),
  description: z.string().max(500).optional(),
});
export const updateExperienceLevelSchema = createExperienceLevelSchema.partial();

// Skill
export const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});
export const updateSkillSchema = createSkillSchema.partial();

// Interview Type
export const createInterviewTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});
export const updateInterviewTypeSchema = createInterviewTypeSchema.partial();

// Education
export const createEducationSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.coerce.number().int().min(1).optional(),
  description: z.string().max(500).optional(),
});
export const updateEducationSchema = createEducationSchema.partial();

// Recruitment Source
export const createRecruitmentSourceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});
export const updateRecruitmentSourceSchema = createRecruitmentSourceSchema.partial();

// Reason
export const createReasonSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});
export const updateReasonSchema = createReasonSchema.partial();

// Toggle active status
export const toggleActiveSchema = z.object({
  isActive: z.boolean(),
});

export type MasterQueryDto = z.infer<typeof masterQuerySchema>;
export type ToggleActiveDto = z.infer<typeof toggleActiveSchema>;
