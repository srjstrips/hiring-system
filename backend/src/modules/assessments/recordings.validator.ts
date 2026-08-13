import { z } from 'zod';

export const StartRecordingsSchema = z.object({
  attemptId: z.string().uuid(),
  consent: z.literal(true),
  cameraMimeType: z.string().min(1).max(120).optional(),
  screenMimeType: z.string().min(1).max(120).optional(),
});

export const CompleteRecordingSchema = z.object({
  durationSeconds: z.number().int().min(0).max(60 * 60 * 12).optional(),
  failed: z.boolean().optional(),
  failureReason: z.string().max(500).optional(),
});

export const RecordingEventSchema = z.object({
  attemptId: z.string().uuid(),
  recordingId: z.string().uuid().optional(),
  eventType: z.string().min(1).max(80),
  message: z.string().max(500).optional(),
});

export type StartRecordingsDto = z.infer<typeof StartRecordingsSchema>;
export type CompleteRecordingDto = z.infer<typeof CompleteRecordingSchema>;
export type RecordingEventDto = z.infer<typeof RecordingEventSchema>;
