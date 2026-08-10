import { z } from 'zod';

export const SharePlatformSchema = z.enum(['LINKEDIN', 'NAUKRI']);

export const ShareJobBodySchema = z.object({
  platform: SharePlatformSchema,
});

export type ShareJobBody = z.infer<typeof ShareJobBodySchema>;
