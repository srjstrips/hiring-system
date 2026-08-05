import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../types';
import { ApiResponse, buildPagination } from '../../utils/response';
import {
  getUserScope,
  applyJobScope,
  applyApplicationScope,
  applyInterviewScope,
  applyOfferScope,
  applyRequisitionScope,
} from '../../utils/scope';

async function getScope(req: AuthRequest) {
  return getUserScope(req.user!.id, req.user!.roleName);
}

export async function getSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getScope(req);
    const jobWhere = applyJobScope({ deletedAt: null, positionStatus: 'OPEN' }, scope);
    const appWhere = applyApplicationScope({}, scope);
    const interviewWhere = applyInterviewScope({ status: 'SCHEDULED', scheduledAt: { gte: new Date() } }, scope);
    const offerWhere = applyOfferScope({ status: 'SENT' }, scope);
    const reqWhere = applyRequisitionScope({ deletedAt: null, approvalStatus: 'PENDING' }, scope);

    const joinedApps = await prisma.application.findMany({
      where: applyApplicationScope({ status: 'JOINED' }, scope),
      select: { appliedAt: true, updatedAt: true },
      take: 200,
    });

    let avgTimeToHireDays = 0;
    if (joinedApps.length) {
      const total = joinedApps.reduce((sum, a) => {
        const days = Math.max(0, (a.updatedAt.getTime() - a.appliedAt.getTime()) / 86400000);
        return sum + days;
      }, 0);
      avgTimeToHireDays = Math.round(total / joinedApps.length);
    }

    const [openPositions, totalApplications, interviewsScheduled, offersSent, pendingRequisitions] =
      await Promise.all([
        prisma.job.count({ where: jobWhere }),
        prisma.application.count({ where: appWhere }),
        prisma.interview.count({ where: interviewWhere }),
        prisma.offer.count({ where: offerWhere }),
        prisma.manpowerRequisition.count({ where: reqWhere }),
      ]);

    return ApiResponse.success(res, {
      openPositions,
      totalApplications,
      interviewsScheduled,
      offersSent,
      pendingRequisitions,
      avgTimeToHireDays,
      openPositionsTrend: 'View details',
      applicationsTrend: 'View analytics',
      interviewsTrend: 'View interviews',
      offersTrend: 'View offers',
      requisitionsTrend: 'View requisitions',
      timeToHireTrend: 'View analytics',
    });
  } catch (err) {
    next(err);
  }
}

export async function getPipeline(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getScope(req);
    const where = applyApplicationScope({}, scope);
    const grouped = await prisma.application.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const data = grouped
      .map((g) => ({ status: g.status, count: g._count._all }))
      .sort((a, b) => b.count - a.count);

    return ApiResponse.success(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getUpcomingInterviews(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = await getScope(req);
    const where = applyInterviewScope(
      { status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
      scope
    );

    const data = await prisma.interview.findMany({
      where,
      take: 8,
      orderBy: { scheduledAt: 'asc' },
      include: {
        interviewType: { select: { id: true, name: true } },
        application: {
          include: {
            candidate: { select: { id: true, firstName: true, lastName: true } },
            job: { select: { id: true, title: true } },
          },
        },
      },
    });

    return ApiResponse.success(res, data);
  } catch (err) {
    next(err);
  }
}

// keep unused import quiet
void buildPagination;
