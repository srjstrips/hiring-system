import { AppError } from '@/utils/errors';
import { prisma } from '@/config/database';
import jobsRepository from './jobs.repository';
import type { CreateJobDto, JobQueryDto } from './jobs.validator';
import { getUserScope, applyJobScope } from '@/utils/scope';
import { buildPagination } from '@/utils/response';
import candidateNotificationsService from '@/modules/candidate-notifications/candidate-notifications.service';

class JobsService {
  async getAll(query: JobQueryDto, userId?: string, roleName?: string) {
    const scope = userId && roleName ? await getUserScope(userId, roleName) : undefined;
    return jobsRepository.findAll(query, scope);
  }

  async getById(id: string) {
    const job = await jobsRepository.findById(id);
    if (!job) throw new AppError('Job not found', 404);
    return job;
  }

  async getBySlug(slug: string) {
    const job = await jobsRepository.findBySlug(slug);
    if (!job) throw new AppError('Job not found', 404);
    return job;
  }

  async create(data: CreateJobDto, createdById: string) {
    const job = await jobsRepository.create(data, createdById);
    if (job.isPublished) {
      await candidateNotificationsService.notifyJobPublished(job);
    }
    return job;
  }

  /**
   * Called when a manpower requisition is approved. Creates the corresponding
   * Job (unpublished draft) linked via requisitionId, unless one already exists.
   */
  async createFromRequisition(requisition: any, createdById: string) {
    const existing = await jobsRepository.findByRequisitionId(requisition.id);
    if (existing) return existing;

    const title = requisition.designation?.name ?? 'New Position';
    const jobDescription = requisition.jobDescription?.trim();
    const description = jobDescription && jobDescription.length >= 10
      ? jobDescription
      : `We are hiring for the ${title} position in the ${requisition.department?.name ?? 'company'} department.`;

    const data: CreateJobDto = {
      title,
      departmentId: requisition.departmentId,
      designationId: requisition.designationId,
      locationId: requisition.locationId,
      experienceLevelId: requisition.experienceLevelId ?? undefined,
      requisitionId: requisition.id,
      description,
      salaryMin: requisition.salaryMin ? Number(requisition.salaryMin) : undefined,
      salaryMax: requisition.salaryMax ? Number(requisition.salaryMax) : undefined,
      showSalary: false,
      numberOfPositions: requisition.numberOfPositions,
      priority: requisition.priority,
      positionStatus: 'OPEN',
      isPublished: false,
    };

    return jobsRepository.create(data, createdById);
  }

  async update(id: string, data: Partial<CreateJobDto>, updatedById: string) {
    await this.getById(id);
    return jobsRepository.update(id, data, updatedById);
  }

  async publish(id: string, userId: string) {
    const job = await this.getById(id);
    if (job.isPublished) throw new AppError('Job is already published', 400);
    const updated = await jobsRepository.publish(id, userId);
    await candidateNotificationsService.notifyJobPublished(job);
    return updated;
  }

  async unpublish(id: string, userId: string) {
    const job = await this.getById(id);
    if (!job.isPublished) throw new AppError('Job is not published', 400);
    return jobsRepository.unpublish(id, userId);
  }

  async delete(id: string) {
    await this.getById(id);
    return jobsRepository.softDelete(id);
  }

  async getOpenPositions(query: any, userId: string, roleName: string) {
    const scope = await getUserScope(userId, roleName);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    let where: any = { deletedAt: null };
    if (query.search) {
      where.title = { contains: String(query.search), mode: 'insensitive' };
    }
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.designationId) where.designationId = query.designationId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.employmentTypeId) where.employmentTypeId = query.employmentTypeId;
    if (query.experienceLevelId) where.experienceLevelId = query.experienceLevelId;
    if (query.hiringManagerId) where.hiringManagerId = query.hiringManagerId;
    if (query.positionStatus) where.positionStatus = query.positionStatus;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    where = applyJobScope(where, scope);

    const [jobs, total, openCount, holdCount, closedCount] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          hiringManager: { select: { id: true, firstName: true, lastName: true } },
          ownedBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { applications: true } },
          applications: { select: { status: true } },
        },
      }),
      prisma.job.count({ where }),
      prisma.job.count({ where: applyJobScope({ deletedAt: null, positionStatus: 'OPEN' }, scope) }),
      prisma.job.count({ where: applyJobScope({ deletedAt: null, positionStatus: 'ON_HOLD' }, scope) }),
      prisma.job.count({ where: applyJobScope({ deletedAt: null, positionStatus: 'CLOSED' }, scope) }),
    ]);

    const data = jobs.map((job) => {
      const stats = {
        applications: job.applications.length,
        shortlisted: job.applications.filter((a) => a.status === 'SHORTLISTED').length,
        selected: job.applications.filter((a) =>
          ['SELECTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'JOINED'].includes(a.status)
        ).length,
        rejected: job.applications.filter((a) => a.status === 'REJECTED').length,
      };
      const { applications, ...rest } = job;
      return { ...rest, stats };
    });

    return {
      data,
      summary: { totalOpen: openCount, totalOnHold: holdCount, totalClosed: closedCount },
      pagination: buildPagination(total, page, limit),
    };
  }
}

export default new JobsService();
