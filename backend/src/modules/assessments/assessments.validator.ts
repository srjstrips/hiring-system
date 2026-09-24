import { z } from 'zod';

export const AssessmentStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'CLOSED']);
export const AssessmentTypeEnum = z.enum(['TECHNICAL', 'PERSONALITY', 'APTITUDE', 'DEPARTMENT', 'GENERAL', 'SITUATIONAL']);
export const PersonalityTraitEnum = z.enum(['LEADERSHIP', 'LEARNING_ADAPTABILITY', 'TEAMWORK', 'COMMUNICATION', 'RESPONSIBILITY', 'PROBLEM_SOLVING', 'WORK_DISCIPLINE']);

const assessmentFields = {
  name: z.string().min(1, 'Assessment name is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  jobId: z.string().uuid('Valid job is required').optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  designationId: z.string().uuid().optional().nullable(),
  assessmentType: AssessmentTypeEnum.default('GENERAL'),
  instructions: z.string().optional().nullable(),
  durationMins: z.coerce.number().int().min(1, 'Duration must be greater than 0').max(480),
  passingScore: z.coerce.number().int().min(0).max(100),
  maxAttempts: z.coerce.number().int().min(1).default(1),
  maxQuestions: z.coerce.number().int().min(1).optional().nullable(),
  startAt: z.string().optional().nullable().or(z.literal('')),
  endAt: z.string().optional().nullable().or(z.literal('')),
  status: AssessmentStatusEnum.default('DRAFT'),
  mode: z.enum(['KNOWLEDGE', 'PERSONALITY']).default('KNOWLEDGE'),
};

function refineAssessmentDates(data: { startAt?: string | null; endAt?: string | null }, ctx: z.RefinementCtx) {
  if (
    data.startAt &&
    data.endAt &&
    data.startAt !== '' &&
    data.endAt !== '' &&
    !Number.isNaN(Date.parse(data.startAt)) &&
    !Number.isNaN(Date.parse(data.endAt)) &&
    new Date(data.endAt) < new Date(data.startAt)
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date cannot be earlier than start date', path: ['endAt'] });
  }
}

function refinePersonalityAssessment(data: any, ctx: z.RefinementCtx) {
  if (data.assessmentType === 'PERSONALITY' && data.maxQuestions && data.maxQuestions > 25) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Personality assessments cannot have more than 25 questions',
      path: ['maxQuestions']
    });
  }
}

export const CreateAssessmentSchema = z
  .object(assessmentFields)
  .superRefine(refineAssessmentDates)
  .superRefine(refinePersonalityAssessment);

export const UpdateAssessmentSchema = z
  .object({
    name: assessmentFields.name.optional(),
    description: assessmentFields.description,
    jobId: assessmentFields.jobId.optional(),
    departmentId: assessmentFields.departmentId,
    designationId: assessmentFields.designationId,
    assessmentType: AssessmentTypeEnum.optional(),
    instructions: assessmentFields.instructions,
    durationMins: assessmentFields.durationMins.optional(),
    passingScore: assessmentFields.passingScore.optional(),
    maxAttempts: assessmentFields.maxAttempts.optional(),
    maxQuestions: assessmentFields.maxQuestions,
    startAt: assessmentFields.startAt,
    endAt: assessmentFields.endAt,
    status: AssessmentStatusEnum.optional(),
    mode: z.enum(['KNOWLEDGE', 'PERSONALITY']).optional(),
  })
  .superRefine(refineAssessmentDates)
  .superRefine(refinePersonalityAssessment);

export const QuestionOptionSchema = z.object({
  optionText: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean().default(false),
  displayOrder: z.number().int().optional(),
});

export const CreateQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  questionType: z.enum(['MCQ', 'TEXT', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'SHORT_ANSWER', 'CODING', 'DESCRIPTIVE', 'RATING_SCALE_5']).default('MCQ'),
  marks: z.coerce.number().int().min(1, 'Marks must be greater than 0'),
  isActive: z.boolean().default(true),
  explanation: z.string().optional().nullable(),
  trait: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  options: z.array(QuestionOptionSchema).min(2, 'At least 2 options are required').optional(),
}).superRefine((data, ctx) => {
  if (data.questionType === 'MCQ' || data.questionType === 'MULTIPLE_SELECT') {
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least 2 options are required for MCQ/Multiple Select', path: ['options'] });
    }
    if (data.questionType === 'MCQ') {
      const correctCount = data.options?.filter((o) => o.isCorrect).length ?? 0;
      if (correctCount !== 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Exactly one correct answer must be selected for MCQ', path: ['options'] });
      }
    }
  }
  if (data.questionType === 'RATING_SCALE_5') {
    if (data.options && data.options.length !== 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '5-point rating scale must have exactly 5 options', path: ['options'] });
    }
  }
});

export const UpdateQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required').optional(),
  questionType: z.enum(['MCQ', 'TEXT', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'SHORT_ANSWER', 'CODING', 'DESCRIPTIVE', 'RATING_SCALE_5']).optional(),
  marks: z.coerce.number().int().min(1, 'Marks must be greater than 0').optional(),
  isActive: z.boolean().optional(),
  explanation: z.string().optional().nullable(),
  trait: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  options: z.array(QuestionOptionSchema).min(2, 'At least 2 options are required').optional(),
}).superRefine((data, ctx) => {
  const questionType = data.questionType ?? 'MCQ';
  if (data.options && (questionType === 'MCQ' || questionType === 'MULTIPLE_SELECT')) {
    if (questionType === 'MCQ') {
      const correctCount = data.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Exactly one correct answer must be selected for MCQ', path: ['options'] });
      }
    }
  }
  if (data.options && questionType === 'RATING_SCALE_5') {
    if (data.options.length !== 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '5-point rating scale must have exactly 5 options', path: ['options'] });
    }
  }
});

export const ReorderQuestionsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export const AssignCandidatesSchema = z.object({
  applicationIds: z.array(z.string().uuid()).min(1, 'Select at least one candidate'),
  expiresAt: z.string().optional().nullable(),
});

// Assessment Traits (for Personality Assessments)
export const CreateAssessmentTraitSchema = z.object({
  assessmentId: z.string().uuid('Valid assessment is required'),
  traitName: PersonalityTraitEnum,
  description: z.string().optional().nullable(),
  minScore: z.coerce.number().int().min(1).default(1),
  maxScore: z.coerce.number().int().max(5).default(5),
  level1Label: z.string().default('Very Low'),
  level2Label: z.string().default('Low'),
  level3Label: z.string().default('Moderate'),
  level4Label: z.string().default('High'),
  level5Label: z.string().default('Very High'),
});

export const UpdateAssessmentTraitSchema = CreateAssessmentTraitSchema.omit({ assessmentId: true }).partial();

// Legacy schemas (job-scoped builder / career)
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

export type CreateAssessmentDto = z.infer<typeof CreateAssessmentSchema>;
export type UpdateAssessmentDto = z.infer<typeof UpdateAssessmentSchema>;
export type CreateQuestionDto = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionDto = z.infer<typeof UpdateQuestionSchema>;
export type CreateTemplateDto = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateDto = z.infer<typeof UpdateTemplateSchema>;
export type QuestionDto = z.infer<typeof QuestionSchema>;
export type SubmitAnswersDto = z.infer<typeof SubmitAnswersSchema>;
export type CreateAssessmentTraitDto = z.infer<typeof CreateAssessmentTraitSchema>;
export type UpdateAssessmentTraitDto = z.infer<typeof UpdateAssessmentTraitSchema>;
