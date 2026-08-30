import { randomBytes } from 'crypto';
import { prisma } from '@/config/database';
import type {
  CreateAssessmentDto,
  CreateQuestionDto,
  CreateTemplateDto,
  QuestionDto,
  SubmitAnswersDto,
  UpdateAssessmentDto,
  UpdateQuestionDto,
} from './assessments.validator';

const assessmentListInclude = {
  job: { select: { id: true, title: true } },
  designation: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  _count: {
    select: {
      questions: true,
      assignments: true,
    },
  },
};

const questionInclude = {
  optionItems: { orderBy: { displayOrder: 'asc' as const } },
};

function generateSecureToken() {
  return randomBytes(32).toString('hex');
}

function toDateOrNull(value?: string | null) {
  if (!value || value === '') return null;
  return new Date(value);
}

function mapQuestionForClient(q: any, includeCorrect = true) {
  const options = (q.optionItems?.length
    ? q.optionItems.map((o: any) => o.optionText)
    : Array.isArray(q.options) ? q.options : []) as string[];

  const correctFromOptions = q.optionItems?.find((o: any) => o.isCorrect)?.optionText;
  return {
    id: q.id,
    assessmentId: q.assessmentId,
    questionText: q.questionText,
    questionType: q.questionType,
    marks: q.marks,
    displayOrder: q.displayOrder,
    orderIndex: q.displayOrder,
    isActive: q.isActive,
    explanation: q.explanation,
    options,
    optionItems: includeCorrect
      ? (q.optionItems ?? []).map((o: any) => ({
          id: o.id,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
          displayOrder: o.displayOrder,
        }))
      : (q.optionItems ?? []).map((o: any) => ({
          id: o.id,
          optionText: o.optionText,
          displayOrder: o.displayOrder,
        })),
    correctAnswer: includeCorrect ? (correctFromOptions ?? q.correctAnswer ?? null) : undefined,
  };
}

