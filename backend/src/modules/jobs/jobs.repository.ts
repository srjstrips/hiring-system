import { prisma } from '@/config/database';
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
  assessmentTemplate: { select: { id: true, title: true, durationMins: true } },
  _count: { select: { applications: true } },
};

export class JobsRepository {
  async findAll(query: JobQueryDto) {
    const { page, limit, search, departmentId, locationId, employmentTypeId, experienceLevelId, isPublished, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (departmentId) where.departmentId = departmentId;
    if (locationId) where.locationId = locationId;
    if (employmentTypeId) where.employmentTypeId = employmentTypeId;
    if (experienceLevelId) where.experienceLevelId = experienceLevelId;
    if (isPublished !== undefined) where.isPublished = isPublished;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      prisma.job.findMany({ where, skip, take: limit, include: jobInclude, orderBy: { createdAt: 'desc' } }),
      prisma.job.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    return prisma.job.findFirst({ where: { id, deletedAt: null }, include: jobInclude });
  }

  async findBySlug(slug: string) {
    return prisma.job.findFirst({ where: { slug, deletedAt: null, isPublished: true, isActive: true }, include: jobInclude });
  }

  async create(data: CreateJobDto, createdById: string) {
    const { skillIds, closingDate, ...rest } = data;
    const slug = buildSlug(data.title);

    return prisma.job.create({
      data: {
        ...rest,
        slug,
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
  }

  async update(id: string, data: Partial<CreateJobDto>, updatedById: string) {
    const { skillIds, closingDate, ...rest } = data;

    if (skillIds !== undefined) {
      await prisma.jobSkill.deleteMany({ where: { jobId: id } });
    }

    return prisma.job.update({
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
