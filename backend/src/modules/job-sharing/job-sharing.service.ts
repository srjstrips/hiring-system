import { JobSharePlatform, JobShareStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ConflictError, NotFoundError } from '../../utils/errors';
import { getPlatformAdapter, listPlatformAdapters } from './platforms';
import type { JobSharePlatformCode } from './platforms/types';
import { mapJobToExternalPayload } from './job-sharing.mapper';

const jobShareInclude = {
  sharedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.JobShareInclude;

const jobDetailInclude = {
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  location: { select: { id: true, name: true, city: true, state: true, country: true } },
  employmentType: { select: { id: true, name: true } },
  experienceLevel: { select: { id: true, name: true } },
  skills: { include: { skill: { select: { id: true, name: true } } } },
} satisfies Prisma.JobInclude;

class JobSharingService {
  async getShareContext(jobId: string) {
    const job = await prisma.job.findFirst({
      where: { id: jobId, deletedAt: null },
      include: jobDetailInclude,
    });
    if (!job) throw new NotFoundError('Job');

    const existingShares = await prisma.jobShare.findMany({
      where: { jobId },
      include: jobShareInclude,
    });

    const shareByPlatform = new Map(existingShares.map((s) => [s.platform, s]));

    const platforms = listPlatformAdapters().map((adapter) => {
      const record = shareByPlatform.get(adapter.platform as JobSharePlatform);
      return {
        platform: adapter.platform,
        displayName: adapter.displayName,
        integrationConfigured: adapter.isConfigured(),
        integrationStatus: adapter.isConfigured() ? 'CONFIGURED' : 'NOT_CONFIGURED',
        sharingStatus: record?.status ?? 'NOT_SHARED',
        externalJobId: record?.externalJobId ?? null,
        externalJobUrl: record?.externalJobUrl ?? null,
        errorMessage: record?.errorMessage ?? null,
        sharedAt: record?.sharedAt ?? null,
        updatedAt: record?.updatedAt ?? null,
        sharedBy: record?.sharedBy ?? null,
      };
    });

    return {
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        descriptionSummary:
          job.description.length > 280
            ? `${job.description.slice(0, 277)}...`
            : job.description,
        department: job.department,
        designation: job.designation,
        location: job.location,
        employmentType: job.employmentType,
        experienceLevel: job.experienceLevel,
        closingDate: job.closingDate,
        isPublished: job.isPublished,
        positionStatus: job.positionStatus,
        isActive: job.isActive,
        skills: job.skills.map((s) => s.skill.name),
      },
      platforms,
    };
  }

  async getHistory(jobId: string) {
    const job = await prisma.job.findFirst({ where: { id: jobId, deletedAt: null } });
    if (!job) throw new NotFoundError('Job');

    return prisma.jobShareHistory.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async shareJob(jobId: string, platformCode: JobSharePlatformCode, userId: string) {
    const adapter = getPlatformAdapter(platformCode);
    const platform = platformCode as JobSharePlatform;

    const job = await prisma.job.findFirst({
      where: { id: jobId, deletedAt: null },
      include: jobDetailInclude,
    });
    if (!job) throw new NotFoundError('Job');

    let share = await prisma.jobShare.findUnique({
      where: { jobId_platform: { jobId, platform } },
    });

    if (share?.status === 'POSTED') {
      throw new ConflictError(
        `This job is already posted on ${adapter.displayName}. Duplicate posting is not allowed.`
      );
    }

    // Ensure a share row exists for tracking
    if (!share) {
      share = await prisma.jobShare.create({
        data: {
          jobId,
          platform,
          status: 'NOT_SHARED',
        },
      });
    }

    if (!adapter.isConfigured()) {
      const message = `${adapter.displayName} integration is not configured yet.`;
      const updated = await this.recordAttempt({
        shareId: share.id,
        jobId,
        platform,
        status: 'FAILED',
        action: 'SHARE_ATTEMPT',
        errorMessage: message,
        userId,
      });

      return {
        posted: false,
        configured: false,
        message,
        share: updated,
      };
    }

    // Mark pending while calling adapter
    await prisma.jobShare.update({
      where: { id: share.id },
      data: { status: 'PENDING', errorMessage: null },
    });

    const payload = mapJobToExternalPayload(job);
    const result = await adapter.postJob(payload);

    if (!result.success) {
      const message =
        result.errorMessage ||
        this.mapErrorCodeToMessage(result.errorCode, adapter.displayName);

      const updated = await this.recordAttempt({
        shareId: share.id,
        jobId,
        platform,
        status: 'FAILED',
        action: 'SHARE_FAILED',
        errorMessage: message,
        userId,
      });

      // Never claim success without a real API confirmation
      throw new AppError(message, 400, result.errorCode || 'POSTING_FAILED');
    }

    const updated = await this.recordAttempt({
      shareId: share.id,
      jobId,
      platform,
      status: 'POSTED',
      action: 'SHARE_POSTED',
      externalJobId: result.externalJobId,
      externalJobUrl: result.externalJobUrl,
      userId,
      sharedAt: new Date(),
    });

    return {
      posted: true,
      configured: true,
      message: `Job successfully posted to ${adapter.displayName}.`,
      share: updated,
    };
  }

  private mapErrorCodeToMessage(code: string | undefined, platformName: string): string {
    switch (code) {
      case 'NOT_CONFIGURED':
        return `${platformName} integration is not configured yet.`;
      case 'CONNECTION_FAILED':
        return `Could not connect to ${platformName}. Please try again later.`;
      case 'AUTHENTICATION_FAILED':
        return `${platformName} authentication failed. Please contact an administrator.`;
      case 'INVALID_JOB_DATA':
        return 'Job data is incomplete or invalid for external posting.';
      case 'RATE_LIMIT':
        return `${platformName} rate limit reached. Please try again later.`;
      case 'ALREADY_POSTED':
        return `This job is already posted on ${platformName}.`;
      case 'API_ERROR':
      case 'POSTING_FAILED':
      default:
        return `Failed to post job to ${platformName}.`;
    }
  }

  private async recordAttempt(input: {
    shareId: string;
    jobId: string;
    platform: JobSharePlatform;
    status: JobShareStatus;
    action: string;
    errorMessage?: string | null;
    externalJobId?: string;
    externalJobUrl?: string;
    userId: string;
    sharedAt?: Date;
  }) {
    const [updated] = await prisma.$transaction([
      prisma.jobShare.update({
        where: { id: input.shareId },
        data: {
          status: input.status,
          errorMessage: input.errorMessage ?? null,
          externalJobId: input.externalJobId ?? undefined,
          externalJobUrl: input.externalJobUrl ?? undefined,
          sharedById: input.userId,
          sharedAt: input.sharedAt ?? undefined,
        },
        include: jobShareInclude,
      }),
      prisma.jobShareHistory.create({
        data: {
          jobShareId: input.shareId,
          jobId: input.jobId,
          platform: input.platform,
          status: input.status,
          action: input.action,
          externalJobId: input.externalJobId,
          externalJobUrl: input.externalJobUrl,
          errorMessage: input.errorMessage ?? undefined,
          actedById: input.userId,
        },
      }),
    ]);

    return updated;
  }
}

export default new JobSharingService();
