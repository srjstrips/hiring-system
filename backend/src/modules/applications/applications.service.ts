import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import type { ApplicationQueryDto, UpdateStatusDto } from './applications.validator';
import { getUserScope, applyApplicationScope } from '@/utils/scope';
import { buildPagination } from '@/utils/response';

const applicationInclude = {
  candidate: {
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      currentCompany: true, currentDesignation: true, totalExperience: true,
      expectedSalary: true, noticePeriodDays: true, resumeUrl: true, linkedinUrl: true,
    },
  },
  job: {
    select: {
      id: true,
      title: true,
      slug: true,
      department: { select: { id: true, name: true } },
    },
  },
  source: { select: { id: true, name: true } },
  ownedBy: { select: { id: true, firstName: true, lastName: true } },
  timeline: { orderBy: { createdAt: 'asc' as const } },
  assessmentAttempts: {
    where: { submittedAt: { not: null } },
    orderBy: { submittedAt: 'desc' as const },
    take: 1,
    select: { score: true, isPassed: true, submittedAt: true },
  },
  _count: { select: { interviews: true } },
};

const applicationDetailInclude = {
  ...applicationInclude,
  interviews: {
    orderBy: { scheduledAt: 'desc' as const },
    select: {
      id: true,
      title: true,
      round: true,
      scheduledAt: true,
      durationMinutes: true,
      mode: true,
      location: true,
      meetingLink: true,
      meetingToken: true,
      status: true,
      interviewType: { select: { id: true, name: true } },
    },
  },
};

function withLegacyAssessmentAttempt<T extends { assessmentAttempts?: any[] }>(row: T) {
  const { assessmentAttempts, ...rest } = row as any;
  return {
    ...rest,
    assessmentAttempt: assessmentAttempts?.[0] ?? null,
  };
}

class ApplicationsService {
  async getAll(query: ApplicationQueryDto) {
    const { page, limit, jobId, status, search } = query;
    const skip = (page - 1) * limit;

    // Job ID is the source of truth for job-scoped application lists.
    // When jobId is provided, ONLY applications for that exact Job Opening are returned.
    const where: any = {};
    if (jobId) {
      where.jobId = jobId;
    }
    if (status) where.status = status;
    if (search) {
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { candidate: { firstName: { contains: search, mode: 'insensitive' } } },
            { candidate: { lastName: { contains: search, mode: 'insensitive' } } },
            { candidate: { email: { contains: search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        include: applicationInclude,
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.application.count({ where }),
    ]);

    return {
      data: data.map(withLegacyAssessmentAttempt),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getById(id: string) {
    const app = await prisma.application.findUnique({ where: { id }, include: applicationDetailInclude });
    if (!app) throw new AppError('Application not found', 404);
    return withLegacyAssessmentAttempt(app);
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

    // Auto-email candidate when an active template is mapped to this stage (category = stage).
    if (app.status !== dto.status) {
      const actor = await prisma.user.findUnique({
        where: { id: updatedById },
        select: { firstName: true, lastName: true },
      });
      const hrName = actor ? `${actor.firstName} ${actor.lastName}`.trim() : 'HR Team';
      const emailTemplatesService = (await import('../email-templates/email-templates.service')).default;
      void emailTemplatesService.sendForStageChange(id, dto.status, hrName);
    }

    return this.getById(id);
  }

  async getPipelineStats(jobId?: string) {
    // When jobId is provided, stage counts are scoped to that Job Opening only.
    const where: any = {};
    if (jobId) {
      where.jobId = jobId;
    }

    const grouped = await prisma.application.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    return grouped.map((g) => ({ status: g.status, count: g._count._all }));
  }

  async getAnalytics(query: any, userId: string, roleName: string) {
    const scope = await getUserScope(userId, roleName);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    let where: any = {};
    if (query.status) where.status = query.status;
    if (query.jobId) where.jobId = query.jobId;
    if (query.sourceId) where.sourceId = query.sourceId;
    if (query.ownedById) where.ownedById = query.ownedById;
    if (query.departmentId) where.job = { departmentId: query.departmentId };
    if (query.dateFrom || query.dateTo) {
      where.appliedAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { candidate: { firstName: { contains: String(query.search), mode: 'insensitive' } } },
        { candidate: { lastName: { contains: String(query.search), mode: 'insensitive' } } },
        { candidate: { email: { contains: String(query.search), mode: 'insensitive' } } },
        { job: { title: { contains: String(query.search), mode: 'insensitive' } } },
      ];
    }

    where = applyApplicationScope(where, scope);

    const [data, total, allForSummary] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        include: applicationInclude,
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        select: {
          status: true,
          ownedById: true,
          jobId: true,
          job: { select: { title: true, departmentId: true, department: { select: { name: true } } } },
          ownedBy: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const summary: Record<string, number> = { total: allForSummary.length };
    for (const a of allForSummary) {
      summary[a.status] = (summary[a.status] ?? 0) + 1;
    }
    summary.new = summary.APPLIED ?? 0;
    summary.interviewed =
      (summary.INTERVIEW_ROUND_1 ?? 0) +
      (summary.INTERVIEW_ROUND_2 ?? 0) +
      (summary.HR_ROUND ?? 0);

    const groupBy = String(query.groupBy || 'stage');
    const groupMap = new Map<string, { key: string; label: string; count: number }>();
    for (const a of allForSummary) {
      let key = String(a.status);
      let label = String(a.status);
      if (groupBy === 'department') {
        key = a.job.departmentId;
        label = a.job.department.name;
      } else if (groupBy === 'position') {
        key = a.jobId;
        label = a.job.title;
      } else if (groupBy === 'recruiter') {
        key = a.ownedById ?? 'unassigned';
        label = a.ownedBy ? `${a.ownedBy.firstName} ${a.ownedBy.lastName}` : 'Unassigned';
      }
      const cur = groupMap.get(key) ?? { key, label, count: 0 };
      cur.count += 1;
      groupMap.set(key, cur);
    }

    return {
      data,
      summary,
      groups: Array.from(groupMap.values()),
      pagination: buildPagination(total, page, limit),
    };
  }
}

export default new ApplicationsService();
