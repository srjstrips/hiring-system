import { z } from 'zod';

export const InterviewModeEnum = z.enum(['VIDEO', 'IN_PERSON']);
export const InterviewStatusEnum = z.enum([
  'SCHEDULED',
  'COMPLETED',
  'SHORTLISTED',
  'REJECTED',
  'BACKOUT',
  'ON_HOLD',
  'RESCHEDULED',
  'CANCELLED',
  'NO_SHOW',
]);

const emptyToNull = (v: unknown) => {
  if (v === undefined || v === null || v === '') return null;
  return v;
};

const optionalUuid = z.preprocess(emptyToNull, z.string().uuid().nullable().optional());
const optionalText = z.preprocess(emptyToNull, z.string().max(5000).nullable().optional());
const optionalUrl = z.preprocess((v) => {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}, z.string().url('Enter a valid meeting URL (Google Meet, Zoom, etc.)').nullable().optional());

function refineModeFields(
  data: { mode?: 'VIDEO' | 'IN_PERSON'; location?: string | null },
  ctx: z.RefinementCtx,
) {
  const mode = data.mode ?? 'VIDEO';
  if (mode === 'IN_PERSON' && !String(data.location ?? '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Location is required for in-person interviews',
      path: ['location'],
    });
  }
}

export const CreateInterviewSchema = z
  .object({
    applicationId: z.string().uuid(),
    interviewTypeId: optionalUuid,
    round: z.coerce.number().int().min(1).max(3).default(1),
    title: z.string().min(1, 'Title is required').max(200),
    scheduledAt: z.string().min(1, 'Interview date and time is required'),
    durationMinutes: z.coerce.number().int().min(15).max(480).default(60),
    mode: InterviewModeEnum.default('VIDEO'),
    location: optionalText,
    meetingLink: optionalUrl,
    notes: optionalText,
    interviewerIds: z.array(z.string().uuid()).optional().default([]),
    updateApplicationStatus: z.boolean().optional().default(true),
  })
  .superRefine(refineModeFields);

export const UpdateInterviewSchema = z
  .object({
    interviewTypeId: optionalUuid,
    round: z.coerce.number().int().min(1).max(3).optional(),
    title: z.string().min(1).max(200).optional(),
    scheduledAt: z.string().min(1).optional(),
    durationMinutes: z.coerce.number().int().min(15).max(480).optional(),
    mode: InterviewModeEnum.optional(),
    location: optionalText,
    meetingLink: optionalUrl,
    notes: optionalText,
    interviewerIds: z.array(z.string().uuid()).optional(),
    status: InterviewStatusEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode) refineModeFields(data, ctx);
  });

export const UpdateInterviewStatusSchema = z.object({
  status: InterviewStatusEnum,
  notes: z.string().optional(),
});

export type CreateInterviewDto = z.infer<typeof CreateInterviewSchema>;
export type UpdateInterviewDto = z.infer<typeof UpdateInterviewSchema>;
