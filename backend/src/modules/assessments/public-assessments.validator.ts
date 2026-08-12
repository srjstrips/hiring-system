import { z } from 'zod';

export const SaveAnswerSchema = z.object({
  attemptQuestionId: z.string().uuid(),
  selectedOptionId: z.string().uuid(),
});

export const SaveAnswersBatchSchema = z.object({
  answers: z.array(SaveAnswerSchema).min(1),
});

export type SaveAnswerDto = z.infer<typeof SaveAnswerSchema>;
export type SaveAnswersBatchDto = z.infer<typeof SaveAnswersBatchSchema>;
