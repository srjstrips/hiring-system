import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import type { SaveAnswerDto, SaveAnswersBatchDto } from './public-assessments.validator';

type GateCode =
  | 'INVALID_TOKEN'
  | 'UNAVAILABLE'
  | 'COMPLETED'
  | 'MAX_ATTEMPTS'
  | 'EXPIRED';

export class AssessmentGateError extends AppError {
  constructor(code: GateCode, message: string, status = 400) {
    super(message, status, code);
  }
}

function now() {
  return new Date();
}

function mapSafeQuestion(q: {
  id: string;
  questionText: string;
  questionType: string;
  marks: number;
  displayOrder: number;
  options: Array<{ id: string; optionText: string; displayOrder: number }>;
}) {
  return {
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    marks: q.marks,
    displayOrder: q.displayOrder,
    options: q.options
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((o) => ({
        id: o.id,
        optionText: o.optionText,
        displayOrder: o.displayOrder,
      })),
  };
}

class PublicAssessmentsService {
  async loadAssignmentByToken(secureToken: string) {
    const assignment = await prisma.assessmentAssignment.findUnique({
      where: { secureToken },
      include: {
        assessment: {
          include: {
            _count: { select: { questions: { where: { isActive: true } } } },
          },
        },
        attempts: {
          orderBy: { attemptNumber: 'desc' },
          include: {
            answers: true,
            questionSnapshots: {
              orderBy: { displayOrder: 'asc' },
              include: {
                options: { orderBy: { displayOrder: 'asc' } },
              },
            },
          },
        },
      },
    });
    if (!assignment || assignment.assessment.deletedAt) {
      throw new AssessmentGateError('INVALID_TOKEN', 'Assessment link is invalid or has expired.', 404);
    }
    return assignment;
  }

  private assertCanAccess(assignment: Awaited<ReturnType<typeof this.loadAssignmentByToken>>) {
    const assessment = assignment.assessment;
    const current = now();

    if (assignment.status === 'CANCELLED') {
      throw new AssessmentGateError('UNAVAILABLE', 'Assessment is currently unavailable.', 403);
    }
    if (assignment.status === 'EXPIRED' || (assignment.expiresAt && assignment.expiresAt < current)) {
      throw new AssessmentGateError('EXPIRED', 'Assessment link is invalid or has expired.', 403);
    }
    if (assessment.status !== 'ACTIVE') {
      throw new AssessmentGateError('UNAVAILABLE', 'Assessment is currently unavailable.', 403);
    }
    if (assessment.startAt && assessment.startAt > current) {
      throw new AssessmentGateError('UNAVAILABLE', 'Assessment is currently unavailable.', 403);
    }
    if (assessment.endAt && assessment.endAt < current) {
      throw new AssessmentGateError('EXPIRED', 'Assessment link is invalid or has expired.', 403);
    }

    const completedAttempts = assignment.attempts.filter((a) => a.submittedAt).length;
    const openAttempt = assignment.attempts.find((a) => !a.submittedAt);

    if (!openAttempt && completedAttempts >= assignment.maxAttempts) {
      const code = assignment.status === 'COMPLETED' || completedAttempts > 0 ? 'MAX_ATTEMPTS' : 'COMPLETED';
      throw new AssessmentGateError(
        code === 'MAX_ATTEMPTS' ? 'MAX_ATTEMPTS' : 'COMPLETED',
        code === 'MAX_ATTEMPTS' ? 'Maximum assessment attempts reached.' : 'Assessment already completed.',
        403
      );
    }

    return { openAttempt, completedAttempts };
  }

  async getIntro(secureToken: string) {
    const assignment = await this.loadAssignmentByToken(secureToken);
    const { openAttempt, completedAttempts } = this.assertCanAccess(assignment);
    const assessment = assignment.assessment;

    return {
      assessmentName: assessment.name,
      description: assessment.description,
      durationMins: assessment.durationMins,
      questionCount: assessment._count.questions,
      passingScore: assessment.passingScore,
      maxAttempts: assignment.maxAttempts,
      attemptsUsed: completedAttempts,
      attemptsRemaining: Math.max(0, assignment.maxAttempts - completedAttempts),
      status: assignment.status,
      hasOpenAttempt: !!openAttempt,
      expiresAt: assignment.expiresAt,
      assessmentWindow: {
        startAt: assessment.startAt,
        endAt: assessment.endAt,
      },
    };
  }

