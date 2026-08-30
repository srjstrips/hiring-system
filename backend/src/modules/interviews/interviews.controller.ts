import { randomBytes } from 'crypto';
import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AuthRequest } from '../../types';
import { ApiResponse, buildPagination } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';
import { getUserScope, applyInterviewScope } from '../../utils/scope';
import { emailService } from '../../services/email.service';
import candidateNotificationsService from '../candidate-notifications/candidate-notifications.service';
import type { CreateInterviewDto, UpdateInterviewDto } from './interviews.validator';
import { isValidForwardTransition } from '../applications/stage-order';

function buildInterviewCallUrl(token: string) {
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/interview/call/${token}`;
}

const ROUND_TO_STATUS: Record<number, 'INTERVIEW_ROUND_1' | 'INTERVIEW_ROUND_2' | 'HR_ROUND'> = {
  1: 'INTERVIEW_ROUND_1',
  2: 'INTERVIEW_ROUND_2',
  3: 'HR_ROUND',
};

const interviewInclude = {
  interviewType: { select: { id: true, name: true } },
  scheduledBy: { select: { id: true, firstName: true, lastName: true } },
  interviewersList: {
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  },
  application: {
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
      job: {
        select: {
          id: true,
          title: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  },
};

function paramId(req: AuthRequest): string {
  return String(req.params.id);
}

function parseQuery(req: AuthRequest) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    search: req.query.search ? String(req.query.search) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
    interviewTypeId: req.query.interviewTypeId ? String(req.query.interviewTypeId) : undefined,
    round: req.query.round ? Number(req.query.round) : undefined,
    applicationId: req.query.applicationId ? String(req.query.applicationId) : undefined,
    dateFrom: req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined,
    dateTo: req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined,
  };
}

export async function getAll(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getUserScope(req.user!.id, req.user!.roleName);
    const q = parseQuery(req);

    let where: Prisma.InterviewWhereInput = {};
    if (q.status) where.status = q.status as any;
    if (q.interviewTypeId) where.interviewTypeId = q.interviewTypeId;
    if (q.round) where.round = q.round;
    if (q.applicationId) where.applicationId = q.applicationId;
    if (q.dateFrom || q.dateTo) {
      where.scheduledAt = {
        ...(q.dateFrom ? { gte: q.dateFrom } : {}),
        ...(q.dateTo ? { lte: q.dateTo } : {}),
      };
    }
    if (q.departmentId) {
      where.application = { job: { departmentId: q.departmentId } };
    }
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { application: { candidate: { firstName: { contains: q.search, mode: 'insensitive' } } } },
        { application: { candidate: { lastName: { contains: q.search, mode: 'insensitive' } } } },
        { application: { job: { title: { contains: q.search, mode: 'insensitive' } } } },
      ];
    }

    where = applyInterviewScope(where, scope);

    const [data, total] = await Promise.all([
      prisma.interview.findMany({
        where,
        skip: q.skip,
        take: q.limit,
        orderBy: { scheduledAt: 'desc' },
        include: interviewInclude,
      }),
      prisma.interview.count({ where }),
    ]);

    return ApiResponse.paginated(res, data, buildPagination(total, q.page, q.limit));
  } catch (err) {
    next(err);
  }
}

export async function getSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getUserScope(req.user!.id, req.user!.roleName);
    let where: Prisma.InterviewWhereInput = {};
    if (req.query.departmentId) {
      where.application = { job: { departmentId: String(req.query.departmentId) } };
    }
    if (req.query.dateFrom || req.query.dateTo) {
      where.scheduledAt = {
        ...(req.query.dateFrom ? { gte: new Date(String(req.query.dateFrom)) } : {}),
        ...(req.query.dateTo ? { lte: new Date(String(req.query.dateTo)) } : {}),
      };
    }
    where = applyInterviewScope(where, scope);

    const grouped = await prisma.interview.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const summary: Record<string, number> = {};
    for (const g of grouped) summary[g.status] = g._count._all;
    return ApiResponse.success(res, summary);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const interview = await prisma.interview.findUnique({
      where: { id: paramId(req) },
      include: { ...interviewInclude, feedback: true },
    });
    if (!interview) throw new NotFoundError('Interview');
    return ApiResponse.success(res, interview);
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const dto = req.body as CreateInterviewDto;
    const {
      applicationId,
      interviewTypeId,
      round = 1,
      title,
      scheduledAt,
      durationMinutes = 60,
      mode = 'VIDEO',
      location,
      meetingLink,
      notes,
      interviewerIds = [],
      updateApplicationStatus = true,
      hodEmail,
      hodName,
    } = dto;

    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: { select: { firstName: true, lastName: true, email: true } },
        job: { select: { title: true } },
        timeline: { orderBy: { createdAt: 'asc' }, select: { toStatus: true } },
      },
    });
    if (!app) throw new NotFoundError('Application');

    const meetingToken = mode === 'VIDEO' ? randomBytes(24).toString('base64url') : null;
    const callUrl = meetingToken ? buildInterviewCallUrl(meetingToken) : null;

    const interview = await prisma.interview.create({
      data: {
        applicationId,
        interviewTypeId: interviewTypeId || null,
        round: Number(round) || 1,
        title,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: Number(durationMinutes) || 60,
        mode,
        location: location || null,
        meetingLink: mode === 'VIDEO' ? callUrl : (meetingLink || null),
        meetingToken,
        hodEmail: hodEmail || null,
        hodName: hodName || null,
        notes: notes || null,
        scheduledById: req.user!.id,
        interviewersList: {
          create: interviewerIds.map((userId) => ({ userId })),
        },
      },
      include: interviewInclude,
    });

    if (app.candidate.email) {
      await emailService.sendInterviewInviteEmail({
        email: app.candidate.email,
        candidateName: `${app.candidate.firstName} ${app.candidate.lastName}`.trim(),
        jobTitle: app.job.title,
        round: Number(round) || 1,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: Number(durationMinutes) || 60,
        interviewUrl: mode === 'VIDEO' ? (callUrl ?? '') : '',
        mode,
        location: location || null,
      });
    }

    // Send HOD join link — no login required, they just click and join
    if (hodEmail && callUrl) {
      const scheduledDate = new Date(scheduledAt);
      const displayName = hodName || 'HOD';
      const companyName = process.env['COMPANY_NAME'] ?? 'SRJ Group';
      const dateStr = scheduledDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
      void emailService.send({
        to: hodEmail,
        subject: `Interview Invitation: ${app.candidate.firstName} ${app.candidate.lastName} — ${app.job.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;color:#111827;">
            <h2 style="margin:0 0 8px;font-size:20px;">Dear ${displayName},</h2>
            <p style="margin:0 0 16px;color:#4b5563;">
              You have been invited to conduct an interview for the <strong>${app.job.title}</strong> position at <strong>${companyName}</strong>.
            </p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Candidate</td><td style="padding:8px 0;font-weight:600;">${app.candidate.firstName} ${app.candidate.lastName}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Position</td><td style="padding:8px 0;">${app.job.title}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Date &amp; Time</td><td style="padding:8px 0;">${dateStr} IST</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Duration</td><td style="padding:8px 0;">${durationMinutes} minutes</td></tr>
            </table>
            <div style="text-align:center;margin:32px 0;">
              <a href="${callUrl}" style="background:#d97706;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;">
                Join Interview
              </a>
            </div>
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
              Click the button above at the scheduled time to join directly — no login required.
              If the button doesn't work, copy this link: <a href="${callUrl}" style="color:#d97706;">${callUrl}</a>
            </p>
            <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">${companyName} HR Team</p>
          </div>
        `,
        text: `Dear ${displayName}, you are invited to interview ${app.candidate.firstName} ${app.candidate.lastName} for ${app.job.title} on ${dateStr} IST. Join here: ${callUrl}`,
      });
    }

    const nextStatus = ROUND_TO_STATUS[interview.round];
    const canAdvance = nextStatus && app.status !== nextStatus &&
      await isValidForwardTransition(app.status, nextStatus, app.timeline);
    if (updateApplicationStatus && canAdvance) {
      await prisma.$transaction([
        prisma.application.update({
          where: { id: applicationId },
          data: { status: nextStatus },
        }),
        prisma.applicationTimeline.create({
          data: {
            applicationId,
            fromStatus: app.status,
            toStatus: nextStatus,
            notes:
              notes
              || `Scheduled ${mode === 'VIDEO' ? 'video call' : 'in-person'} interview`,
            createdById: req.user!.id,
          },
        }),
      ]);

      // Also send stage-mapped template if HR configured one for this interview stage.
      const actor = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { firstName: true, lastName: true },
      });
      const hrName = actor ? `${actor.firstName} ${actor.lastName}`.trim() : 'HR Team';
      const emailTemplatesService = (await import('../email-templates/email-templates.service')).default;
      void emailTemplatesService.sendForStageChange(applicationId, nextStatus, hrName);
    }

    void candidateNotificationsService.notifyInterviewScheduled(app.candidateId, app.job.title, new Date(scheduledAt));

    return ApiResponse.created(res, interview);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = paramId(req);
    const existing = await prisma.interview.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Interview');

    const body = req.body as UpdateInterviewDto;
    const { interviewerIds, scheduledAt, interviewTypeId, location, meetingLink, notes, ...rest } = body;

    const interview = await prisma.$transaction(async (tx) => {
      if (Array.isArray(interviewerIds)) {
        await tx.interviewInterviewer.deleteMany({ where: { interviewId: id } });
        await tx.interviewInterviewer.createMany({
          data: interviewerIds.map((userId: string) => ({ interviewId: id, userId })),
        });
      }
      return tx.interview.update({
        where: { id },
        data: {
          ...rest,
          ...(interviewTypeId !== undefined ? { interviewTypeId } : {}),
          ...(location !== undefined ? { location } : {}),
          ...(meetingLink !== undefined ? { meetingLink } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        },
        include: interviewInclude,
      });
    });

    return ApiResponse.success(res, interview, 'Interview updated');
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = paramId(req);
    const existing = await prisma.interview.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Interview');

    const body = req.body as { status: string; notes?: string };
    const interview = await prisma.interview.update({
      where: { id },
      data: {
        status: body.status as any,
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: interviewInclude,
    });

    // Add an activity timeline entry for completion/cancellation so HR can see the interview lifecycle.
    if (body.status === 'COMPLETED' || body.status === 'CANCELLED' || body.status === 'NO_SHOW') {
      const app = await prisma.application.findUnique({
        where: { id: interview.applicationId },
        select: { status: true },
      });

      if (app) {
        await prisma.applicationTimeline.create({
          data: {
            applicationId: interview.applicationId,
            fromStatus: app.status,
            toStatus: app.status,
            notes:
              body.status === 'COMPLETED'
                ? `Interview completed — ${interview.title}`
                : body.status === 'CANCELLED'
                  ? `Interview cancelled — ${interview.title}`
                  : `Interview marked as no-show — ${interview.title}`,
            createdById: req.user!.id,
          },
        });
      }
    }

    return ApiResponse.success(res, interview, 'Status updated');
  } catch (err) {
    next(err);
  }
}

export async function addFeedback(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = paramId(req);
    const existing = await prisma.interview.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Interview');

    const body = req.body as Record<string, any>;
    const feedback = await prisma.interviewFeedback.upsert({
      where: {
        interviewId_interviewerId: {
          interviewId: id,
          interviewerId: req.user!.id,
        },
      },
      create: {
        interviewId: id,
        interviewerId: req.user!.id,
        ...body,
      },
      update: body,
    });

    return ApiResponse.success(res, feedback, 'Feedback saved');
  } catch (err) {
    next(err);
  }
}
