import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import assessmentsRepository from '@/modules/assessments/assessments.repository';
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
  assessments: {
    where: { deletedAt: null, status: 'ACTIVE' as const },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { id: true, name: true, durationMins: true, passingScore: true },
  },
  _count: { select: { applications: true } },
};

function mapPublicJob(job: any) {
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
        }
      : null,
  };
}

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

    return { data: data.map(mapPublicJob), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPublicJobBySlug(slug: string) {
    const job = await prisma.job.findFirst({ where: { slug, isPublished: true, isActive: true, deletedAt: null }, select: publicJobSelect });
    if (!job) throw new AppError('Job not found', 404);
    return mapPublicJob(job);
  }

  async applyToJob(jobId: string, dto: ApplyJobDto, resumeUrl?: string) {
    const job = await prisma.job.findFirst({ where: { id: jobId, isPublished: true, isActive: true, deletedAt: null } });
    if (!job) throw new AppError('Job not found or no longer accepting applications', 404);

    // Upsert candidate
    let candidate = await prisma.candidate.findUnique({ where: { email: dto.email } });

    if (candidate) {
      candidate = await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          currentCompany: dto.currentCompany,
          currentDesignation: dto.currentDesignation,
          totalExperience: dto.totalExperience,
          currentSalary: dto.currentSalary,
          expectedSalary: dto.expectedSalary,
          noticePeriodDays: dto.noticePeriodDays,
          linkedinUrl: dto.linkedinUrl,
          resumeUrl: resumeUrl || candidate.resumeUrl,
          sourceId: dto.sourceId,
        },
      });
    } else {
      candidate = await prisma.candidate.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          currentCompany: dto.currentCompany,
          currentDesignation: dto.currentDesignation,
          totalExperience: dto.totalExperience,
          currentSalary: dto.currentSalary,
          expectedSalary: dto.expectedSalary,
          noticePeriodDays: dto.noticePeriodDays,
          linkedinUrl: dto.linkedinUrl,
          resumeUrl,
          sourceId: dto.sourceId,
        },
      });

      if (dto.skills?.length) {
        await prisma.candidateSkill.createMany({
          data: dto.skills.map((skillId) => ({ candidateId: candidate!.id, skillId })),
          skipDuplicates: true,
        });
      }
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

    // Check if job has assessment
    const hasAssessment = await assessmentsRepository.findTemplateByJobId(jobId);

    return {
      applicationId: application.id,
      candidateId: candidate.id,
      hasAssessment: !!hasAssessment,
      assessmentTemplateId: hasAssessment?.id,
    };
  }

  async startAssessment(applicationId: string, candidateId: string) {
    const application = await prisma.application.findFirst({
      where: { id: applicationId, candidateId },
    });
    if (!application) throw new AppError('Application not found', 404);

    const template = await assessmentsRepository.findTemplateByJobId(application.jobId);
    if (!template) throw new AppError('No assessment for this job', 404);

    return assessmentsRepository.startAttempt(template.id, candidateId, applicationId);
  }

  async submitAssessment(applicationId: string, candidateId: string, answers: any[]) {
    const attempt = await assessmentsRepository.getAttemptByApplicationId(applicationId);
    if (!attempt) throw new AppError('Assessment attempt not found', 404);
    if (attempt.candidateId !== candidateId) throw new AppError('Forbidden', 403);
    if (attempt.submittedAt) throw new AppError('Already submitted', 400);
    return assessmentsRepository.submitAttempt(attempt.id, answers, attempt.assessment);
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
