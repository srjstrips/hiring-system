import { z } from 'zod';

const CandidateStatusEnum = z.enum([
  'APPLIED', 'SCREENING', 'SHORTLISTED',
  'INTERVIEW_ROUND_1', 'INTERVIEW_ROUND_2', 'HR_ROUND',
  'SELECTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'JOINED',
  'REJECTED', 'WITHDRAWN', 'ON_HOLD',
]);

export const ApplicationQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
  jobId: z.string().uuid().optional(),
  status: CandidateStatusEnum.optional(),
  search: z.string().optional(),
});

export const UpdateStatusSchema = z.object({
  status: CandidateStatusEnum,
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export type ApplicationQueryDto = z.infer<typeof ApplicationQuerySchema>;
export type UpdateStatusDto = z.infer<typeof UpdateStatusSchema>;
