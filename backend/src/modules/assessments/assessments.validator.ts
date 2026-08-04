import { z } from 'zod';

export const CreateTemplateSchema = z.object({
  jobId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  durationMins: z.number().int().min(5).max(180).default(30),
  passingScore: z.number().int().min(0).max(100).default(60),
});

export const UpdateTemplateSchema = CreateTemplateSchema.omit({ jobId: true }).partial();

export const QuestionSchema = z.object({
  questionText: z.string().min(5),
  questionType: z.enum(['MCQ', 'TEXT', 'TRUE_FALSE']).default('MCQ'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  marks: z.number().int().min(1).default(1),
  orderIndex: z.number().int().default(0),
  explanation: z.string().optional(),
});

export const BulkQuestionsSchema = z.object({
  questions: z.array(QuestionSchema),
});

export const SubmitAnswersSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    answerText: z.string(),
  })),
});

export type CreateTemplateDto = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateDto = z.infer<typeof UpdateTemplateSchema>;
export type QuestionDto = z.infer<typeof QuestionSchema>;
export type SubmitAnswersDto = z.infer<typeof SubmitAnswersSchema>;
