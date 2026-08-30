import { z } from 'zod';

// Standard MCQ / SJT answer
export const SaveAnswerSchema = z.object({
  attemptQuestionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().optional(),
  // Forced-choice: candidate picks Most and Least
  selectedMostId:  z.string().uuid().optional(),
  selectedLeastId: z.string().uuid().optional(),
  // Likert text value e.g. "4"
  answerText: z.string().optional(),
}).refine(
  (d) => d.selectedOptionId || d.selectedMostId || d.answerText,
  { message: 'At least one answer field is required' }
);

export const SaveAnswersBatchSchema = z.object({
  answers: z.array(SaveAnswerSchema).min(1),
});

export type SaveAnswerDto = z.infer<typeof SaveAnswerSchema>;
export type SaveAnswersBatchDto = z.infer<typeof SaveAnswersBatchSchema>;
