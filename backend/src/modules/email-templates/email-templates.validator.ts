import { z } from 'zod';

export const CreateEmailTemplateSchema = z.object({
  name: z.string().min(2).max(200),
  subject: z.string().min(2).max(500),
  body: z.string().min(10),
  category: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const UpdateEmailTemplateSchema = CreateEmailTemplateSchema.partial();

export const SendEmailSchema = z.object({
  templateId: z.string().uuid(),
  toEmail: z.string().email().optional(),
  extraVariables: z.record(z.string(), z.string()).optional(),
  previewOnly: z.boolean().default(false),
});

export type CreateEmailTemplateDto = z.infer<typeof CreateEmailTemplateSchema>;
export type UpdateEmailTemplateDto = z.infer<typeof UpdateEmailTemplateSchema>;
export type SendEmailDto = z.infer<typeof SendEmailSchema>;
