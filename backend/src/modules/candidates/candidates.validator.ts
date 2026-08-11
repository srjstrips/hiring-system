import { z } from 'zod';

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  });

const optionalSkills = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const list = Array.isArray(v) ? v : v.split(',');
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const ids = list.map((s) => s.trim()).filter((id) => uuidRe.test(id));
    return ids.length ? ids : undefined;
  });

export const CandidateQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
  search: z.string().optional(),

  experienceMin: optionalNumber,
  experienceMax: optionalNumber,
  noticeMin: optionalNumber,
  noticeMax: optionalNumber,
  salaryMin: optionalNumber,
  salaryMax: optionalNumber,

  designation: z.string().optional(),
  applicationFrom: z.string().optional(),
  applicationTo: z.string().optional(),
  pastCompany: z.string().optional(),

  skills: optionalSkills,
  skillMatchMode: z.enum(['ALL', 'ANY']).optional().default('ALL'),
});

export type CandidateQueryDto = z.infer<typeof CandidateQuerySchema>;