export class AssessmentsRepository {
  async list(query: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    jobId?: string;
  }) {
    const { page, limit, search, status, jobId } = query;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (jobId) where.jobId = jobId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { job: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: assessmentListInclude,
      }),
      prisma.assessment.count({ where }),
    ]);

    const assessmentIds = rows.map((r) => r.id);
    const [completedGroups, avgGroups] = await Promise.all([
      prisma.assessmentAssignment.groupBy({
        by: ['assessmentId'],
        where: { assessmentId: { in: assessmentIds }, status: 'COMPLETED' },
        _count: { _all: true },
      }),
      prisma.assessmentAttempt.groupBy({
        by: ['assessmentId'],
        where: { assessmentId: { in: assessmentIds }, submittedAt: { not: null }, score: { not: null } },
        _avg: { score: true },
      }),
    ]);

    const completedMap = Object.fromEntries(completedGroups.map((g) => [g.assessmentId, g._count._all]));
    const avgMap = Object.fromEntries(avgGroups.map((g) => [g.assessmentId, g._avg.score]));

    const data = rows.map((r) => ({
      ...r,
      questionCount: r._count.questions,
      candidatesAssigned: r._count.assignments,
      candidatesCompleted: completedMap[r.id] ?? 0,
      averageScore: avgMap[r.id] != null ? Math.round(Number(avgMap[r.id])) : null,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, opts?: { includeCorrect?: boolean }) {
    const assessment = await prisma.assessment.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...assessmentListInclude,
        questions: {
          orderBy: { displayOrder: 'asc' },
          include: questionInclude,
        },
      },
    });
    if (!assessment) return null;

    const [completed, pending] = await Promise.all([
      prisma.assessmentAssignment.count({ where: { assessmentId: id, status: 'COMPLETED' } }),
      prisma.assessmentAssignment.count({
        where: { assessmentId: id, status: { in: ['ASSIGNED', 'STARTED'] } },
      }),
    ]);

    return {
      ...assessment,
      questionCount: assessment.questions.length,
      candidatesAssigned: assessment._count.assignments,
      candidatesCompleted: completed,
      candidatesPending: pending,
      questions: assessment.questions.map((q) => mapQuestionForClient(q, opts?.includeCorrect !== false)),
    };
  }

  async create(data: CreateAssessmentDto, createdById: string) {
    const job = await prisma.job.findFirst({ where: { id: data.jobId, deletedAt: null } });
    if (!job) throw new Error('JOB_NOT_FOUND');

    return prisma.assessment.create({
      data: {
        name: data.name,
        description: data.description || null,
        jobId: data.jobId,
        designationId: data.designationId || job.designationId,
        durationMins: data.durationMins,
        passingScore: data.passingScore,
        maxAttempts: data.maxAttempts ?? 1,
        startAt: toDateOrNull(data.startAt as any),
        endAt: toDateOrNull(data.endAt as any),
        status: data.status ?? 'DRAFT',
        createdById,
      },
      include: assessmentListInclude,
    });
  }

  async update(id: string, data: UpdateAssessmentDto) {
    let designationId = data.designationId;
    if (data.jobId) {
      const job = await prisma.job.findFirst({ where: { id: data.jobId, deletedAt: null } });
      if (!job) throw new Error('JOB_NOT_FOUND');
      if (designationId === undefined) designationId = job.designationId;
    }

    return prisma.assessment.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.jobId !== undefined ? { jobId: data.jobId } : {}),
        ...(designationId !== undefined ? { designationId: designationId || null } : {}),
        ...(data.durationMins !== undefined ? { durationMins: data.durationMins } : {}),
        ...(data.passingScore !== undefined ? { passingScore: data.passingScore } : {}),
        ...(data.maxAttempts !== undefined ? { maxAttempts: data.maxAttempts } : {}),
        ...(data.startAt !== undefined ? { startAt: toDateOrNull(data.startAt as any) } : {}),
        ...(data.endAt !== undefined ? { endAt: toDateOrNull(data.endAt as any) } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: assessmentListInclude,
    });
  }

  async softDeleteOrClose(id: string) {
    const assignmentCount = await prisma.assessmentAssignment.count({ where: { assessmentId: id } });
    const attemptCount = await prisma.assessmentAttempt.count({ where: { assessmentId: id } });
    if (assignmentCount > 0 || attemptCount > 0) {
      return prisma.assessment.update({
        where: { id },
        data: { status: 'CLOSED' },
        include: assessmentListInclude,
      });
    }
    return prisma.assessment.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CLOSED' },
      include: assessmentListInclude,
    });
  }

  async listQuestions(assessmentId: string, includeCorrect = true) {
    const questions = await prisma.assessmentQuestion.findMany({
      where: { assessmentId },
      orderBy: { displayOrder: 'asc' },
      include: questionInclude,
    });
    return questions.map((q) => mapQuestionForClient(q, includeCorrect));
  }

  async createQuestion(assessmentId: string, data: CreateQuestionDto) {
    const maxOrder = await prisma.assessmentQuestion.aggregate({
      where: { assessmentId },
      _max: { displayOrder: true },
    });
    const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    const correct = data.options.find((o) => o.isCorrect)?.optionText ?? null;

    const question = await prisma.assessmentQuestion.create({
      data: {
        assessmentId,
        questionText: data.questionText,
        questionType: data.questionType ?? 'MCQ',
        marks: data.marks,
        isActive: data.isActive ?? true,
        explanation: data.explanation || null,
        displayOrder,
        options: data.options.map((o) => o.optionText),
        correctAnswer: correct,
        optionItems: {
          create: data.options.map((o, i) => ({
            optionText: o.optionText,
            isCorrect: o.isCorrect,
            displayOrder: o.displayOrder ?? i,
          })),
        },
      },
      include: questionInclude,
    });
    return mapQuestionForClient(question, true);
  }

  async updateQuestion(questionId: string, data: UpdateQuestionDto) {
    const existing = await prisma.assessmentQuestion.findUnique({ where: { id: questionId } });
    if (!existing) return null;

    if (data.options) {
      await prisma.assessmentOption.deleteMany({ where: { questionId } });
    }
    const correct = data.options?.find((o) => o.isCorrect)?.optionText;

    const question = await prisma.assessmentQuestion.update({
      where: { id: questionId },
      data: {
        ...(data.questionText !== undefined ? { questionText: data.questionText } : {}),
        ...(data.questionType !== undefined ? { questionType: data.questionType } : {}),
        ...(data.marks !== undefined ? { marks: data.marks } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.explanation !== undefined ? { explanation: data.explanation || null } : {}),
        ...(data.options
          ? {
              options: data.options.map((o) => o.optionText),
              correctAnswer: correct ?? null,
              optionItems: {
                create: data.options.map((o, i) => ({
                  optionText: o.optionText,
                  isCorrect: o.isCorrect,
                  displayOrder: o.displayOrder ?? i,
                })),
              },
            }
          : {}),
      },
      include: questionInclude,
    });
    return mapQuestionForClient(question, true);
  }

  async deleteQuestion(questionId: string) {
    const answers = await prisma.assessmentAnswer.count({ where: { questionId } });
    if (answers > 0) {
      return prisma.assessmentQuestion.update({
        where: { id: questionId },
        data: { isActive: false },
      });
    }
    await prisma.assessmentQuestion.delete({ where: { id: questionId } });
    return { deleted: true };
  }

  async reorderQuestions(assessmentId: string, orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.assessmentQuestion.updateMany({
          where: { id, assessmentId },
          data: { displayOrder: index },
        })
      )
    );
    return this.listQuestions(assessmentId, true);
  }

  async getEligibleCandidates(assessmentId: string, search?: string) {
    const assessment = await prisma.assessment.findFirst({ where: { id: assessmentId, deletedAt: null } });
    if (!assessment) return null;

    const assigned = await prisma.assessmentAssignment.findMany({
      where: { assessmentId, status: { not: 'CANCELLED' } },
      select: { applicationId: true },
    });
    const assignedIds = assigned.map((a) => a.applicationId);

    const where: any = {
      jobId: assessment.jobId,
      id: { notIn: assignedIds.length ? assignedIds : ['00000000-0000-0000-0000-000000000000'] },
    };
    if (search) {
      where.OR = [
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
        { candidate: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return prisma.application.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            totalExperience: true,
          },
        },
      },
    });
  }

  async assignCandidates(assessmentId: string, applicationIds: string[], assignedById: string, expiresAt?: string | null) {
    const assessment = await prisma.assessment.findFirst({ where: { id: assessmentId, deletedAt: null } });
    if (!assessment) throw new Error('NOT_FOUND');

    const applications = await prisma.application.findMany({
      where: { id: { in: applicationIds }, ...(assessment.jobId ? { jobId: assessment.jobId } : {}) },
      select: { id: true, candidateId: true, jobId: true },
    });
    if (applications.length === 0) throw new Error('NO_ELIGIBLE');

    const created = await prisma.$transaction(
      applications.map((app) =>
        prisma.assessmentAssignment.upsert({
          where: {
            assessmentId_applicationId: { assessmentId, applicationId: app.id },
          },
          create: {
            assessmentId,
            applicationId: app.id,
            candidateId: app.candidateId,
            jobId: app.jobId,
            assignedById,
            maxAttempts: assessment.maxAttempts,
            secureToken: generateSecureToken(),
            expiresAt: toDateOrNull(expiresAt),
            status: 'ASSIGNED',
          },
          update: {
            status: 'ASSIGNED',
            assignedById,
            assignedAt: new Date(),
            maxAttempts: assessment.maxAttempts,
            expiresAt: toDateOrNull(expiresAt),
          },
          include: {
            candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
            application: { select: { id: true, appliedAt: true, status: true } },
          },
        })
      )
    );

    const { buildCandidateAssessmentUrl } = await import('./assessment-url');
    return created.map((row) => ({
      ...row,
      assessmentUrl: buildCandidateAssessmentUrl(row.secureToken),
    }));
  }

  async listAssignments(assessmentId: string) {
    const rows = await prisma.assessmentAssignment.findMany({
      where: { assessmentId },
      orderBy: { assignedAt: 'desc' },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true, totalExperience: true } },
        application: { select: { id: true, appliedAt: true, status: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const { buildCandidateAssessmentUrl } = await import('./assessment-url');
    return rows.map((row) => ({
      ...row,
      assessmentUrl: buildCandidateAssessmentUrl(row.secureToken),
    }));
  }

  private timeTakenSeconds(startedAt: Date, submittedAt: Date | null) {
    if (!submittedAt) return null;
    return Math.max(0, Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000));
  }

  async getResultsDashboard(assessmentId: string, filters?: {
    search?: string;
    status?: string;
    result?: string;
    dateFrom?: string;
    dateTo?: string;
    scoreMin?: number;
    scoreMax?: number;
  }) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, deletedAt: null },
      include: {
        job: { select: { id: true, title: true } },
      },
    });
    if (!assessment) return null;

    const assignments = await prisma.assessmentAssignment.findMany({
      where: { assessmentId },
      orderBy: { assignedAt: 'desc' },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        application: { select: { id: true, appliedAt: true, status: true } },
        job: { select: { id: true, title: true } },
        attempts: { orderBy: { attemptNumber: 'desc' } },
      },
    });

    const { buildCandidateAssessmentUrl } = await import('./assessment-url');

    let rows = assignments.map((a) => {
      const latest = a.attempts[0] ?? null;
      const latestSubmitted = a.attempts.find((t) => t.submittedAt) ?? null;
      const displayAttempt = latestSubmitted ?? latest;
      const percentage = displayAttempt?.submittedAt ? displayAttempt.score : null;
      const result =
        displayAttempt?.submittedAt == null
          ? null
          : displayAttempt.isPassed
            ? 'PASSED'
            : 'FAILED';
      const completedCount = a.attempts.filter((t) => t.submittedAt).length;
      const hasOpenAttempt = a.attempts.some((t) => !t.submittedAt);

      return {
        assignmentId: a.id,
        status: a.status,
        assignedAt: a.assignedAt,
        maxAttempts: a.maxAttempts,
        assessmentUrl: buildCandidateAssessmentUrl(a.secureToken),
        candidate: a.candidate,
        application: a.application,
        job: a.job,
        attemptCount: a.attempts.length,
        latestAttemptNumber: displayAttempt?.attemptNumber ?? null,
        score: displayAttempt?.submittedAt ? displayAttempt.obtainedMarks ?? null : null,
        totalMarks: displayAttempt?.submittedAt ? displayAttempt.totalMarks ?? null : null,
        percentage,
        result,
        isPassed: displayAttempt?.submittedAt ? displayAttempt.isPassed : null,
        startedAt: displayAttempt?.startedAt ?? null,
        completedAt: displayAttempt?.submittedAt ?? null,
        timeTakenSeconds: displayAttempt
          ? this.timeTakenSeconds(displayAttempt.startedAt, displayAttempt.submittedAt)
          : null,
        canRetake: completedCount < a.maxAttempts && a.status !== 'CANCELLED' && !hasOpenAttempt && completedCount > 0,
        canIncreaseAttempts: completedCount >= a.maxAttempts && a.status !== 'CANCELLED' && !hasOpenAttempt,
        attemptsRemaining: Math.max(0, a.maxAttempts - completedCount),
      };
    });

    // Filters
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.candidate.firstName.toLowerCase().includes(q) ||
          r.candidate.lastName.toLowerCase().includes(q) ||
          r.candidate.email.toLowerCase().includes(q)
      );
    }
    if (filters?.status) rows = rows.filter((r) => r.status === filters.status);
    if (filters?.result === 'PASSED') rows = rows.filter((r) => r.result === 'PASSED');
    if (filters?.result === 'FAILED') rows = rows.filter((r) => r.result === 'FAILED');
    if (filters?.result === 'PENDING') rows = rows.filter((r) => r.result == null);
    if (filters?.dateFrom) {
      const from = new Date(filters.dateFrom);
      rows = rows.filter((r) => (r.completedAt ? new Date(r.completedAt) >= from : r.assignedAt >= from));
    }
    if (filters?.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => (r.completedAt ? new Date(r.completedAt) <= to : r.assignedAt <= to));
    }
    if (filters?.scoreMin != null) {
      rows = rows.filter((r) => r.percentage != null && r.percentage >= filters.scoreMin!);
    }
    if (filters?.scoreMax != null) {
      rows = rows.filter((r) => r.percentage != null && r.percentage <= filters.scoreMax!);
    }

    const all = assignments;
    const latestSubmittedOf = (a: (typeof assignments)[number]) =>
      a.attempts.find((t) => t.submittedAt) ?? null;

    const summary = {
      totalAssigned: all.length,
      notStarted: all.filter((a) => a.status === 'ASSIGNED').length,
      inProgress: all.filter((a) => a.status === 'STARTED').length,
      completed: all.filter((a) => a.status === 'COMPLETED' || !!latestSubmittedOf(a)).length,
      passed: all.filter((a) => latestSubmittedOf(a)?.isPassed === true).length,
      failed: all.filter((a) => {
        const latest = latestSubmittedOf(a);
        return latest != null && latest.isPassed === false;
      }).length,
      expired: all.filter((a) => a.status === 'EXPIRED').length,
    };

    return {
      assessment: {
        id: assessment.id,
        name: assessment.name,
        status: assessment.status,
        durationMins: assessment.durationMins,
        passingScore: assessment.passingScore,
        maxAttempts: assessment.maxAttempts,
        job: assessment.job,
      },
      summary,
      rows,
    };
  }

  async getAssignmentResultDetail(assessmentId: string, assignmentId: string) {
    const assignment = await prisma.assessmentAssignment.findFirst({
      where: { id: assignmentId, assessmentId },
      include: {
        assessment: {
          select: {
            id: true,
            name: true,
            passingScore: true,
            durationMins: true,
            maxAttempts: true,
            status: true,
          },
        },
        candidate: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        application: { select: { id: true, appliedAt: true, status: true } },
        job: { select: { id: true, title: true } },
        attempts: {
          orderBy: { attemptNumber: 'asc' },
          include: {
            answers: true,
            questionSnapshots: {
              orderBy: { displayOrder: 'asc' },
              include: { options: { orderBy: { displayOrder: 'asc' } } },
            },
          },
        },
      },
    });
    if (!assignment) return null;

    const { buildCandidateAssessmentUrl } = await import('./assessment-url');
    const attempts = assignment.attempts.map((attempt) => {
      const questions = attempt.questionSnapshots.map((q, idx) => {
        const answer = attempt.answers.find((a) => a.attemptQuestionId === q.id);
        const correct = q.options.find((o) => o.isCorrect) ?? null;
        const selected = q.options.find((o) => o.id === answer?.selectedOptionId) ?? null;
        let outcome: 'CORRECT' | 'INCORRECT' | 'UNANSWERED' = 'UNANSWERED';
        if (selected) outcome = answer?.isCorrect ? 'CORRECT' : 'INCORRECT';
        return {
          number: idx + 1,
          attemptQuestionId: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          marks: q.marks,
          marksGiven: answer?.marksGiven ?? 0,
          outcome,
          candidateAnswer: selected?.optionText ?? answer?.answerText ?? null,
          correctAnswer: correct?.optionText ?? null,
          options: q.options.map((o) => ({
            id: o.id,
            optionText: o.optionText,
            isCorrect: o.isCorrect,
            isSelected: o.id === answer?.selectedOptionId,
            displayOrder: o.displayOrder,
          })),
        };
      });

      return {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        completedAt: attempt.submittedAt,
        isTimedOut: attempt.isTimedOut,
        timeTakenSeconds: this.timeTakenSeconds(attempt.startedAt, attempt.submittedAt),
        totalMarks: attempt.totalMarks,
        obtainedMarks: attempt.obtainedMarks,
        percentage: attempt.score,
        isPassed: attempt.isPassed,
        result: attempt.submittedAt == null ? null : attempt.isPassed ? 'PASSED' : 'FAILED',
        isLatest: false,
        questions: attempt.submittedAt ? questions : [],
        recordings: [] as Array<{
          id: string;
          recordingType: string;
          mimeType: string | null;
          fileSize: number | null;
          durationSeconds: number | null;
          status: string;
          startedAt: Date | null;
          endedAt: Date | null;
          failureReason: string | null;
        }>,
      };
    });

    if (attempts.length) {
      const latestIdx = attempts.length - 1;
      attempts[latestIdx]!.isLatest = true;
    }

    try {
      const recordingRows = await prisma.assessmentRecording.findMany({
        where: {
          attemptId: { in: assignment.attempts.map((a) => a.id) },
          status: { not: 'DELETED' },
        },
        orderBy: { recordingType: 'asc' },
      });
      for (const attempt of attempts) {
        attempt.recordings = recordingRows
          .filter((r) => r.attemptId === attempt.id)
          .map((r) => ({
            id: r.id,
            recordingType: r.recordingType,
            mimeType: r.mimeType,
            fileSize: r.fileSize,
            durationSeconds: r.durationSeconds,
            status: r.status,
            startedAt: r.startedAt,
            endedAt: r.endedAt,
            failureReason: r.failureReason,
          }));
      }
    } catch {
      // Keep results available even if recordings query fails
    }

    const completedCount = attempts.filter((a) => a.completedAt).length;
    const hasOpenAttempt = attempts.some((a) => !a.completedAt);

    // Fetch personality result for the latest completed attempt (if any)
    let personalityResult = null;
    const completedAttempts = assignment.attempts.filter((a) => a.submittedAt);
    const latestCompleted = completedAttempts[completedAttempts.length - 1];
    if (latestCompleted) {
      personalityResult = await prisma.assessmentPersonalityResult.findUnique({
        where: { attemptId: latestCompleted.id },
      });
    }

    return {
      assignment: {
        id: assignment.id,
        status: assignment.status,
        maxAttempts: assignment.maxAttempts,
        assignedAt: assignment.assignedAt,
        assessmentUrl: buildCandidateAssessmentUrl(assignment.secureToken),
        canRetake:
          completedCount < assignment.maxAttempts &&
          assignment.status !== 'CANCELLED' &&
          !hasOpenAttempt &&
          completedCount > 0,
        canIncreaseAttempts:
          completedCount >= assignment.maxAttempts && assignment.status !== 'CANCELLED' && !hasOpenAttempt,
        attemptsRemaining: Math.max(0, assignment.maxAttempts - completedCount),
      },
      assessment: assignment.assessment,
      candidate: assignment.candidate,
      application: assignment.application,
      job: assignment.job,
      passingPercentage: assignment.assessment.passingScore,
      attempts,
      latestAttempt: attempts.length ? attempts[attempts.length - 1] : null,
      personalityResult,
    };
  }

  async resendAssignmentInvite(assessmentId: string, assignmentId: string) {
    const assignment = await prisma.assessmentAssignment.findFirst({
      where: { id: assignmentId, assessmentId },
      include: {
        assessment: { select: { name: true, durationMins: true, status: true } },
        candidate: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!assignment) throw new Error('NOT_FOUND');
    if (assignment.status === 'CANCELLED') throw new Error('CANCELLED');
    if (!assignment.candidate.email) throw new Error('NO_EMAIL');

    const { buildCandidateAssessmentUrl } = await import('./assessment-url');
    const assessmentUrl = buildCandidateAssessmentUrl(assignment.secureToken);
    const { emailService } = await import('@/services/email.service');
    await emailService.sendAssessmentInviteEmail({
      email: assignment.candidate.email,
      candidateName: `${assignment.candidate.firstName} ${assignment.candidate.lastName}`.trim(),
      assessmentName: assignment.assessment.name,
      assessmentUrl,
      durationMins: assignment.assessment.durationMins,
    });

    return { assessmentUrl, email: assignment.candidate.email };
  }

  async allowRetake(assessmentId: string, assignmentId: string, increaseMaxAttempts = false) {
    const assignment = await prisma.assessmentAssignment.findFirst({
      where: { id: assignmentId, assessmentId },
      include: { attempts: true },
    });
    if (!assignment) throw new Error('NOT_FOUND');
    if (assignment.status === 'CANCELLED') throw new Error('CANCELLED');

    const completedCount = assignment.attempts.filter((a) => a.submittedAt).length;
    let maxAttempts = assignment.maxAttempts;

    if (completedCount >= maxAttempts) {
      if (!increaseMaxAttempts) throw new Error('MAX_ATTEMPTS');
      maxAttempts = completedCount + 1;
    }

    // Ensure no open attempt; if open exists, resume instead of creating new via public start
    const open = assignment.attempts.find((a) => !a.submittedAt);
    if (open) throw new Error('OPEN_ATTEMPT');

    return prisma.assessmentAssignment.update({
      where: { id: assignmentId },
      data: {
        maxAttempts,
        status: 'ASSIGNED',
      },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  // ── Legacy job-scoped helpers (AssessmentBuilder + career) ─────────────────

  async findTemplateByJobId(jobId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { jobId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: { orderBy: { displayOrder: 'asc' }, include: questionInclude },
      },
    });
    if (!assessment) return null;
    return this.toLegacyTemplate(assessment);
  }

  async findTemplateById(id: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { id, deletedAt: null },
      include: { questions: { orderBy: { displayOrder: 'asc' }, include: questionInclude } },
    });
    if (!assessment) return null;
    return this.toLegacyTemplate(assessment);
  }

  private toLegacyTemplate(assessment: any) {
    return {
      id: assessment.id,
      jobId: assessment.jobId,
      title: assessment.name,
      description: assessment.description,
      durationMins: assessment.durationMins,
      passingScore: assessment.passingScore,
      isActive: assessment.status === 'ACTIVE',
      questions: assessment.questions.map((q: any) => mapQuestionForClient(q, true)),
    };
  }

  async createTemplate(data: CreateTemplateDto, createdById: string) {
    const job = await prisma.job.findFirst({ where: { id: data.jobId, deletedAt: null } });
    if (!job) throw new Error('JOB_NOT_FOUND');
    const assessment = await prisma.assessment.create({
      data: {
        name: data.title,
        description: data.description || null,
        jobId: data.jobId,
        designationId: job.designationId,
        durationMins: data.durationMins ?? 30,
        passingScore: data.passingScore ?? 60,
        status: 'ACTIVE',
        createdById,
      },
      include: { questions: true },
    });
    return this.toLegacyTemplate({ ...assessment, questions: [] });
  }

  async updateTemplate(id: string, data: Partial<Omit<CreateTemplateDto, 'jobId'>>) {
    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { name: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.durationMins !== undefined ? { durationMins: data.durationMins } : {}),
        ...(data.passingScore !== undefined ? { passingScore: data.passingScore } : {}),
      },
    });
    return this.findTemplateById(assessment.id);
  }

  async deleteTemplate(id: string) {
    return this.softDeleteOrClose(id);
  }

  async addQuestions(assessmentId: string, questions: QuestionDto[]) {
    await prisma.assessmentQuestion.deleteMany({ where: { assessmentId } });
    for (const [i, q] of questions.entries()) {
      const optionTexts = q.options ?? [];
      await prisma.assessmentQuestion.create({
        data: {
          assessmentId,
          questionText: q.questionText,
          questionType: q.questionType ?? 'MCQ',
          marks: q.marks ?? 1,
          displayOrder: q.orderIndex ?? i,
          options: optionTexts,
          correctAnswer: q.correctAnswer ?? null,
          explanation: q.explanation || null,
          optionItems: {
            create: optionTexts.map((text, idx) => ({
              optionText: text,
              isCorrect: q.correctAnswer != null && text.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase(),
              displayOrder: idx,
            })),
          },
        },
      });
    }
  }

  async getAttemptByApplicationId(applicationId: string) {
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
      include: {
        answers: true,
        assessment: {
          include: {
            questions: { orderBy: { displayOrder: 'asc' }, include: questionInclude },
          },
        },
      },
    });
    if (!attempt) return null;
    return {
      ...attempt,
      template: {
        id: attempt.assessment.id,
        title: attempt.assessment.name,
        description: attempt.assessment.description,
        durationMins: attempt.assessment.durationMins,
        passingScore: attempt.assessment.passingScore,
        questions: attempt.assessment.questions.map((q) => mapQuestionForClient(q, false)),
      },
    };
  }

  async startAttempt(assessmentId: string, candidateId: string, applicationId: string) {
    const attempt = await prisma.assessmentAttempt.create({
      data: { assessmentId, candidateId, applicationId },
      include: {
        assessment: {
          include: {
            questions: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
              include: {
                optionItems: {
                  orderBy: { displayOrder: 'asc' },
                  select: { id: true, optionText: true, displayOrder: true },
                },
              },
            },
          },
        },
      },
    });

    // Legacy career UI expects `template`
    return {
      ...attempt,
      template: {
        id: attempt.assessment.id,
        title: attempt.assessment.name,
        description: attempt.assessment.description,
        durationMins: attempt.assessment.durationMins,
        passingScore: attempt.assessment.passingScore,
        questions: attempt.assessment.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          marks: q.marks,
          orderIndex: q.displayOrder,
          options: q.optionItems.map((o) => o.optionText),
        })),
      },
    };
  }

  async submitAttempt(attemptId: string, answers: SubmitAnswersDto['answers'], assessment: any) {
    const questions: any[] = assessment.questions;
    let score = 0;
    let totalMarks = 0;

    const answerData = answers.map((a) => {
      const q = questions.find((q: any) => q.id === a.questionId);
      if (!q) return { questionId: a.questionId, answerText: a.answerText, isCorrect: false, marksGiven: 0, attemptId };
      totalMarks += q.marks;
      const correctText =
        q.optionItems?.find((o: any) => o.isCorrect)?.optionText ?? q.correctAnswer;
      const isCorrect =
        q.questionType !== 'TEXT' && correctText != null
          ? a.answerText.trim().toLowerCase() === String(correctText).trim().toLowerCase()
          : null;
      const marksGiven = isCorrect ? q.marks : 0;
      if (isCorrect) score += q.marks;
      return { questionId: a.questionId, answerText: a.answerText, isCorrect, marksGiven, attemptId };
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const isPassed = percentage >= assessment.passingScore;

    await prisma.assessmentAnswer.createMany({ data: answerData });

    return prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { submittedAt: new Date(), score: percentage, totalMarks, isPassed },
    });
  }

  async getResultsByJobId(jobId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { jobId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!assessment) return [];
    return prisma.assessmentAttempt.findMany({
      where: { assessmentId: assessment.id },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        application: { select: { id: true, status: true } },
      },
      orderBy: { score: 'desc' },
    });
  }

  /** Used by jobs list include mapping */
  async findPrimaryAssessmentForJob(jobId: string) {
    return prisma.assessment.findFirst({
      where: { jobId, deletedAt: null, status: { in: ['ACTIVE', 'DRAFT'] } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, name: true, durationMins: true, passingScore: true, status: true },
    });
  }
}

export default new AssessmentsRepository();
