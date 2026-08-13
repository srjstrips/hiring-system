import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import { emailService } from '@/services/email.service';
import type { ApplyJobDto, PublicJobQueryDto } from './career.validator';

const publicJobSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  responsibilities: true,
  requirements: true,
  benefits: true,
  salaryMin: true,
  salaryMax: true,
  showSalary: true,
  numberOfPositions: true,
  closingDate: true,
  publishedAt: true,
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  location: { select: { id: true, name: true, city: true, state: true } },
  employmentType: { select: { id: true, name: true } },
  experienceLevel: { select: { id: true, name: true, minYears: true, maxYears: true } },
  skills: { include: { skill: { select: { id: true, name: true } } } },
  _count: { select: { applications: true } },
};

class CareerService {
  async getPublicJobs(query: PublicJobQueryDto) {
    const { page, limit, search, departmentId, locationId, employmentTypeId, experienceLevelId } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null, isPublished: true, isActive: true };
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (departmentId) where.departmentId = departmentId;
    if (locationId) where.locationId = locationId;
    if (employmentTypeId) where.employmentTypeId = employmentTypeId;
    if (experienceLevelId) where.experienceLevelId = experienceLevelId;

    const [data, total] = await Promise.all([
      prisma.job.findMany({ where, skip, take: limit, select: publicJobSelect, orderBy: { publishedAt: 'desc' } }),
      prisma.job.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPublicJobBySlug(slug: string) {
    const job = await prisma.job.findFirst({ where: { slug, isPublished: true, isActive: true, deletedAt: null }, select: publicJobSelect });
    if (!job) throw new AppError('Job not found', 404);
    return job;
  }

  async applyToJob(candidateId: string, jobId: string, dto: ApplyJobDto, resumeUrl?: string) {
    const job = await prisma.job.findFirst({
      where: { id: jobId, isPublished: true, isActive: true, deletedAt: null },
      select: {
        id: true,
        title: true,
        department: { select: { name: true } },
        location: { select: { city: true, state: true } },
      },
    });
    if (!job) throw new AppError('Job not found or no longer accepting applications', 404);

    const existingCandidate = await prisma.candidate.findFirst({ where: { id: candidateId, deletedAt: null } });
    if (!existingCandidate) throw new AppError('Candidate not found', 404);

    const candidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        phone: dto.phone ?? existingCandidate.phone,
        currentCompany: dto.currentCompany,
        currentDesignation: dto.currentDesignation,
        totalExperience: dto.totalExperience,
        currentSalary: dto.currentSalary,
        expectedSalary: dto.expectedSalary,
        noticePeriodDays: dto.noticePeriodDays,
        linkedinUrl: dto.linkedinUrl,
        resumeUrl: resumeUrl || existingCandidate.resumeUrl,
        sourceId: dto.sourceId,
      },
    });

    if (dto.skills?.length) {
      await prisma.candidateSkill.createMany({
        data: dto.skills.map((skillId) => ({ candidateId: candidate.id, skillId })),
        skipDuplicates: true,
      });
    }

    // Check if already applied
    const existing = await prisma.application.findUnique({ where: { candidateId_jobId: { candidateId: candidate.id, jobId } } });
    if (existing) throw new AppError('You have already applied for this position', 409);

    const application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobId,
        coverLetter: dto.coverLetter,
        sourceId: dto.sourceId,
        timeline: { create: { toStatus: 'APPLIED', notes: 'Application submitted via career portal' } },
      },
    });

    await emailService.sendApplicationReceivedEmail({
      email: candidate.email,
      candidateName: `${candidate.firstName} ${candidate.lastName}`.trim(),
      jobTitle: job.title,
      department: job.department?.name,
      location: [job.location?.city, job.location?.state].filter(Boolean).join(', ') || undefined,
    });

    return {
      applicationId: application.id,
      candidateId: candidate.id,
    };
  }

  async getFilters() {
    const [departments, locations, employmentTypes, experienceLevels] = await Promise.all([
      prisma.department.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      prisma.location.findMany({ where: { isActive: true }, select: { id: true, name: true, city: true, state: true } }),
      prisma.employmentType.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      prisma.experienceLevel.findMany({ where: { isActive: true }, select: { id: true, name: true, minYears: true, maxYears: true } }),
    ]);
    return { departments, locations, employmentTypes, experienceLevels };
  }
}

export default new CareerService();