  private async createSnapshots(attemptId: string, assessmentId: string) {
    const questions = await prisma.assessmentQuestion.findMany({
      where: { assessmentId, isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: { optionItems: { orderBy: { displayOrder: 'asc' } } },
    });

    for (const q of questions) {
      await prisma.assessmentAttemptQuestion.create({
        data: {
          attemptId,
          originalQuestionId: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          marks: q.marks,
          displayOrder: q.displayOrder,
          options: {
            create: q.optionItems.map((o) => ({
              originalOptionId: o.id,
              optionText: o.optionText,
              isCorrect: o.isCorrect,
              displayOrder: o.displayOrder,
            })),
          },
        },
      });
    }
  }

  async start(secureToken: string): ReturnType<PublicAssessmentsService['buildAttemptPayload']> {
    const assignment = await this.loadAssignmentByToken(secureToken);
    const { openAttempt, completedAttempts } = this.assertCanAccess(assignment);

    if (openAttempt) {
      // Auto-submit if duration already elapsed
      const endsAt = new Date(openAttempt.startedAt.getTime() + assignment.assessment.durationMins * 60_000);
      if (endsAt <= now()) {
        await this.submitInternal(openAttempt.id, true);
        // re-check access for a new attempt if any remain
        return this.start(secureToken);
      }
      return this.buildAttemptPayload(secureToken, openAttempt.id);
    }

    if (completedAttempts >= assignment.maxAttempts) {
      throw new AssessmentGateError('MAX_ATTEMPTS', 'Maximum assessment attempts reached.', 403);
    }

    const attemptNumber = completedAttempts + 1;
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: assignment.assessmentId,
        assignmentId: assignment.id,
        candidateId: assignment.candidateId,
        applicationId: assignment.applicationId,
        attemptNumber,
      },
    });

    await this.createSnapshots(attempt.id, assignment.assessmentId);

    if (assignment.status === 'ASSIGNED') {
      await prisma.assessmentAssignment.update({
        where: { id: assignment.id },
        data: { status: 'STARTED' },
      });
    }

    return this.buildAttemptPayload(secureToken, attempt.id);
  }

  private async getOpenAttemptForToken(secureToken: string) {
    const assignment = await this.loadAssignmentByToken(secureToken);
    const { openAttempt } = this.assertCanAccess(assignment);
    if (!openAttempt) {
      throw new AssessmentGateError('UNAVAILABLE', 'No active assessment attempt. Please start the assessment.', 400);
    }

    const endsAt = new Date(openAttempt.startedAt.getTime() + assignment.assessment.durationMins * 60_000);
    if (endsAt <= now()) {
      await this.submitInternal(openAttempt.id, true);
      throw new AssessmentGateError('COMPLETED', 'Assessment already completed.', 403);
    }

    return { assignment, attempt: openAttempt, endsAt };
  }

  async getAttempt(secureToken: string) {
    const { attempt } = await this.getOpenAttemptForToken(secureToken);
    return this.buildAttemptPayload(secureToken, attempt.id);
  }

  async buildAttemptPayload(secureToken: string, attemptId: string) {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: { select: { id: true, name: true, durationMins: true, passingScore: true } },
        assignment: { select: { id: true, status: true, maxAttempts: true, secureToken: true } },
        answers: true,
        questionSnapshots: {
          orderBy: { displayOrder: 'asc' },
          include: { options: { orderBy: { displayOrder: 'asc' } } },
        },
      },
    });
    if (!attempt || attempt.assignment?.secureToken !== secureToken) {
      throw new AssessmentGateError('INVALID_TOKEN', 'Assessment link is invalid or has expired.', 404);
    }
    if (attempt.submittedAt) {
      throw new AssessmentGateError('COMPLETED', 'Assessment already completed.', 403);
    }

    const endsAt = new Date(attempt.startedAt.getTime() + attempt.assessment.durationMins * 60_000);
    const remainingSeconds = Math.max(0, Math.floor((endsAt.getTime() - now().getTime()) / 1000));

    const answers: Record<string, string> = {};
    for (const a of attempt.answers) {
      if (a.attemptQuestionId && a.selectedOptionId) {
        answers[a.attemptQuestionId] = a.selectedOptionId;
      }
    }

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      assessmentName: attempt.assessment.name,
      durationMins: attempt.assessment.durationMins,
      startedAt: attempt.startedAt.toISOString(),
      endsAt: endsAt.toISOString(),
      serverNow: now().toISOString(),
      remainingSeconds,
      questions: attempt.questionSnapshots.map((q) =>
        mapSafeQuestion({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          marks: q.marks,
          displayOrder: q.displayOrder,
          options: q.options,
        })
      ),
      answers,
    };
  }

  async saveAnswer(secureToken: string, dto: SaveAnswerDto) {
    const { attempt } = await this.getOpenAttemptForToken(secureToken);
    return this.upsertAnswer(attempt.id, dto);
  }

  async saveAnswers(secureToken: string, dto: SaveAnswersBatchDto) {
    const { attempt } = await this.getOpenAttemptForToken(secureToken);
    for (const a of dto.answers) {
      await this.upsertAnswer(attempt.id, a);
    }
    return { saved: dto.answers.length };
  }

  private async upsertAnswer(attemptId: string, dto: SaveAnswerDto) {
    const snapshotQ = await prisma.assessmentAttemptQuestion.findFirst({
      where: { id: dto.attemptQuestionId, attemptId },
      include: { options: true },
    });
    if (!snapshotQ) throw new AppError('Invalid question', 400);

    const option = snapshotQ.options.find((o) => o.id === dto.selectedOptionId);
    if (!option) throw new AppError('Invalid option', 400);

    // Prefer unique on attemptQuestionId
    const existing = await prisma.assessmentAnswer.findFirst({
      where: { attemptId, attemptQuestionId: dto.attemptQuestionId },
    });

    if (existing) {
      return prisma.assessmentAnswer.update({
        where: { id: existing.id },
        data: {
          selectedOptionId: dto.selectedOptionId,
          answerText: option.optionText,
          questionId: snapshotQ.originalQuestionId,
          isCorrect: null,
          marksGiven: null,
        },
      });
    }

    return prisma.assessmentAnswer.create({
      data: {
        attemptId,
        attemptQuestionId: dto.attemptQuestionId,
        selectedOptionId: dto.selectedOptionId,
        answerText: option.optionText,
        questionId: snapshotQ.originalQuestionId,
      },
    });
  }

  async submit(secureToken: string) {
    const { attempt } = await this.getOpenAttemptForToken(secureToken);
    return this.submitInternal(attempt.id, false);
  }

  private async submitInternal(attemptId: string, timedOut: boolean) {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: true,
        assignment: true,
        answers: true,
        questionSnapshots: { include: { options: true } },
      },
    });
    if (!attempt) throw new AppError('Attempt not found', 404);
    if (attempt.submittedAt) {
      return this.statusPayload(attempt.assignment!.secureToken);
    }

    let obtainedMarks = 0;
    let totalMarks = 0;

    for (const q of attempt.questionSnapshots) {
      totalMarks += q.marks;
      const answer = attempt.answers.find((a) => a.attemptQuestionId === q.id);
      const correct = q.options.find((o) => o.isCorrect);
      const selected = q.options.find((o) => o.id === answer?.selectedOptionId);
      const isCorrect = !!(selected && correct && selected.id === correct.id);
      const marksGiven = isCorrect ? q.marks : 0;
      if (isCorrect) obtainedMarks += q.marks;

      if (answer) {
        await prisma.assessmentAnswer.update({
          where: { id: answer.id },
          data: { isCorrect, marksGiven },
        });
      } else {
        await prisma.assessmentAnswer.create({
          data: {
            attemptId,
            attemptQuestionId: q.id,
            questionId: q.originalQuestionId,
            isCorrect: false,
            marksGiven: 0,
          },
        });
      }
    }

    const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
    const isPassed = percentage >= attempt.assessment.passingScore;

    await prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        submittedAt: now(),
        score: percentage,
        totalMarks,
        obtainedMarks,
        isPassed,
        isTimedOut: timedOut,
      },
    });

    if (attempt.assignmentId) {
      const assignment = await prisma.assessmentAssignment.findUnique({
        where: { id: attempt.assignmentId },
        include: { attempts: true },
      });
      if (assignment) {
        const completedCount = assignment.attempts.filter((a) => a.submittedAt || a.id === attemptId).length;
        await prisma.assessmentAssignment.update({
          where: { id: assignment.id },
          data: {
            status: completedCount >= assignment.maxAttempts ? 'COMPLETED' : 'STARTED',
          },
        });
      }
    }

    return this.statusPayload(attempt.assignment!.secureToken);
  }

  async getStatus(secureToken: string) {
    return this.statusPayload(secureToken);
  }

  private async statusPayload(secureToken: string) {
    const assignment = await this.loadAssignmentByToken(secureToken);
    const latestSubmitted = assignment.attempts.find((a) => a.submittedAt);
    const openAttempt = assignment.attempts.find((a) => !a.submittedAt);
    const completedAttempts = assignment.attempts.filter((a) => a.submittedAt).length;

    return {
      assessmentName: assignment.assessment.name,
      assignmentStatus: assignment.status,
      attemptsUsed: completedAttempts,
      maxAttempts: assignment.maxAttempts,
      hasOpenAttempt: !!openAttempt,
      latestSubmission: latestSubmitted
        ? {
            submittedAt: latestSubmitted.submittedAt,
            // Prefer not exposing score to candidate in Phase 2; keep for status completeness but UI won't show
            status: 'Submitted',
          }
        : null,
      message: latestSubmitted
        ? 'Your assessment has been submitted successfully. Your results will be reviewed by the hiring team.'
        : null,
    };
  }
}

export default new PublicAssessmentsService();
