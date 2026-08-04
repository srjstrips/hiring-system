import { prisma } from '@/config/database';
import type { CreateTemplateDto, QuestionDto, SubmitAnswersDto } from './assessments.validator';

export class AssessmentsRepository {
  async findTemplateByJobId(jobId: string) {
    return prisma.assessmentTemplate.findUnique({
      where: { jobId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async findTemplateById(id: string) {
    return prisma.assessmentTemplate.findUnique({
      where: { id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async createTemplate(data: CreateTemplateDto) {
    return prisma.assessmentTemplate.create({ data, include: { questions: true } });
  }

  async updateTemplate(id: string, data: Partial<Omit<CreateTemplateDto, 'jobId'>>) {
    return prisma.assessmentTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) {
    return prisma.assessmentTemplate.delete({ where: { id } });
  }

  async addQuestions(templateId: string, questions: QuestionDto[]) {
    await prisma.assessmentQuestion.deleteMany({ where: { templateId } });
    return prisma.assessmentQuestion.createMany({
      data: questions.map((q, i) => ({ ...q, templateId, orderIndex: q.orderIndex || i, options: q.options ?? undefined })),
    });
  }

  async getAttemptByApplicationId(applicationId: string) {
    return prisma.assessmentAttempt.findUnique({
      where: { applicationId },
      include: {
        answers: true,
        template: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
      },
    });
  }

  async startAttempt(templateId: string, candidateId: string, applicationId: string) {
    return prisma.assessmentAttempt.create({
      data: { templateId, candidateId, applicationId },
      include: {
        template: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              select: { id: true, questionText: true, questionType: true, options: true, marks: true, orderIndex: true },
            },
          },
        },
      },
    });
  }

  async submitAttempt(attemptId: string, answers: SubmitAnswersDto['answers'], template: any) {
    const questions: any[] = template.questions;
    let score = 0;
    let totalMarks = 0;

    const answerData = answers.map((a) => {
      const q = questions.find((q: any) => q.id === a.questionId);
      if (!q) return { questionId: a.questionId, answerText: a.answerText, isCorrect: false, marksGiven: 0, attemptId };
      totalMarks += q.marks;
      const isCorrect = q.questionType !== 'TEXT' && q.correctAnswer !== null && q.correctAnswer !== undefined
        ? a.answerText.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
        : null;
      const marksGiven = isCorrect ? q.marks : 0;
      if (isCorrect) score += q.marks;
      return { questionId: a.questionId, answerText: a.answerText, isCorrect, marksGiven, attemptId };
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const isPassed = percentage >= template.passingScore;

    await prisma.assessmentAnswer.createMany({ data: answerData });

    return prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { submittedAt: new Date(), score: percentage, totalMarks, isPassed },
    });
  }

  async getResultsByJobId(jobId: string) {
    const template = await prisma.assessmentTemplate.findUnique({ where: { jobId } });
    if (!template) return [];
    return prisma.assessmentAttempt.findMany({
      where: { templateId: template.id },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
        application: { select: { id: true, status: true } },
      },
      orderBy: { score: 'desc' },
    });
  }
}

export default new AssessmentsRepository();
