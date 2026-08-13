import { prisma } from '@/config/database';
import { applyJobScope, type UserScope } from '@/utils/scope';
import type { CreateJobDto, JobQueryDto } from './jobs.validator';

function buildSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') +
    '-' +
    Date.now().toString(36);
}

const jobInclude = {
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  location: { select: { id: true, name: true, city: true, state: true } },
  employmentType: { select: { id: true, name: true } },
  experienceLevel: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  skills: { include: { skill: { select: { id: true, name: true, category: true } } } },
  assessments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { id: true, name: true, durationMins: true, passingScore: true, status: true },
  },
  _count: { select: { applications: true } },
};

function withLegacyAssessmentTemplate(job: any) {
  if (!job) return job;
  const primary = job.assessments?.[0];
  const { assessments, ...rest } = job;
  return {
    ...rest,
    assessmentTemplate: primary
      ? {
          id: primary.id,
          title: primary.name,
          durationMins: primary.durationMins,
          passingScore: primary.passingScore,
          status: primary.status,
        }
      : null,
  };
}

export class JobsRepository {
  async findAll(query: JobQueryDto, scope?: UserScope) {
    const {
      page, limit, search, departmentId, designationId, locationId, employmentTypeId,
      experienceLevelId, positionStatus, hiringManagerId, ownedById, isPublished, isActive,
    } = query;
    const skip = (page - 1) * limit;

    let where: any = { deletedAt: null };
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (departmentId) where.departmentId = departmentId;
    if (designationId) where.designationId = designationId;
    if (locationId) where.locationId = locationId;
    if (employmentTypeId) where.employmentTypeId = employmentTypeId;
    if (experienceLevelId) where.experienceLevelId = experienceLevelId;
    if (positionStatus) where.positionStatus = positionStatus;
    if (hiringManagerId) where.hiringManagerId = hiringManagerId;
    if (ownedById) where.ownedById = ownedById;
    if (isPublished !== undefined) where.isPublished = isPublished;
    if (isActive !== undefined) where.isActive = isActive;

    if (scope) where = applyJobScope(where, scope);

    const [data, total] = await Promise.all([
      prisma.job.findMany({ where, skip, take: limit, include: jobInclude, orderBy: { createdAt: 'desc' } }),
      prisma.job.count({ where }),
    ]);

    return { data: data.map(withLegacyAssessmentTemplate), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const job = await prisma.job.findFirst({ where: { id, deletedAt: null }, include: jobInclude });
    return withLegacyAssessmentTemplate(job);
  }

  async findBySlug(slug: string) {
    const job = await prisma.job.findFirst({
      where: { slug, deletedAt: null, isPublished: true, isActive: true },
      include: jobInclude,
    });
    return withLegacyAssessmentTemplate(job);
  }

  async create(data: CreateJobDto, createdById: string) {
    const { skillIds, closingDate, isPublished, ...rest } = data;
    const slug = buildSlug(data.title);
    const publishNow = !!isPublished;

    const job = await prisma.job.create({
      data: {
        ...rest,
        slug,
        isPublished: publishNow,
        publishedAt: publishNow ? new Date() : undefined,
        closingDate: closingDate ? new Date(closingDate) : undefined,
        createdById,
        salaryMin: rest.salaryMin ? rest.salaryMin : undefined,
        salaryMax: rest.salaryMax ? rest.salaryMax : undefined,
        skills: skillIds?.length
          ? { create: skillIds.map((s) => ({ skillId: s.skillId, isRequired: s.isRequired })) }
          : undefined,
      },
      include: jobInclude,
    });
    return withLegacyAssessmentTemplate(job);
  }

  async update(id: string, data: Partial<CreateJobDto>, updatedById: string) {
    const { skillIds, closingDate, ...rest } = data;

    if (skillIds !== undefined) {
      await prisma.jobSkill.deleteMany({ where: { jobId: id } });
    }

    const job = await prisma.job.update({
      where: { id },
      data: {
        ...rest,
        closingDate: closingDate ? new Date(closingDate) : undefined,
        updatedById,
        salaryMin: rest.salaryMin ? rest.salaryMin : undefined,
        salaryMax: rest.salaryMax ? rest.salaryMax : undefined,
        skills: skillIds?.length
          ? { create: skillIds.map((s) => ({ skillId: s.skillId, isRequired: s.isRequired })) }
          : undefined,
      },
      include: jobInclude,
    });
    return withLegacyAssessmentTemplate(job);
  }

  async publish(id: string, updatedById: string) {
    return prisma.job.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date(), updatedById },
    });
  }

  async unpublish(id: string, updatedById: string) {
    return prisma.job.update({
      where: { id },
      data: { isPublished: false, updatedById },
    });
  }

  async softDelete(id: string) {
    return prisma.job.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}

export default new JobsRepository();
