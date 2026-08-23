import { prisma } from '@/config/database';
import { AppError } from '@/utils/errors';
import { emailService } from '@/services/email.service';
import candidateNotificationsService from '@/modules/candidate-notifications/candidate-notifications.service';
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
    void candidateNotificationsService.notifyApplicationReceived(
      application.id,
      `${candidate.firstName} ${candidate.lastName}`.trim(),
      job.title,
    );

    return {
      applicationId: application.id,
      candidateId: candidate.id,
    };
  }

  /**
   * Recommend published jobs for a logged-in candidate. No dedicated table —
   * we score existing jobs against the candidate's skills, experience and the
   * departments/locations they've already applied to, excluding applied jobs.
   */
  async getRecommendedJobs(candidateId: string, limit = 12) {
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, deletedAt: null },
      select: {
        totalExperience: true,
        currentLocation: true,
        skills: { select: { skillId: true } },
        applications: {
          select: { jobId: true, job: { select: { departmentId: true, locationId: true } } },
        },
      },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);

    const skillIds = new Set(candidate.skills.map((s) => s.skillId));
    const appliedJobIds = new Set(candidate.applications.map((a) => a.jobId));
    const preferredDepartments = new Set(candidate.applications.map((a) => a.job.departmentId));
    const preferredLocations = new Set(candidate.applications.map((a) => a.job.locationId));
    const exp = candidate.totalExperience;

    const jobs = await prisma.job.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        isActive: true,
        ...(appliedJobIds.size ? { id: { notIn: Array.from(appliedJobIds) } } : {}),
      },
      select: publicJobSelect,
      orderBy: { publishedAt: 'desc' },
    });

    const scored = jobs.map((job: any) => {
      let score = 0;
      const reasons: string[] = [];

      const matchedSkills = (job.skills ?? []).filter((js: any) => skillIds.has(js.skill.id)).length;
      if (matchedSkills > 0) {
        score += matchedSkills * 3;
        reasons.push(`${matchedSkills} matching skill${matchedSkills > 1 ? 's' : ''}`);
      }
      if (preferredDepartments.has(job.department?.id)) {
        score += 2;
        reasons.push('In a department you applied to');
      }
      if (
        preferredLocations.has(job.location?.id) ||
        (candidate.currentLocation &&
          job.location?.city &&
          job.location.city.toLowerCase() === candidate.currentLocation.toLowerCase())
      ) {
        score += 1;
        reasons.push('Near your location');
      }
      if (
        exp != null &&
        job.experienceLevel &&
        (job.experienceLevel.minYears == null || exp >= job.experienceLevel.minYears) &&
        (job.experienceLevel.maxYears == null || exp <= job.experienceLevel.maxYears)
      ) {
        score += 1;
        reasons.push('Matches your experience');
      }

      return { job, score, reasons };
    });

    // If we have any signal, prefer scored jobs; otherwise fall back to newest.
    const hasSignal = skillIds.size > 0 || appliedJobIds.size > 0 || exp != null;
    const ranked = hasSignal
      ? scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score)
      : [];

    const list = (ranked.length ? ranked : scored).slice(0, limit);
    return list.map(({ job, reasons }) => ({ ...job, matchReasons: reasons }));
  }

  async getAlertSubscription(candidateId: string) {
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, deletedAt: null },
      select: { jobAlertSubscribed: true },
    });
    if (!candidate) throw new AppError('Candidate not found', 404);
    return { subscribed: candidate.jobAlertSubscribed };
  }

  async updateAlertSubscription(candidateId: string, dto: { subscribed: boolean }) {
    const candidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: { jobAlertSubscribed: dto.subscribed },
      select: { jobAlertSubscribed: true },
    });
    return { subscribed: candidate.jobAlertSubscribed };
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
