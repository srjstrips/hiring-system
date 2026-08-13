import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../types';
import { ApiResponse, buildPagination } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';
import { getUserScope, applyInterviewScope } from '../../utils/scope';
import type { CreateInterviewDto, UpdateInterviewDto } from './interviews.validator';

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
    const body = req.body as CreateInterviewDto;
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
    } = body;

    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundError('Application');

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
        meetingLink: meetingLink || null,
        notes: notes || null,
        scheduledById: req.user!.id,
        interviewersList: {
          create: interviewerIds.map((userId) => ({ userId })),
        },
      },
      include: interviewInclude,
    });

    const nextStatus = ROUND_TO_STATUS[interview.round];
    if (updateApplicationStatus && nextStatus && app.status !== nextStatus) {
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
    }

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
