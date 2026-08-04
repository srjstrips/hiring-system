import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import type { ApplicationQueryDto, UpdateStatusDto } from './applications.validator';

const applicationInclude = {
  candidate: {
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      currentCompany: true, currentDesignation: true, totalExperience: true,
      expectedSalary: true, noticePeriodDays: true, resumeUrl: true, linkedinUrl: true,
    },
  },
  job: { select: { id: true, title: true, slug: true, department: { select: { name: true } } } },
  source: { select: { id: true, name: true } },
  timeline: { orderBy: { createdAt: 'asc' as const } },
  assessmentAttempt: { select: { score: true, isPassed: true, submittedAt: true } },
  _count: { select: { interviews: true } },
};

class ApplicationsService {
  async getAll(query: ApplicationQueryDto) {
    const { page, limit, jobId, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (jobId) where.jobId = jobId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
        { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
        { candidate: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.application.findMany({ where, skip, take: limit, include: applicationInclude, orderBy: { appliedAt: 'desc' } }),
      prisma.application.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const app = await prisma.application.findUnique({ where: { id }, include: applicationInclude });
    if (!app) throw new AppError('Application not found', 404);
    return app;
  }

  async updateStatus(id: string, dto: UpdateStatusDto, updatedById: string) {
    const app = await this.getById(id);

    await prisma.$transaction([
      prisma.application.update({
        where: { id },
        data: { status: dto.status, rejectionReason: dto.rejectionReason },
      }),
      prisma.applicationTimeline.create({
        data: {
          applicationId: id,
          fromStatus: app.status,
          toStatus: dto.status,
          notes: dto.notes,
          createdById: updatedById,
        },
      }),
    ]);

    return this.getById(id);
  }

  async getPipelineStats(jobId?: string) {
    const where: any = {};
    if (jobId) where.jobId = jobId;

    const grouped = await prisma.application.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    return grouped.map((g: { status: string; _count: { _all: number } }) => ({ status: g.status, count: g._count._all }));
  }
}

export default new ApplicationsService();
